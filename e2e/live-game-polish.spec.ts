import { expect, test, type APIRequestContext } from "@playwright/test";

const ADMIN_KEY = "e2e-question-bank-owner-key";
const SOUNDS = ["duck", "airhorn", "bell", "gong"];

type Room = { code: string; hostToken: string };
type Player = { playerId: string; reconnectToken: string };

async function createRoom(request: APIRequestContext, capacity = 4): Promise<Room> {
  const response = await request.post("/api/rooms", { data: { capacity } });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function join(request: APIRequestContext, room: Room, index: number): Promise<Player> {
  const response = await request.post(`/api/rooms/${room.code}/join`, {
    data: { displayName: ["Elmar", "Aliya", "Jamula", "Kamran"][index] ?? `Player ${index + 1}`, soundKey: SOUNDS[index] },
  });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function saveQuestion(request: APIRequestContext, prompt: string, extra: object = {}) {
  const response = await request.post("/api/questions", {
    headers: { "x-question-bank-key": ADMIN_KEY },
    multipart: {
      payload: JSON.stringify({
        prompt,
        answer: "Да",
        status: "ready",
        hints: [],
        tags: ["live-polish"],
        assets: [],
        ...extra,
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

async function privateState(request: APIRequestContext, room: Room) {
  const response = await request.get(`/api/rooms/${room.code}/questions`, {
    headers: { "x-host-token": room.hostToken },
  });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

test.describe.configure({ mode: "serial" });

test("iPhone Voice Memos M4A MIME uploads as a custom buzzer", async ({ request }) => {
  const room = await createRoom(request, 2);
  const player = await join(request, room, 0);

  const upload = await request.post(`/api/rooms/${room.code}/players/${player.playerId}/sound`, {
    headers: { "x-player-token": player.reconnectToken },
    multipart: {
      sound: {
        name: "voice-memo.m4a",
        mimeType: "audio/x-m4a",
        buffer: Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x4d, 0x34, 0x41, 0x20]),
      },
    },
  });

  expect(upload.ok()).toBeTruthy();
  const stateResponse = await request.get(`/api/rooms/${room.code}`);
  expect(stateResponse.ok()).toBeTruthy();
  const state = await stateResponse.json();
  expect(state.players[0].soundType).toBe("custom");
  expect(state.players[0].soundKey).toBeNull();
});

test("Game Mode can reorder future questions while one question is already live", async ({ request, page }) => {
  const room = await createRoom(request, 2);
  await join(request, room, 0);
  await join(request, room, 1);

  const first = await saveQuestion(request, "Current live question");
  const second = await saveQuestion(request, "Future question A");
  const third = await saveQuestion(request, "Future question B");
  for (const question of [first, second, third]) {
    await hostAction(request, room, "queue", { questionId: question.id });
  }
  await hostAction(request, room, "start-next");

  await page.goto("/host");
  await page.evaluate(({ code, hostToken }) => {
    localStorage.setItem("smartest-host-current-room", code);
    localStorage.setItem(`smartest-host-${code}`, hostToken);
  }, room);
  await page.reload();
  await expect(page.getByRole("heading", { name: `Room ${room.code}` })).toBeVisible();
  await page.getByRole("button", { name: "Enter Game Mode" }).click();
  await expect(page.getByRole("heading", { name: "Current live question" })).toBeVisible();

  const editor = page.locator(".game-queue-editor");
  await expect(editor).toBeVisible();
  await editor.locator("summary").click();
  const queueList = editor.locator(".game-queue-list");
  await expect(queueList.getByText("Current live question", { exact: true })).toHaveCount(0);
  await expect(queueList.getByText("Future question A", { exact: true })).toBeVisible();
  await expect(queueList.getByText("Future question B", { exact: true })).toBeVisible();
  await expect(editor.getByRole("link", { name: /Edit question bank/ })).toHaveAttribute("target", "_blank");

  await editor.getByRole("button", { name: "Move Future question B up" }).click();
  await expect.poll(async () => {
    const state = await privateState(request, room);
    const currentQueueItemId = state.current?.queueItemId;
    return state.queue
      .filter((item: { id: string; state: string }) => item.state === "queued" && item.id !== currentQueueItemId)
      .map((item: { questionId: string }) => item.questionId);
  }).toEqual([third.id, second.id]);

  for (const preload of await editor.getByRole("button", { name: "Preload" }).all()) {
    await expect(preload).toBeDisabled();
  }
});

test("TV prioritizes FIRST and scoreboard within the first viewport after a buzz", async ({ request, page }) => {
  const room = await createRoom(request, 4);
  const players: Player[] = [];
  for (let index = 0; index < 4; index += 1) players.push(await join(request, room, index));

  const question = await saveQuestion(request, "Мы едем в Грузию?", {
    explanation: "Точно едем",
    hints: ["Д...", "...А", "Да едем"],
  });
  await hostAction(request, room, "start", { questionId: question.id });
  await hostAction(request, room, "reveal-stimulus");
  await hostAction(request, room, "reveal-hint");
  await hostAction(request, room, "reveal-hint");
  await hostAction(request, room, "reveal-hint");
  await hostAction(request, room, "reveal-answer");

  const open = await request.post(`/api/rooms/${room.code}/buzz/open`, {
    headers: { "x-host-token": room.hostToken },
  });
  expect(open.ok()).toBeTruthy();
  const publicState = await (await request.get(`/api/rooms/${room.code}`)).json();
  const win = await request.post(`/api/rooms/${room.code}/buzz/claim`, {
    headers: { "x-player-token": players[3].reconnectToken },
    data: { playerId: players[3].playerId, cycleId: publicState.buzz.cycleId },
  });
  expect(win.ok()).toBeTruthy();

  await page.setViewportSize({ width: 2048, height: 1170 });
  await page.goto(`/display/${room.code}`);
  const shell = page.locator("main[data-display-priority='buzz']");
  await expect(shell).toBeVisible();
  await expect(page.getByText("Kamran", { exact: true }).first()).toBeVisible();

  const buzzBox = await page.locator(".buzz-stage").boundingBox();
  const scoreboardBox = await page.locator(".display-players").boundingBox();
  const questionBox = await page.locator(".display-question").boundingBox();
  expect(buzzBox).not.toBeNull();
  expect(scoreboardBox).not.toBeNull();
  expect(questionBox).not.toBeNull();
  expect((buzzBox?.y ?? 0) + (buzzBox?.height ?? 0)).toBeLessThanOrEqual(1170);
  expect((scoreboardBox?.y ?? 0) + (scoreboardBox?.height ?? 0)).toBeLessThanOrEqual(1170);
  expect(questionBox?.y ?? 0).toBeGreaterThan(scoreboardBox?.y ?? 0);
  await expect(page.getByRole("heading", { name: "Мы едем в Грузию?" })).toBeAttached();
});
