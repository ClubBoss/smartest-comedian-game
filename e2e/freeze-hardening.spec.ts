import { expect, test, type APIRequestContext } from "@playwright/test";

const ADMIN_KEY = "e2e-question-bank-owner-key";

type Room = { code: string; hostToken: string };
type Player = { playerId: string; reconnectToken: string };

async function createRoom(request: APIRequestContext, capacity = 2): Promise<Room> {
  const response = await request.post("/api/rooms", { data: { capacity } });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function join(request: APIRequestContext, room: Room, displayName: string, soundKey: string): Promise<Player> {
  const response = await request.post(`/api/rooms/${room.code}/join`, {
    data: { displayName, soundKey },
  });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function saveQuestion(request: APIRequestContext, prompt: string) {
  const response = await request.post("/api/questions", {
    headers: { "x-question-bank-key": ADMIN_KEY },
    multipart: {
      payload: JSON.stringify({
        prompt,
        answer: "Freeze answer",
        status: "ready",
        hints: ["Freeze hint"],
        tags: ["freeze-hardening"],
        assets: [],
      }),
    },
  });
  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<{ id: string }>;
}

async function hostAction(request: APIRequestContext, room: Room, action: string, extra: object = {}) {
  const response = await request.post(`/api/rooms/${room.code}/questions/action`, {
    headers: { "x-host-token": room.hostToken },
    data: { action, ...extra },
  });
  expect(response.ok()).toBeTruthy();
  return response;
}

async function publicState(request: APIRequestContext, room: Room) {
  const response = await request.get(`/api/rooms/${room.code}`);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function privateState(request: APIRequestContext, room: Room) {
  const response = await request.get(`/api/rooms/${room.code}/questions`, {
    headers: { "x-host-token": room.hostToken },
  });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function openHost(page: import("@playwright/test").Page, room: Room) {
  await page.goto("/host");
  await page.evaluate(({ code, hostToken }) => {
    localStorage.setItem("smartest-host-current-room", code);
    localStorage.setItem(`smartest-host-${code}`, hostToken);
  }, room);
  await page.reload();
  await expect(page.getByRole("heading", { name: `Room ${room.code}` })).toBeVisible();
}

test.describe.configure({ mode: "serial" });

test("early Finish requires a second action while normal revealed-answer finish stays one-click", async ({ request, page }) => {
  const room = await createRoom(request);
  await join(request, room, "Freeze One", "duck");
  await join(request, room, "Freeze Two", "airhorn");

  const earlyQuestion = await saveQuestion(request, "Do not finish me by accident");
  await hostAction(request, room, "start", { questionId: earlyQuestion.id });
  await hostAction(request, room, "reveal-stimulus");
  await openHost(page, room);
  await expect(page.getByRole("heading", { name: "Do not finish me by accident" })).toBeVisible();

  await page.keyboard.press("n");
  await expect(page.getByRole("button", { name: "CONFIRM early finish" })).toBeVisible();
  expect((await privateState(request, room)).current).not.toBeNull();

  await page.getByRole("button", { name: "CONFIRM early finish" }).click();
  await expect.poll(async () => (await privateState(request, room)).current).toBeNull();

  const normalQuestion = await saveQuestion(request, "Normal finish after answer");
  await hostAction(request, room, "start", { questionId: normalQuestion.id });
  await hostAction(request, room, "reveal-stimulus");
  await hostAction(request, room, "reveal-answer");
  windowDispatchRefresh: {
    await page.evaluate(() => window.dispatchEvent(new Event("smartest-live-question-refresh")));
  }
  await expect(page.getByRole("heading", { name: "Normal finish after answer" })).toBeVisible();
  await page.getByRole("button", { name: "Finish question" }).click();
  await expect.poll(async () => (await privateState(request, room)).current).toBeNull();
});

test("Safety dock can override a winner, apply an emergency score and undo it without leaving live flow", async ({ request, page }) => {
  const room = await createRoom(request);
  const first = await join(request, room, "Recovery One", "duck");
  const second = await join(request, room, "Recovery Two", "airhorn");
  const question = await saveQuestion(request, "Recovery question");
  await hostAction(request, room, "start", { questionId: question.id });
  await hostAction(request, room, "reveal-stimulus");

  const open = await request.post(`/api/rooms/${room.code}/buzz/open`, {
    headers: { "x-host-token": room.hostToken },
  });
  expect(open.ok()).toBeTruthy();

  await openHost(page, room);
  const dock = page.locator('details[aria-label="Host safety and recovery"]');
  await expect(dock).toBeVisible();
  await dock.locator("summary").click();

  await dock.getByLabel("Recovery manual winner").selectOption(second.playerId);
  await dock.getByRole("button", { name: "Set winner" }).click();
  await expect.poll(async () => (await publicState(request, room)).buzz?.winnerId).toBe(second.playerId);

  await dock.getByLabel("Recovery score player").selectOption(first.playerId);
  await dock.getByLabel("Recovery score delta").fill("3");
  await dock.getByRole("button", { name: "Apply score" }).click();
  await expect.poll(async () => {
    const state = await publicState(request, room);
    return state.players.find((player: { id: string }) => player.id === first.playerId)?.score;
  }).toBe(3);

  await dock.getByRole("button", { name: "Undo latest" }).click();
  await expect.poll(async () => {
    const state = await publicState(request, room);
    return state.players.find((player: { id: string }) => player.id === first.playerId)?.score;
  }).toBe(0);
});

test("Host safety status turns stale on network loss and recovers after an explicit refresh", async ({ request, page }) => {
  const room = await createRoom(request);
  await join(request, room, "Network One", "duck");
  await join(request, room, "Network Two", "airhorn");
  await openHost(page, room);

  const dock = page.locator('details[aria-label="Host safety and recovery"]');
  await expect(dock.locator("summary")).toContainText("live", { timeout: 10_000 });

  await page.route(`**/api/rooms/${room.code}`, (route) => route.abort());
  await expect(dock.locator("summary")).toContainText("STALE", { timeout: 20_000 });
  await expect(page.getByRole("heading", { name: `Room ${room.code}` })).toBeVisible();

  await page.unroute(`**/api/rooms/${room.code}`);
  await dock.locator("summary").click();
  await dock.getByRole("button", { name: "Refresh state" }).click();
  await expect(dock.locator("summary")).toContainText("live", { timeout: 10_000 });
});

test("Host and TV request screen Wake Lock when the browser supports it", async ({ request, page }) => {
  const room = await createRoom(request);

  await page.addInitScript(() => {
    const trackedWindow = window as typeof window & { __wakeLockRequests?: number };
    Object.defineProperty(navigator, "wakeLock", {
      configurable: true,
      value: {
        request: async () => {
          trackedWindow.__wakeLockRequests = (trackedWindow.__wakeLockRequests ?? 0) + 1;
          return { release: async () => undefined };
        },
      },
    });
  });

  await page.goto("/host");
  await expect.poll(async () => page.evaluate(() => (window as typeof window & { __wakeLockRequests?: number }).__wakeLockRequests ?? 0)).toBeGreaterThan(0);
  const afterHost = await page.evaluate(() => (window as typeof window & { __wakeLockRequests?: number }).__wakeLockRequests ?? 0);

  await page.goto(`/display/${room.code}`);
  await expect.poll(async () => page.evaluate(() => (window as typeof window & { __wakeLockRequests?: number }).__wakeLockRequests ?? 0)).toBeGreaterThan(afterHost);
});
