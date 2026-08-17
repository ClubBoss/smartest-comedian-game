import { expect, test, type APIRequestContext } from "@playwright/test";

const ADMIN_KEY = "e2e-question-bank-owner-key";

type Room = { code: string; hostToken: string };
type Player = { playerId: string; reconnectToken: string; displayName: string; seatOrder: number; soundType: "builtin" | "custom"; soundKey: string | null };

async function createRoom(request: APIRequestContext): Promise<Room> {
  const response = await request.post("/api/rooms", { data: { capacity: 2 } });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function join(request: APIRequestContext, room: Room, name: string, soundKey: string): Promise<Player> {
  const response = await request.post(`/api/rooms/${room.code}/join`, { data: { displayName: name, soundKey } });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function ready(request: APIRequestContext, room: Room, player: Player) {
  const response = await request.post(`/api/rooms/${room.code}/players/${player.playerId}/ready`, {
    headers: { "x-player-token": player.reconnectToken },
    data: { ready: true },
  });
  expect(response.ok()).toBeTruthy();
}

async function question(request: APIRequestContext) {
  const response = await request.post("/api/questions", {
    headers: { "x-question-bank-key": ADMIN_KEY },
    multipart: {
      payload: JSON.stringify({
        prompt: "Host flow question",
        answer: "Host flow answer",
        explanation: "Host flow explanation",
        hostNotes: "Private host note",
        status: "ready",
        hints: ["Host flow hint"],
        tags: ["host-flow"],
        assets: [],
      }),
    },
  });
  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<{ id: string }>;
}

async function hostQuestionAction(request: APIRequestContext, room: Room, action: string, extra: object = {}) {
  const response = await request.post(`/api/rooms/${room.code}/questions/action`, {
    headers: { "x-host-token": room.hostToken },
    data: { action, ...extra },
  });
  expect(response.ok()).toBeTruthy();
}

test("host game mode guides, hotkeys, preflight and TV preview through a live answer", async ({ request, browser }) => {
  const room = await createRoom(request);
  const p1 = await join(request, room, "HostFlow One", "duck");
  const p2 = await join(request, room, "HostFlow Two", "bell");
  await ready(request, room, p1);
  await ready(request, room, p2);
  const q = await question(request);
  await hostQuestionAction(request, room, "start", { questionId: q.id });

  const context = await browser.newContext();
  const display = await context.newPage();
  await display.goto(`/display/${room.code}`);
  await expect(display.getByText("Display connected")).toBeVisible({ timeout: 10_000 });
  await display.getByRole("button", { name: "Enable sound" }).click();
  await expect(display.getByRole("button", { name: "Sound enabled" })).toBeVisible();

  const host = await context.newPage();
  await host.addInitScript(({ code, token }) => {
    localStorage.setItem("smartest-host-current-room", code);
    localStorage.setItem(`smartest-host-${code}`, token);
  }, { code: room.code, token: room.hostToken });
  await host.goto("/host");
  await expect(host.getByRole("heading", { name: `Room ${room.code}` })).toBeVisible();
  await expect(host.getByText("Realtime connected")).toBeVisible({ timeout: 10_000 });
  await expect(host.getByText("Ready to play")).toBeVisible({ timeout: 10_000 });
  await expect(host.getByText("2/2 ready")).toBeVisible();

  await host.getByRole("button", { name: "Enter Game Mode" }).click();
  await expect(host.getByText("Game Mode ON")).toBeVisible();
  await expect(host.getByText("Show the question on TV")).toBeVisible();
  await expect(host.getByLabel("TV preview").getByText("QUESTION READY · PRIVATE")).toBeVisible();

  await host.getByRole("button", { name: "Show question" }).click();
  await expect(display.getByRole("heading", { name: "Host flow question" })).toBeVisible({ timeout: 10_000 });
  await expect(host.getByLabel("TV preview").getByText("Host flow question")).toBeVisible();
  await expect(host.getByText("Open the buzzer")).toBeVisible();

  await host.keyboard.press("Space");
  await expect(host.getByRole("heading", { name: "Open", exact: true })).toBeVisible({ timeout: 10_000 });
  let roomResponse = await request.get(`/api/rooms/${room.code}`);
  let roomState = await roomResponse.json();
  expect(roomState.buzz.status).toBe("open");
  const firstCycle = roomState.buzz.cycleId;

  const claim = await request.post(`/api/rooms/${room.code}/buzz/claim`, {
    headers: { "x-player-token": p1.reconnectToken },
    data: { playerId: p1.playerId, cycleId: firstCycle },
  });
  expect(claim.ok()).toBeTruthy();
  await expect(host.getByText("Choose and confirm HostFlow One's score")).toBeVisible({ timeout: 10_000 });

  await host.keyboard.press("1");
  await expect(host.getByText("Pending: +1", { exact: true })).toBeVisible();
  roomResponse = await request.get(`/api/rooms/${room.code}`);
  roomState = await roomResponse.json();
  expect(roomState.players.find((player: { id: string }) => player.id === p1.playerId).score).toBe(0);

  await host.getByRole("button", { name: "Confirm +1", exact: true }).click();
  await expect(host.getByText("Recorded +1", { exact: true })).toBeVisible({ timeout: 10_000 });
  roomResponse = await request.get(`/api/rooms/${room.code}`);
  roomState = await roomResponse.json();
  expect(roomState.players.find((player: { id: string }) => player.id === p1.playerId).score).toBe(1);

  await host.keyboard.press("Space");
  await expect(host.getByRole("heading", { name: "Open", exact: true })).toBeVisible({ timeout: 10_000 });
  roomResponse = await request.get(`/api/rooms/${room.code}`);
  roomState = await roomResponse.json();
  expect(roomState.buzz.status).toBe("open");
  expect(roomState.buzz.cycleId).not.toBe(firstCycle);
  await expect(host.getByLabel("TV preview").getByText("HostFlow One 1")).toBeVisible();

  await context.close();
});
