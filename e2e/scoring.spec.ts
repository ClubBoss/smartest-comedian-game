import { expect, test, type APIRequestContext } from "@playwright/test";

const SOUNDS = ["duck", "airhorn", "bell", "gong", "siren", "bike", "kazoo", "whistle", "horn", "buzzer"];

type Room = { code: string; hostToken: string };
type Joined = { playerId: string; reconnectToken: string; seatOrder: number; displayName: string; soundType: "builtin" | "custom"; soundKey: string | null };

async function createRoom(request: APIRequestContext, capacity: number): Promise<Room> {
  const response = await request.post("/api/rooms", { data: { capacity } });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function join(request: APIRequestContext, code: string, index: number): Promise<Joined> {
  const response = await request.post(`/api/rooms/${code}/join`, {
    data: { displayName: `Score ${index + 1}`, soundKey: SOUNDS[index] },
  });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function openBuzz(request: APIRequestContext, room: Room) {
  const response = await request.post(`/api/rooms/${room.code}/buzz/open`, {
    headers: { "x-host-token": room.hostToken },
  });
  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<{ cycleId: string }>;
}

async function winBuzz(request: APIRequestContext, room: Room, player: Joined, cycleId: string) {
  const response = await request.post(`/api/rooms/${room.code}/buzz/claim`, {
    headers: { "x-player-token": player.reconnectToken },
    data: { playerId: player.playerId, cycleId },
  });
  expect(response.ok()).toBeTruthy();
  expect((await response.json()).accepted).toBe(true);
}

async function scoreAnswer(request: APIRequestContext, room: Room, player: Joined, cycleId: string, delta: -1 | 0 | 1) {
  return request.post(`/api/rooms/${room.code}/score/answer`, {
    headers: { "x-host-token": room.hostToken },
    data: { playerId: player.playerId, cycleId, delta },
  });
}

async function state(request: APIRequestContext, code: string) {
  const response = await request.get(`/api/rooms/${code}`);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

test.describe.configure({ mode: "serial" });

test("normal answer is traceable, single-active and supports +1", async ({ request }) => {
  const room = await createRoom(request, 2);
  const winner = await join(request, room.code, 0);
  await join(request, room.code, 1);
  const cycle = await openBuzz(request, room);
  await winBuzz(request, room, winner, cycle.cycleId);

  const scored = await scoreAnswer(request, room, winner, cycle.cycleId, 1);
  expect(scored.ok()).toBeTruthy();
  expect((await scored.json()).eventId).toBeTruthy();

  const after = await state(request, room.code);
  expect(after.players.find((player: { id: string }) => player.id === winner.playerId).score).toBe(1);
  expect(after.buzz.scoreResolved).toBe(true);
  expect(after.buzz.scoreDelta).toBe(1);

  const duplicate = await scoreAnswer(request, room, winner, cycle.cycleId, -1);
  expect(duplicate.status()).toBe(409);
});

test("zero is recorded, undo reopens correction, then -1 can replace it", async ({ request }) => {
  const room = await createRoom(request, 2);
  const winner = await join(request, room.code, 0);
  await join(request, room.code, 1);
  const cycle = await openBuzz(request, room);
  await winBuzz(request, room, winner, cycle.cycleId);

  const zero = await scoreAnswer(request, room, winner, cycle.cycleId, 0);
  expect(zero.ok()).toBeTruthy();
  let after = await state(request, room.code);
  expect(after.players.find((player: { id: string }) => player.id === winner.playerId).score).toBe(0);
  expect(after.buzz.scoreResolved).toBe(true);
  expect(after.buzz.scoreDelta).toBe(0);

  const undo = await request.post(`/api/rooms/${room.code}/score/undo`, {
    headers: { "x-host-token": room.hostToken },
  });
  expect(undo.ok()).toBeTruthy();
  after = await state(request, room.code);
  expect(after.buzz.scoreResolved).toBe(false);
  expect(after.players.find((player: { id: string }) => player.id === winner.playerId).score).toBe(0);

  const corrected = await scoreAnswer(request, room, winner, cycle.cycleId, -1);
  expect(corrected.ok()).toBeTruthy();
  after = await state(request, room.code);
  expect(after.players.find((player: { id: string }) => player.id === winner.playerId).score).toBe(-1);
  expect(after.buzz.scoreDelta).toBe(-1);
});

test("manual arbitrary score and undo are canonical", async ({ request }) => {
  const room = await createRoom(request, 2);
  await join(request, room.code, 0);
  const target = await join(request, room.code, 1);

  const manual = await request.post(`/api/rooms/${room.code}/score/manual`, {
    headers: { "x-host-token": room.hostToken },
    data: { playerId: target.playerId, delta: -7, reason: "Special question" },
  });
  expect(manual.ok()).toBeTruthy();

  let after = await state(request, room.code);
  expect(after.players.find((player: { id: string }) => player.id === target.playerId).score).toBe(-7);
  expect(after.canUndoScore).toBe(true);

  const undo = await request.post(`/api/rooms/${room.code}/score/undo`, {
    headers: { "x-host-token": room.hostToken },
  });
  expect(undo.ok()).toBeTruthy();
  after = await state(request, room.code);
  expect(after.players.find((player: { id: string }) => player.id === target.playerId).score).toBe(0);
  expect(after.canUndoScore).toBe(false);
});

test("10-player TV scoreboard remains complete and shows live score", async ({ request, page }) => {
  const room = await createRoom(request, 10);
  const players: Joined[] = [];
  for (let index = 0; index < 10; index += 1) players.push(await join(request, room.code, index));

  const manual = await request.post(`/api/rooms/${room.code}/score/manual`, {
    headers: { "x-host-token": room.hostToken },
    data: { playerId: players[9].playerId, delta: 12, reason: "TV score check" },
  });
  expect(manual.ok()).toBeTruthy();

  await page.goto(`/display/${room.code}`);
  await expect(page.locator(".display-player")).toHaveCount(10);
  await expect(page.getByText("Score 10", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Score 10 score")).toHaveText("12");
});

test("player controller receives canonical score updates through room state", async ({ request, page }) => {
  const room = await createRoom(request, 2);
  const player = await join(request, room.code, 0);
  await join(request, room.code, 1);

  await page.addInitScript(({ key, value }) => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, {
    key: `smartest-player-${room.code}`,
    value: {
      playerId: player.playerId,
      reconnectToken: player.reconnectToken,
      displayName: "Score 1",
      seatOrder: 1,
      soundType: "builtin",
      soundKey: "duck",
    },
  });
  await page.goto(`/play/${room.code}`);
  await expect(page.getByText("Score 1", { exact: true })).toBeVisible();
  await expect(page.locator(".player-score-badge strong")).toHaveText("0");

  const manual = await request.post(`/api/rooms/${room.code}/score/manual`, {
    headers: { "x-host-token": room.hostToken },
    data: { playerId: player.playerId, delta: 4, reason: "Realtime player check" },
  });
  expect(manual.ok()).toBeTruthy();
  await expect(page.locator(".player-score-badge strong")).toHaveText("4", { timeout: 3000 });
});
