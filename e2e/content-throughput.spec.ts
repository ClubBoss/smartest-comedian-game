import { expect, test } from "@playwright/test";

const ADMIN_KEY = "e2e-question-bank-owner-key";
const ONE_PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nGQAAAAASUVORK5CYII=",
  "base64",
);

test("bulk import and duplicate preserve question data and private photo references", async ({ request, page }) => {
  const unauthorized = await request.post("/api/questions/import", { data: { questions: [{ prompt: "No", answer: "No" }] } });
  expect(unauthorized.status()).toBe(401);

  const imported = await request.post("/api/questions/import", {
    headers: { "x-question-bank-key": ADMIN_KEY },
    data: {
      questions: [
        { prompt: "Bulk alpha", answer: "A", hints: ["A hint"], tags: ["bulk"], category: "Batch", difficulty: 2, status: "ready" },
        { prompt: "Bulk beta", answer: "B", answerVariants: ["Bee"], tags: ["bulk", "beta"], status: "draft" },
      ],
    },
  });
  expect(imported.ok()).toBeTruthy();
  expect((await imported.json()).count).toBe(2);

  const photo = await request.post("/api/questions", {
    headers: { "x-question-bank-key": ADMIN_KEY },
    multipart: {
      payload: JSON.stringify({
        prompt: "Duplicate photo source",
        answer: "Pixel",
        explanation: "Keep this explanation",
        hostNotes: "Keep private note",
        status: "ready",
        hints: ["Photo hint"],
        tags: ["photo", "duplicate"],
        assets: [{ kind: "new", uploadKey: "photo", altText: "Pixel", caption: "Tiny photo" }],
      }),
      photo: { name: "pixel.png", mimeType: "image/png", buffer: ONE_PIXEL_PNG },
    },
  });
  expect(photo.ok()).toBeTruthy();
  const sourceId = (await photo.json()).id as string;

  const duplicated = await request.post(`/api/questions/${sourceId}/duplicate`, {
    headers: { "x-question-bank-key": ADMIN_KEY },
  });
  expect(duplicated.ok()).toBeTruthy();
  const duplicateId = (await duplicated.json()).id as string;
  expect(duplicateId).not.toBe(sourceId);

  const list = await request.get("/api/questions", { headers: { "x-question-bank-key": ADMIN_KEY } });
  expect(list.ok()).toBeTruthy();
  const questions = (await list.json()).questions as Array<{
    id: string; prompt: string; answer: string; status: string; hints: string[]; tags: string[]; assets: Array<{ storagePath: string }>;
  }>;
  expect(questions.find((item) => item.prompt === "Bulk alpha")?.hints).toEqual(["A hint"]);
  const source = questions.find((item) => item.id === sourceId)!;
  const copy = questions.find((item) => item.id === duplicateId)!;
  expect(copy.prompt).toBe(source.prompt);
  expect(copy.answer).toBe(source.answer);
  expect(copy.status).toBe("draft");
  expect(copy.hints).toEqual(source.hints);
  expect(copy.tags.sort()).toEqual(source.tags.sort());
  expect(copy.assets).toHaveLength(1);
  expect(copy.assets[0].storagePath).toBe(source.assets[0].storagePath);

  await page.addInitScript(({ key }) => localStorage.setItem("smartest-question-bank-admin-key", key), { key: ADMIN_KEY });
  await page.goto("/host/questions/tools");
  await expect(page.getByRole("heading", { name: "Bulk import & duplicate" })).toBeVisible();
  await page.getByLabel("Bulk import data").fill("prompt,answer,hints,tags,status\nCSV gamma,Gamma,First hint|Second hint,csv|gamma,ready");
  await page.getByRole("button", { name: "Import questions" }).click();
  await expect(page.getByText("Imported 1 questions.")).toBeVisible();

  const finalList = await request.get("/api/questions", { headers: { "x-question-bank-key": ADMIN_KEY } });
  const finalQuestions = (await finalList.json()).questions as Array<{ prompt: string; hints: string[]; tags: string[] }>;
  const gamma = finalQuestions.find((item) => item.prompt === "CSV gamma")!;
  expect(gamma.hints).toEqual(["First hint", "Second hint"]);
  expect(gamma.tags.sort()).toEqual(["csv", "gamma"]);
});
