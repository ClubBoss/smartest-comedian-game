import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const ADMIN_KEY = "e2e-question-bank-owner-key";
const ONE_PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nGQAAAAASUVORK5CYII=",
  "base64",
);

type Room = { code: string; hostToken: string };
type Player = { playerId: string; reconnectToken: string };

async function createRoom(request: APIRequestContext): Promise<Room> {
  const response = await request.post("/api/rooms", { data: { capacity: 2 } });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function join(request: APIRequestContext, room: Room, index: number): Promise<Player> {
  const response = await request.post(`/api/rooms/${room.code}/join`, {
    data: { displayName: `Live ${index + 1}`, soundKey: index === 0 ? "duck" : "bell" },
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
  return request.post(`/api/rooms/${room.code}/questions/action`, {
    headers: { "x-host-token": room.hostToken },
    data: { action, ...extra },
  });
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

async function openBuzz(request: APIRequestContext, room: Room) {
  return request.post(`/api/rooms/${room.code}/buzz/open`, {
    headers: { "x-host-token": room.hostToken },
  });
}

async function winCurrentBuzz(request: APIRequestContext, room: Room, player: Player) {
  const roomState = await publicState(request, room);
  const response = await request.post(`/api/rooms/${room.code}/buzz/claim`, {
    headers: { "x-player-token": player.reconnectToken },
    data: { playerId: player.playerId, cycleId: roomState.buzz.cycleId },
  });
  expect(response.ok()).toBeTruthy();
  expect((await response.json()).accepted).toBe(true);
  return roomState.buzz.cycleId as string;
}

async function expectDisplayContains(page: Page, room: Room, text: string) {
  await page.goto(`/display/${room.code}`);
  await expect(page.getByText(text, { exact: false }).first()).toBeVisible();
}

test.describe.configure({ mode: "serial" });

test("live question stays private until reveal and snapshot survives source edits", async ({ request, page }) => {
  const room = await createRoom(request);
  const player = await join(request, room, 0);
  await join(request, room, 1);

  const first = await saveQuestion(request, {
    prompt: "Queue first",
    answer: "First answer",
    status: "ready",
    hints: ["First hint"],
    tags: ["queue"],
    assets: [],
  });
  const snapshot = await saveQuestion(
    request,
    {
      prompt: "Original snapshot prompt",
      answer: "Original snapshot answer",
      answerVariants: ["Secret acceptable variant"],
      explanation: "Original explanation",
      hostNotes: "SECRET HOST NOTE",
      status: "ready",
      hints: ["Old hint one", "Old hint two"],
      tags: ["snapshot"],
      assets: [{ kind: "new", uploadKey: "photo", altText: "Snapshot photo", caption: "Original photo" }],
    },
    { photo: { name: "snapshot.png", mimeType: "image/png", buffer: ONE_PIXEL_PNG } },
  );

  expect((await hostAction(request, room, "queue", { questionId: first.id })).ok()).toBeTruthy();
  expect((await hostAction(request, room, "queue", { questionId: snapshot.id })).ok()).toBeTruthy();
  let admin = await privateState(request, room);
  const snapshotQueueItem = admin.queue.find((item: { questionId: string }) => item.questionId === snapshot.id);
  expect(snapshotQueueItem).toBeTruthy();
  expect((await hostAction(request, room, "move", { queueItemId: snapshotQueueItem.id, direction: -1 })).ok()).toBeTruthy();

  expect((await hostAction(request, room, "start-next")).ok()).toBeTruthy();
  admin = await privateState(request, room);
  expect(admin.current.prompt).toBe("Original snapshot prompt");
  expect(admin.current.answer).toBe("Original snapshot answer");
  expect(admin.current.answerVariants).toContain("Secret acceptable variant");
  expect(admin.current.hostNotes).toBe("SECRET HOST NOTE");
  expect(admin.current.stimulusRevealed).toBe(false);

  let learner = await publicState(request, room);
  expect(learner.question.stimulusRevealed).toBe(false);
  expect(learner.question.prompt).toBeNull();
  expect(learner.question.assets).toEqual([]);
  expect(learner.question.answer).toBeNull();
  const hiddenJson = JSON.stringify(learner);
  expect(hiddenJson).not.toContain("Original snapshot prompt");
  expect(hiddenJson).not.toContain("Original snapshot answer");
  expect(hiddenJson).not.toContain("Secret acceptable variant");
  expect(hiddenJson).not.toContain("SECRET HOST NOTE");

  const earlyBuzz = await openBuzz(request, room);
  expect(earlyBuzz.status()).toBe(409);

  expect((await hostAction(request, room, "reveal-stimulus")).ok()).toBeTruthy();
  learner = await publicState(request, room);
  expect(learner.question.prompt).toBe("Original snapshot prompt");
  expect(learner.question.assets).toHaveLength(1);
  expect(learner.question.assets[0].url).toContain("/storage/v1/object/sign/question-images/");
  expect(learner.question.answer).toBeNull();
  expect(JSON.stringify(learner)).not.toContain("SECRET HOST NOTE");
  const oldImageUrl = learner.question.assets[0].url as string;
  expect((await request.get(oldImageUrl)).ok()).toBeTruthy();
  await expectDisplayContains(page, room, "Original snapshot prompt");
  await expect(page.getByAltText("Snapshot photo")).toBeVisible();

  await saveQuestion(request, {
    id: snapshot.id,
    prompt: "Edited source prompt",
    answer: "Edited source answer",
    answerVariants: ["Edited variant"],
    explanation: "Edited explanation",
    hostNotes: "EDITED HOST NOTE",
    status: "ready",
    hints: ["Edited hint"],
    tags: ["edited"],
    assets: [],
  });

  learner = await publicState(request, room);
  admin = await privateState(request, room);
  expect(learner.question.prompt).toBe("Original snapshot prompt");
  expect(admin.current.answer).toBe("Original snapshot answer");
  expect(admin.current.hostNotes).toBe("SECRET HOST NOTE");
  expect(learner.question.assets[0].storagePath).toContain(snapshot.id);
  expect((await request.get(oldImageUrl)).ok()).toBeTruthy();

  expect((await hostAction(request, room, "reveal-hint")).ok()).toBeTruthy();
  learner = await publicState(request, room);
  expect(learner.question.revealedHints).toEqual(["Old hint one"]);
  await expectDisplayContains(page, room, "Old hint one");
  expect((await hostAction(request, room, "reveal-hint")).ok()).toBeTruthy();
  learner = await publicState(request, room);
  expect(learner.question.revealedHints).toEqual(["Old hint one", "Old hint two"]);

  expect((await openBuzz(request, room)).ok()).toBeTruthy();
  const firstCycle = await winCurrentBuzz(request, room, player);
  const scoreOne = await request.post(`/api/rooms/${room.code}/score/answer`, {
    headers: { "x-host-token": room.hostToken },
    data: { playerId: player.playerId, cycleId: firstCycle, delta: 1 },
  });
  expect(scoreOne.ok()).toBeTruthy();

  expect((await openBuzz(request, room)).ok()).toBeTruthy();
  const secondCycle = await winCurrentBuzz(request, room, player);
  expect(secondCycle).not.toBe(firstCycle);
  const scoreZero = await request.post(`/api/rooms/${room.code}/score/answer`, {
    headers: { "x-host-token": room.hostToken },
    data: { playerId: player.playerId, cycleId: secondCycle, delta: 0 },
  });
  expect(scoreZero.ok()).toBeTruthy();
  learner = await publicState(request, room);
  expect(learner.players.find((item: { id: string }) => item.id === player.playerId).score).toBe(1);

  expect((await hostAction(request, room, "reveal-answer")).ok()).toBeTruthy();
  learner = await publicState(request, room);
  expect(learner.question.answer).toBe("Original snapshot answer");
  expect(learner.question.explanation).toBe("Original explanation");
  const revealedJson = JSON.stringify(learner);
  expect(revealedJson).not.toContain("Secret acceptable variant");
  expect(revealedJson).not.toContain("SECRET HOST NOTE");
  await expectDisplayContains(page, room, "Original snapshot answer");
  await expect(page.getByText("Original explanation", { exact: true })).toBeVisible();

  expect((await hostAction(request, room, "finish")).ok()).toBeTruthy();
  learner = await publicState(request, room);
  expect(learner.question).toBeNull();
  admin = await privateState(request, room);
  const played = admin.queue.find((item: { questionId: string }) => item.questionId === snapshot.id);
  expect(played.state).toBe("played");

  const remaining = admin.queue.find((item: { questionId: string }) => item.questionId === first.id);
  expect(remaining.state).toBe("queued");
  expect((await hostAction(request, room, "skip", { queueItemId: remaining.id })).ok()).toBeTruthy();
  admin = await privateState(request, room);
  expect(admin.queue.find((item: { id: string }) => item.id === remaining.id).state).toBe("skipped");
});
