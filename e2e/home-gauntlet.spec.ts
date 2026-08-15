import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const ADMIN_KEY = "e2e-question-bank-owner-key";
const SOUNDS = ["duck", "airhorn", "bell", "gong", "siren", "bike", "kazoo", "whistle"];
const ONE_PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nGQAAAAASUVORK5CYII=",
  "base64",
);

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
  const response = await request.post("/api/rooms", { data: { capacity: 8 } });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function join(request: APIRequestContext, room: Room, index: number): Promise<Player> {
  const response = await request.post(`/api/rooms/${room.code}/join`, {
    data: { displayName: `Guest ${index + 1}`, soundKey: SOUNDS[index] },
  });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function saveQuestion(
  request: APIRequestContext,
  payload: object,
  files: Record<string, { name: string; mimeType: string; buffer: Buffer }> = {},
) {
  const response = await request.post("/api/questions", {
    headers: { "x-question-bank-key": ADMIN_KEY },
    multipart: { payload: JSON.stringify(payload), ...files },
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

async function roomState(request: APIRequestContext, room: Room) {
  const response = await request.get(`/api/rooms/${room.code}`);
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

async function winBuzz(request: APIRequestContext, room: Room, player: Player, cycleId: string) {
  const response = await request.post(`/api/rooms/${room.code}/buzz/claim`, {
    headers: { "x-player-token": player.reconnectToken },
    data: { playerId: player.playerId, cycleId },
  });
  expect(response.ok()).toBeTruthy();
  expect((await response.json()).accepted).toBe(true);
}

async function scoreAnswer(
  request: APIRequestContext,
  room: Room,
  player: Player,
  cycleId: string,
  delta: -1 | 0 | 1,
) {
  const response = await request.post(`/api/rooms/${room.code}/score/answer`, {
    headers: { "x-host-token": room.hostToken },
    data: { playerId: player.playerId, cycleId, delta },
  });
  expect(response.ok()).toBeTruthy();
}

async function expectScore(request: APIRequestContext, room: Room, player: Player, score: number) {
  const state = await roomState(request, room);
  expect(state.players.find((item: { id: string }) => item.id === player.playerId).score).toBe(score);
}

async function armDisplay(page: Page, room: Room) {
  await page.goto(`/display/${room.code}`);
  const enable = page.getByRole("button", { name: "Enable sound" });
  if (await enable.isVisible()) await enable.click();
}

test("canonical 8-player evening completes without database intervention", async ({ request, page }) => {
  const room = await createRoom(request);
  const players: Player[] = [];
  for (let index = 0; index < 8; index += 1) players.push(await join(request, room, index));

  const textQuestion = await saveQuestion(request, {
    prompt: "Which animal has three hearts?",
    answer: "Octopus",
    answerVariants: ["An octopus"],
    explanation: "An octopus has three hearts.",
    hostNotes: "Let them guess before the hint.",
    status: "ready",
    hints: ["It lives in the sea", "It has eight arms"],
    tags: ["animals", "gauntlet"],
    assets: [],
  });
  const photoQuestion = await saveQuestion(
    request,
    {
      prompt: "What is shown in this photo?",
      answer: "A test pixel",
      explanation: "Photo-question plumbing is working.",
      status: "ready",
      hints: ["Look at the image"],
      tags: ["photo", "gauntlet"],
      assets: [{ kind: "new", uploadKey: "photo", altText: "Gauntlet photo", caption: "Photo round" }],
    },
    { photo: { name: "gauntlet.png", mimeType: "image/png", buffer: ONE_PIXEL_PNG } },
  );
  const specialQuestion = await saveQuestion(request, {
    prompt: "Special host-scored question",
    answer: "Host decides",
    status: "ready",
    hints: [],
    tags: ["special", "gauntlet"],
    assets: [],
  });

  for (const question of [textQuestion, photoQuestion, specialQuestion]) {
    await hostAction(request, room, "queue", { questionId: question.id });
  }

  // Question 1: reveal, hint, and let the same player answer twice in fresh cycles.
  await hostAction(request, room, "start-next");
  let state = await roomState(request, room);
  expect(state.question.stimulusRevealed).toBe(false);
  expect(state.question.prompt).toBeNull();
  await hostAction(request, room, "reveal-stimulus");
  await hostAction(request, room, "reveal-hint");

  await armDisplay(page, room);
  await expect(page.getByRole("heading", { name: "Which animal has three hearts?" })).toBeVisible();
  await expect(page.getByText("It lives in the sea", { exact: false })).toBeVisible();

  let cycle = await openBuzz(request, room);
  await winBuzz(request, room, players[0], cycle.cycleId);
  await scoreAnswer(request, room, players[0], cycle.cycleId, 1);
  cycle = await openBuzz(request, room);
  await winBuzz(request, room, players[0], cycle.cycleId);
  await scoreAnswer(request, room, players[0], cycle.cycleId, 0);
  await expectScore(request, room, players[0], 1);
  await hostAction(request, room, "reveal-answer");
  await hostAction(request, room, "finish");

  // Question 2: custom audio is intentionally invalid; winner state must still progress.
  const customUpload = await request.post(`/api/rooms/${room.code}/players/${players[3].playerId}/sound`, {
    headers: { "x-player-token": players[3].reconnectToken },
    multipart: {
      sound: {
        name: "broken-but-accepted.mp3",
        mimeType: "audio/mpeg",
        buffer: Buffer.from([0x49, 0x44, 0x33, 0x03, 0x00, 0x00, 0x00, 0x00]),
      },
    },
  });
  expect(customUpload.ok()).toBeTruthy();

  await hostAction(request, room, "start-next");
  await hostAction(request, room, "reveal-stimulus");
  state = await roomState(request, room);
  expect(state.question.assets).toHaveLength(1);
  expect(state.question.assets[0].url).toContain("/storage/v1/object/sign/question-images/");

  await page.route("**/storage/v1/object/sign/question-images/**", (route) => route.abort());
  await page.goto(`/display/${room.code}`);
  await expect(page.getByRole("heading", { name: "What is shown in this photo?" })).toBeVisible();
  cycle = await openBuzz(request, room);
  await expect(page.getByText("BUZZERS OPEN", { exact: true })).toBeVisible({ timeout: 3000 });
  await winBuzz(request, room, players[3], cycle.cycleId);
  await expect(page.getByText("Guest 4", { exact: true }).first()).toBeVisible({ timeout: 3000 });
  await scoreAnswer(request, room, players[3], cycle.cycleId, -1);
  await expectScore(request, room, players[3], -1);
  await hostAction(request, room, "reveal-answer");
  await hostAction(request, room, "finish");
  await page.unroute("**/storage/v1/object/sign/question-images/**");

  // Question 3: recover with a host winner override, then exercise special scoring + undo.
  await hostAction(request, room, "start-next");
  await hostAction(request, room, "reveal-stimulus");
  cycle = await openBuzz(request, room);
  const override = await request.post(`/api/rooms/${room.code}/buzz/override`, {
    headers: { "x-host-token": room.hostToken },
    data: { playerId: players[5].playerId },
  });
  expect(override.ok()).toBeTruthy();
  await scoreAnswer(request, room, players[5], cycle.cycleId, 1);

  let manual = await request.post(`/api/rooms/${room.code}/score/manual`, {
    headers: { "x-host-token": room.hostToken },
    data: { playerId: players[7].playerId, delta: 5, reason: "Temporary special score" },
  });
  expect(manual.ok()).toBeTruthy();
  await expectScore(request, room, players[7], 5);
  const undo = await request.post(`/api/rooms/${room.code}/score/undo`, {
    headers: { "x-host-token": room.hostToken },
  });
  expect(undo.ok()).toBeTruthy();
  await expectScore(request, room, players[7], 0);
  manual = await request.post(`/api/rooms/${room.code}/score/manual`, {
    headers: { "x-host-token": room.hostToken },
    data: { playerId: players[7].playerId, delta: 2, reason: "Final special score" },
  });
  expect(manual.ok()).toBeTruthy();
  await hostAction(request, room, "reveal-answer");
  await hostAction(request, room, "finish");

  // Final canonical totals.
  state = await roomState(request, room);
  const totals = Object.fromEntries(state.players.map((player: { displayName: string; score: number }) => [player.displayName, player.score]));
  expect(totals).toEqual({
    "Guest 1": 1,
    "Guest 2": 0,
    "Guest 3": 0,
    "Guest 4": -1,
    "Guest 5": 0,
    "Guest 6": 1,
    "Guest 7": 0,
    "Guest 8": 2,
  });
  expect(state.question).toBeNull();

  // Host authority survives a page reload on the same device.
  await page.addInitScript(({ code, hostToken }) => {
    localStorage.setItem("smartest-host-current-room", code);
    localStorage.setItem(`smartest-host-${code}`, hostToken);
  }, room);
  await page.goto("/host");
  await expect(page.getByRole("heading", { name: `Room ${room.code}` })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: `Room ${room.code}` })).toBeVisible();

  // A player reconnects after refresh without duplicating identity or losing score.
  await page.addInitScript(({ key, identity }) => {
    localStorage.setItem(key, JSON.stringify(identity));
  }, {
    key: `smartest-player-${room.code}`,
    identity: {
      playerId: players[0].playerId,
      reconnectToken: players[0].reconnectToken,
      displayName: players[0].displayName,
      seatOrder: players[0].seatOrder,
      soundType: players[0].soundType,
      soundKey: players[0].soundKey,
    },
  });
  await page.goto(`/play/${room.code}`);
  await expect(page.getByRole("heading", { name: "Guest 1" })).toBeVisible();
  await expect(page.locator(".player-score-badge strong")).toHaveText("1");
  await page.reload();
  await expect(page.locator(".player-score-badge strong")).toHaveText("1");
  state = await roomState(request, room);
  expect(state.playerCount).toBe(8);

  // TV can be refreshed at the end and still renders the complete final leaderboard.
  await page.goto(`/display/${room.code}`);
  await expect(page.locator(".display-player")).toHaveCount(8);
  await expect(page.getByLabel("Guest 1 score")).toHaveText("1");
  await expect(page.getByLabel("Guest 4 score")).toHaveText("-1");
  await expect(page.getByLabel("Guest 8 score")).toHaveText("2");
});
