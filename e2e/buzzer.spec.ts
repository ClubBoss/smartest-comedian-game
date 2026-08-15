import { expect, test, type APIRequestContext } from "@playwright/test";

const SOUNDS = ["duck", "airhorn", "bell", "gong", "siren", "bike", "kazoo", "whistle", "horn", "buzzer"];

type Joined = { playerId: string; reconnectToken: string; seatOrder: number };

async function createRoom(request: APIRequestContext, capacity: number) {
  const response = await request.post("/api/rooms", { data: { capacity } });
  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<{ code: string; hostToken: string }>;
}

async function join(request: APIRequestContext, code: string, index: number): Promise<Joined> {
  const response = await request.post(`/api/rooms/${code}/join`, {
    data: { displayName: `Buzzer ${index + 1}`, soundKey: SOUNDS[index] },
  });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function openBuzz(request: APIRequestContext, code: string, hostToken: string) {
  const response = await request.post(`/api/rooms/${code}/buzz/open`, {
    headers: { "x-host-token": hostToken },
  });
  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<{ cycleId: string }>;
}

async function claim(request: APIRequestContext, code: string, player: Joined, cycleId: string) {
  return request.post(`/api/rooms/${code}/buzz/claim`, {
    headers: { "x-player-token": player.reconnectToken },
    data: { playerId: player.playerId, cycleId },
  });
}

test("10 simultaneous buzzes produce exactly one winner and next cycle resets eligibility", async ({ request }) => {
  const room = await createRoom(request, 10);
  const players: Joined[] = [];
  for (let index = 0; index < 10; index += 1) players.push(await join(request, room.code, index));

  const first = await openBuzz(request, room.code, room.hostToken);
  const responses = await Promise.all(players.map((player) => claim(request, room.code, player, first.cycleId)));
  const payloads = await Promise.all(responses.map(async (response) => ({ status: response.status(), body: await response.json() })));
  const accepted = payloads.filter((payload) => payload.status === 200 && payload.body.accepted === true);
  expect(accepted).toHaveLength(1);

  const state = await (await request.get(`/api/rooms/${room.code}`)).json();
  expect(state.buzz.status).toBe("locked");
  expect(state.buzz.winnerId).toBe(accepted[0].body.winnerId);

  const winnerIndex = players.findIndex((player) => player.playerId === state.buzz.winnerId);
  expect(winnerIndex).toBeGreaterThanOrEqual(0);
  const second = await openBuzz(request, room.code, room.hostToken);
  const repeat = await claim(request, room.code, players[winnerIndex], second.cycleId);
  expect(repeat.ok()).toBeTruthy();
  expect((await repeat.json()).accepted).toBe(true);
});

test("host endpoints require host authority and override is auditable", async ({ request }) => {
  const room = await createRoom(request, 2);
  const one = await join(request, room.code, 0);
  await join(request, room.code, 1);

  const unauthorized = await request.post(`/api/rooms/${room.code}/buzz/open`);
  expect(unauthorized.status()).toBe(401);

  await openBuzz(request, room.code, room.hostToken);
  const override = await request.post(`/api/rooms/${room.code}/buzz/override`, {
    headers: { "x-host-token": room.hostToken },
    data: { playerId: one.playerId },
  });
  expect(override.ok()).toBeTruthy();

  const state = await (await request.get(`/api/rooms/${room.code}`)).json();
  expect(state.buzz.winnerId).toBe(one.playerId);
  expect(state.buzz.winnerSource).toBe("host");
});

test("display receives buzzer-open state through realtime before polling fallback", async ({ request, page }) => {
  const room = await createRoom(request, 2);
  await join(request, room.code, 0);
  await join(request, room.code, 1);
  await page.goto(`/display/${room.code}`);
  await expect(page.getByText("WAITING", { exact: true })).toBeVisible();
  await page.waitForTimeout(600);

  await openBuzz(request, room.code, room.hostToken);
  await expect(page.getByText("BUZZERS OPEN", { exact: true })).toBeVisible({ timeout: 3000 });
});

test("custom buzzer winner exposes only a short-lived signed playback URL", async ({ request }) => {
  const room = await createRoom(request, 2);
  const custom = await join(request, room.code, 0);
  await join(request, room.code, 1);

  const upload = await request.post(`/api/rooms/${room.code}/players/${custom.playerId}/sound`, {
    headers: { "x-player-token": custom.reconnectToken },
    multipart: {
      sound: {
        name: "short.mp3",
        mimeType: "audio/mpeg",
        buffer: Buffer.from([0x49, 0x44, 0x33, 0x03, 0x00, 0x00, 0x00, 0x00]),
      },
    },
  });
  expect(upload.ok()).toBeTruthy();

  const cycle = await openBuzz(request, room.code, room.hostToken);
  const response = await claim(request, room.code, custom, cycle.cycleId);
  expect(response.ok()).toBeTruthy();
  const state = await (await request.get(`/api/rooms/${room.code}`)).json();
  expect(state.buzz.winnerSoundType).toBe("custom");
  expect(state.buzz.winnerSoundUrl).toContain("/storage/v1/object/sign/buzzer-sounds/");
  expect(JSON.stringify(state)).not.toContain("custom_sound_path");
});
