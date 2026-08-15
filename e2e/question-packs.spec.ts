import { expect, test, type APIRequestContext } from "@playwright/test";

const ADMIN_KEY = "e2e-question-bank-owner-key";

type Room = { code: string; hostToken: string };

async function createRoom(request: APIRequestContext): Promise<Room> {
  const response = await request.post("/api/rooms", { data: { capacity: 4 } });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function createQuestion(request: APIRequestContext, prompt: string) {
  const response = await request.post("/api/questions", {
    headers: { "x-question-bank-key": ADMIN_KEY },
    multipart: {
      payload: JSON.stringify({
        prompt,
        answer: `${prompt} answer`,
        status: "ready",
        hints: [],
        tags: ["pack-test"],
        assets: [],
      }),
    },
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()).id as string;
}

async function queueState(request: APIRequestContext, room: Room) {
  const response = await request.get(`/api/rooms/${room.code}/questions`, {
    headers: { "x-host-token": room.hostToken },
  });
  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<{ queue: Array<{ questionId: string; position: number; state: string; prompt: string }> }>;
}

test("saved question packs queue in saved or shuffled order without new game state", async ({ request, page }) => {
  const q1 = await createQuestion(request, "Pack Alpha");
  const q2 = await createQuestion(request, "Pack Beta");
  const q3 = await createQuestion(request, "Pack Gamma");

  const savePack = await request.post("/api/question-packs", {
    headers: { "x-question-bank-key": ADMIN_KEY },
    data: {
      name: "QA Evening Pack",
      description: "Reusable QA set",
      questionIds: [q1, q2, q3],
    },
  });
  expect(savePack.ok()).toBeTruthy();
  const packId = (await savePack.json()).id as string;

  const packs = await request.get("/api/question-packs", {
    headers: { "x-question-bank-key": ADMIN_KEY },
  });
  expect(packs.ok()).toBeTruthy();
  const saved = (await packs.json()).packs.find((pack: { id: string }) => pack.id === packId);
  expect(saved.name).toBe("QA Evening Pack");
  expect(saved.questionIds).toEqual([q1, q2, q3]);

  const orderedRoom = await createRoom(request);
  const ordered = await request.post(`/api/rooms/${orderedRoom.code}/packs`, {
    headers: { "x-host-token": orderedRoom.hostToken },
    data: { packId, randomize: false },
  });
  expect(ordered.ok()).toBeTruthy();
  expect((await ordered.json()).count).toBe(3);
  const orderedState = await queueState(request, orderedRoom);
  expect(orderedState.queue.map((item) => item.questionId)).toEqual([q1, q2, q3]);

  const shuffledRoom = await createRoom(request);
  const shuffled = await request.post(`/api/rooms/${shuffledRoom.code}/packs`, {
    headers: { "x-host-token": shuffledRoom.hostToken },
    data: { packId, randomize: true },
  });
  expect(shuffled.ok()).toBeTruthy();
  const shuffledResult = await shuffled.json();
  expect(shuffledResult.count).toBe(3);
  expect(shuffledResult.randomized).toBe(true);
  const shuffledState = await queueState(request, shuffledRoom);
  expect(shuffledState.queue).toHaveLength(3);
  expect(new Set(shuffledState.queue.map((item) => item.questionId))).toEqual(new Set([q1, q2, q3]));

  await page.addInitScript(({ key }) => {
    localStorage.setItem("smartest-question-bank-admin-key", key);
  }, { key: ADMIN_KEY });
  await page.goto("/host/questions/packs");
  await expect(page.getByRole("heading", { name: "Saved game sets" })).toBeVisible();
  await expect(page.getByText("QA Evening Pack")).toBeVisible();

  const uiRoom = await createRoom(request);
  await page.addInitScript(({ code, token }) => {
    localStorage.setItem("smartest-host-current-room", code);
    localStorage.setItem(`smartest-host-${code}`, token);
  }, { code: uiRoom.code, token: uiRoom.hostToken });
  await page.goto("/host");
  await expect(page.getByRole("heading", { name: `Room ${uiRoom.code}` })).toBeVisible();
  await expect(page.getByLabel("Question pack")).toBeVisible({ timeout: 10_000 });
  await page.getByLabel("Question pack").selectOption(packId);
  await page.getByRole("button", { name: "Queue shuffled" }).click();
  await expect(page.getByText("3 questions queued in shuffled order.")).toBeVisible();

  const uiState = await queueState(request, uiRoom);
  expect(uiState.queue).toHaveLength(3);
  expect(new Set(uiState.queue.map((item) => item.questionId))).toEqual(new Set([q1, q2, q3]));
});
