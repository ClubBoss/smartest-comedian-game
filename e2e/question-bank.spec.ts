import { expect, test, type APIRequestContext } from "@playwright/test";

const ADMIN_KEY = "e2e-question-bank-owner-key";
const ONE_PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nGQAAAAASUVORK5CYII=",
  "base64",
);

async function listQuestions(request: APIRequestContext) {
  const response = await request.get("/api/questions", {
    headers: { "x-question-bank-key": ADMIN_KEY },
  });
  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<{ questions: Array<any> }>;
}

async function saveQuestion(request: APIRequestContext, payload: object, files: Record<string, { name: string; mimeType: string; buffer: Buffer }> = {}) {
  const response = await request.post("/api/questions", {
    headers: { "x-question-bank-key": ADMIN_KEY },
    multipart: { payload: JSON.stringify(payload), ...files },
  });
  return response;
}

test.describe.configure({ mode: "serial" });

test("Question Bank rejects requests without owner key", async ({ request }) => {
  const response = await request.get("/api/questions");
  expect(response.status()).toBe(401);
});

test("text question persists hints, variants, tags and metadata", async ({ request }) => {
  const response = await saveQuestion(request, {
    prompt: "Why did the old sign use a strange color?",
    answer: "Because the pigment changed over time",
    answerVariants: ["the pigment aged", "color degradation"],
    explanation: "The original pigment was chemically unstable.",
    hostNotes: "Let them argue before the first hint.",
    category: "history",
    difficulty: 3,
    sourceLabel: "Museum note",
    sourceUrl: "https://example.test/museum",
    status: "ready",
    hints: ["Think chemistry", "Think age"],
    tags: ["history", "visual"],
    assets: [],
  });
  expect(response.ok()).toBeTruthy();
  const { id } = await response.json();

  const { questions } = await listQuestions(request);
  const saved = questions.find((question) => question.id === id);
  expect(saved.prompt).toBe("Why did the old sign use a strange color?");
  expect(saved.answerVariants).toEqual(["the pigment aged", "color degradation"]);
  expect(saved.hints).toEqual(["Think chemistry", "Think age"]);
  expect(saved.tags).toEqual(expect.arrayContaining(["history", "visual"]));
  expect(saved.status).toBe("ready");
  expect(saved.hostNotes).toBe("Let them argue before the first hint.");
});

test("image-led question uploads private photos and preserves reorder", async ({ request }) => {
  const create = await saveQuestion(
    request,
    {
      prompt: "",
      answer: "The second image",
      status: "ready",
      hints: ["Compare the details"],
      tags: ["photo"],
      assets: [
        { kind: "new", uploadKey: "first", altText: "First photo", caption: "A" },
        { kind: "new", uploadKey: "second", altText: "Second photo", caption: "B" },
      ],
    },
    {
      first: { name: "first.png", mimeType: "image/png", buffer: ONE_PIXEL_PNG },
      second: { name: "second.png", mimeType: "image/png", buffer: ONE_PIXEL_PNG },
    },
  );
  expect(create.ok()).toBeTruthy();
  const { id } = await create.json();

  let { questions } = await listQuestions(request);
  let saved = questions.find((question) => question.id === id);
  expect(saved.prompt).toBeNull();
  expect(saved.assets).toHaveLength(2);
  expect(saved.assets[0].altText).toBe("First photo");
  expect(saved.assets[1].altText).toBe("Second photo");
  expect(saved.assets[0].previewUrl).toContain("/storage/v1/object/sign/question-images/");

  const reorder = await saveQuestion(request, {
    id,
    prompt: "",
    answer: "The second image",
    status: "ready",
    hints: ["Compare the details"],
    tags: ["photo"],
    assets: [
      { kind: "existing", storagePath: saved.assets[1].storagePath, mimeType: saved.assets[1].mimeType, altText: "Second photo", caption: "B" },
      { kind: "existing", storagePath: saved.assets[0].storagePath, mimeType: saved.assets[0].mimeType, altText: "First photo", caption: "A" },
    ],
  });
  expect(reorder.ok()).toBeTruthy();

  ({ questions } = await listQuestions(request));
  saved = questions.find((question) => question.id === id);
  expect(saved.assets.map((asset: { altText: string }) => asset.altText)).toEqual(["Second photo", "First photo"]);
});

test("question requires learner-facing text or image", async ({ request }) => {
  const response = await saveQuestion(request, {
    prompt: "",
    answer: "An answer",
    status: "draft",
    hints: [],
    tags: [],
    assets: [],
  });
  expect(response.status()).toBe(400);
});

test("owner can archive and unarchive without deleting content", async ({ request }) => {
  const create = await saveQuestion(request, {
    prompt: "Archive me",
    answer: "Still here",
    status: "draft",
    hints: ["Hint survives"],
    tags: ["archive"],
    assets: [],
  });
  const { id } = await create.json();

  const archive = await saveQuestion(request, {
    id,
    prompt: "Archive me",
    answer: "Still here",
    status: "archived",
    hints: ["Hint survives"],
    tags: ["archive"],
    assets: [],
  });
  expect(archive.ok()).toBeTruthy();
  let saved = (await listQuestions(request)).questions.find((question) => question.id === id);
  expect(saved.status).toBe("archived");
  expect(saved.answer).toBe("Still here");

  const unarchive = await saveQuestion(request, {
    id,
    prompt: "Archive me",
    answer: "Still here",
    status: "draft",
    hints: ["Hint survives"],
    tags: ["archive"],
    assets: [],
  });
  expect(unarchive.ok()).toBeTruthy();
  saved = (await listQuestions(request)).questions.find((question) => question.id === id);
  expect(saved.status).toBe("draft");
});

test("Question Bank UI creates an image-led question without code changes", async ({ page }) => {
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), {
    key: "smartest-question-bank-admin-key",
    value: ADMIN_KEY,
  });
  await page.goto("/host/questions");
  await expect(page.getByRole("heading", { name: "Question Bank" })).toBeVisible();
  await page.getByRole("button", { name: "New question" }).click();
  await expect(page.getByRole("heading", { name: "New question" })).toBeVisible();

  await page.getByLabel("Answer *").fill("UI photo answer");
  await page.locator('input[type="file"][accept*="image/jpeg"]').setInputFiles({
    name: "ui-photo.png",
    mimeType: "image/png",
    buffer: ONE_PIXEL_PNG,
  });
  await page.getByRole("button", { name: "Add hint" }).click();
  await page.getByPlaceholder("Hint 1").fill("UI hint");
  await page.getByLabel("Status").selectOption("ready");
  await page.getByRole("button", { name: "Save question" }).click();

  await expect(page.getByRole("heading", { name: "Question Bank" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Image-led question" }).last()).toBeVisible();
  await expect(page.getByText("Answer: UI photo answer", { exact: true })).toBeVisible();
});
