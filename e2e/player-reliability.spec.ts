import { expect, test, type APIRequestContext } from "@playwright/test";

type Room = { code: string; hostToken: string };
type Player = {
  playerId: string;
  reconnectToken: string;
  displayName: string;
  seatOrder: number;
  soundType: "builtin" | "custom";
  soundKey: string | null;
};

async function createRoom(request: APIRequestContext): Promise<Room> {
  const response = await request.post("/api/rooms", { data: { capacity: 4 } });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function join(request: APIRequestContext, room: Room): Promise<Player> {
  const response = await request.post(`/api/rooms/${room.code}/join`, {
    data: { displayName: "Reliability Guest", soundKey: "duck" },
  });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

test("player readiness persists and sound check reaches shared display", async ({ request, browser }) => {
  const room = await createRoom(request);
  const player = await join(request, room);

  const before = await request.get(`/api/rooms/${room.code}`);
  expect(before.ok()).toBeTruthy();
  const beforeState = await before.json();
  expect(beforeState.players[0].isReady).toBe(false);

  const ready = await request.post(`/api/rooms/${room.code}/players/${player.playerId}/ready`, {
    headers: { "x-player-token": player.reconnectToken },
    data: { ready: true },
  });
  expect(ready.ok()).toBeTruthy();

  const after = await request.get(`/api/rooms/${room.code}`);
  const afterState = await after.json();
  expect(afterState.players[0].isReady).toBe(true);

  const context = await browser.newContext();
  const display = await context.newPage();
  await display.goto(`/display/${room.code}`);
  await expect(display.getByText("Reliability Guest")).toBeVisible();
  await expect(display.getByText("Display connected")).toBeVisible({ timeout: 10_000 });
  const enableSound = display.getByRole("button", { name: "Enable sound" });
  if (await enableSound.isVisible()) await enableSound.click();

  const controller = await context.newPage();
  await controller.addInitScript(({ key, identity }) => {
    localStorage.setItem(key, JSON.stringify(identity));
  }, { key: `smartest-player-${room.code}`, identity: player });
  await controller.goto(`/play/${room.code}`);
  await expect(controller.getByRole("heading", { name: "Reliability Guest" })).toBeVisible();
  await expect(controller.getByRole("button", { name: "✓ Ready" })).toBeVisible();
  await expect(controller.getByText("Connected", { exact: true })).toBeVisible({ timeout: 10_000 });

  await controller.getByRole("button", { name: "Test sound on TV" }).click();
  const soundCheck = display.locator("section").filter({ hasText: "SOUND CHECK" });
  await expect(soundCheck).toBeVisible({ timeout: 10_000 });
  await expect(soundCheck.getByText("Reliability Guest", { exact: true })).toBeVisible();

  await controller.getByRole("button", { name: "✓ Ready" }).click();
  await expect(controller.getByRole("button", { name: "I'm ready" })).toBeVisible();

  const final = await request.get(`/api/rooms/${room.code}`);
  const finalState = await final.json();
  expect(finalState.players[0].isReady).toBe(false);

  await context.close();
});
