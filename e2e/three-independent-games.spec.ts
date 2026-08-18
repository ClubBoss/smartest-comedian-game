import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

type Room = { code: string; hostToken: string };
type Joined = { playerId: string; reconnectToken: string; displayName: string };

async function createRoom(request: APIRequestContext): Promise<Room> {
  const response = await request.post("/api/rooms", { data: { capacity: 4 } });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function join(request: APIRequestContext, room: Room, displayName: string): Promise<Joined> {
  const response = await request.post(`/api/rooms/${room.code}/join`, {
    data: { displayName, soundKey: "duck" },
  });
  expect(response.ok()).toBeTruthy();
  const joined = await response.json();
  return { ...joined, displayName };
}

async function roomState(request: APIRequestContext, room: Room) {
  const response = await request.get(`/api/rooms/${room.code}`);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function manualScore(request: APIRequestContext, room: Room, playerId: string, delta: number) {
  const response = await request.post(`/api/rooms/${room.code}/score/manual`, {
    headers: { "x-host-token": room.hostToken },
    data: { playerId, delta, reason: "three-game isolation e2e" },
  });
  expect(response.ok()).toBeTruthy();
}

async function openHost(page: Page, room: Room) {
  await page.goto("/host");
  await page.evaluate(({ code, hostToken }) => {
    localStorage.setItem("smartest-host-current-room", code);
    localStorage.setItem(`smartest-host-${code}`, hostToken);
  }, room);
  await page.reload();
}

test("Qualifier A, Qualifier B and Final are ordinary fresh-score games", async ({ request, page }) => {
  const qualifierA = await createRoom(request);
  const qualifierB = await createRoom(request);
  const final = await createRoom(request);

  const playerA = await join(request, qualifierA, "Qualifier A player");
  const playerB = await join(request, qualifierB, "Qualifier B player");
  const finalist = await join(request, final, "Final player");

  let stateA = await roomState(request, qualifierA);
  let stateB = await roomState(request, qualifierB);
  let stateFinal = await roomState(request, final);

  expect(stateA.tournament).toBeNull();
  expect(stateB.tournament).toBeNull();
  expect(stateFinal.tournament).toBeNull();
  expect(stateA.players[0].score).toBe(0);
  expect(stateB.players[0].score).toBe(0);
  expect(stateFinal.players[0].score).toBe(0);

  await manualScore(request, qualifierA, playerA.playerId, 3);
  stateA = await roomState(request, qualifierA);
  stateB = await roomState(request, qualifierB);
  stateFinal = await roomState(request, final);

  expect(stateA.players[0].score).toBe(3);
  expect(stateB.players[0].score).toBe(0);
  expect(stateFinal.players[0].score).toBe(0);

  await manualScore(request, qualifierB, playerB.playerId, 1);
  await manualScore(request, final, finalist.playerId, 2);

  stateA = await roomState(request, qualifierA);
  stateB = await roomState(request, qualifierB);
  stateFinal = await roomState(request, final);

  expect(stateA.players[0].score).toBe(3);
  expect(stateB.players[0].score).toBe(1);
  expect(stateFinal.players[0].score).toBe(2);

  await openHost(page, qualifierA);
  await expect(page.getByLabel("Tournament Night setup")).toHaveCount(0);
  await expect(page.getByLabel("Tournament Night controller")).toHaveCount(0);
});
