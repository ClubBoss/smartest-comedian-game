import { expect, test, type APIRequestContext } from "@playwright/test";

const ADMIN_KEY = "e2e-question-bank-owner-key";

async function createQuestion(request: APIRequestContext, prompt: string) {
  const response = await request.post("/api/questions", {
    headers: { "x-question-bank-key": ADMIN_KEY },
    multipart: {
      payload: JSON.stringify({
        prompt,
        answer: "Disposable answer",
        status: "draft",
        hints: [],
        tags: ["content-hygiene"],
        assets: [],
      }),
    },
  });
  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<{ id: string }>;
}

test("host can remove a stale non-current room from this browser", async ({ page }) => {
  await page.goto("/host");
  await page.locator("select").selectOption("2");
  await page.getByRole("button", { name: "Create room" }).click();

  const roomHeading = page.getByRole("heading", { name: /^Room [A-Z0-9]{6}$/ });
  const firstCode = (await roomHeading.textContent())?.replace("Room ", "") ?? "";
  expect(firstCode).toMatch(/^[A-Z0-9]{6}$/);

  page.once("dialog", async (dialog) => dialog.accept());
  await page.getByRole("button", { name: "New room" }).click();
  await page.locator("select").selectOption("2");
  await page.getByRole("button", { name: "Create room" }).click();

  const secondCode = (await roomHeading.textContent())?.replace("Room ", "") ?? "";
  expect(secondCode).toMatch(/^[A-Z0-9]{6}$/);
  expect(secondCode).not.toBe(firstCode);

  const roomsPanel = page.locator("details").filter({ hasText: /^Rooms/ });
  const secondRoomRow = roomsPanel.locator(".split-heading").filter({ hasText: `Room ${secondCode}` });

  // HostRoomManager reconciles the current-room marker on its polling tick.
  // Wait for that canonical state before opening the panel so a mid-click
  // controlled <details> update cannot collapse the Remove target.
  await expect(secondRoomRow.getByText("Current", { exact: true })).toHaveCount(1);

  const roomsOpen = await roomsPanel.evaluate((element) => (element as HTMLDetailsElement).open);
  if (!roomsOpen) await roomsPanel.locator("summary").click();

  const firstRoomRow = roomsPanel.locator(".split-heading").filter({ hasText: `Room ${firstCode}` });
  await expect(firstRoomRow.getByRole("button", { name: "Remove" })).toBeVisible();

  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain(`Remove Room ${firstCode} from this browser`);
    await dialog.accept();
  });
  await firstRoomRow.getByRole("button", { name: "Remove" }).click();

  await expect(roomsPanel.getByText(`Room ${firstCode}`, { exact: true })).toHaveCount(0);
  await expect.poll(() => page.evaluate((code) => localStorage.getItem(`smartest-host-${code}`), firstCode)).toBeNull();
});

test("archived questions leave the active list and can be permanently deleted from Archive", async ({ page, request }) => {
  const prompt = `Archive separation ${Date.now()}`;
  const { id } = await createQuestion(request, prompt);

  const activeDelete = await request.delete(`/api/questions/${id}`, {
    headers: { "x-question-bank-key": ADMIN_KEY },
  });
  expect(activeDelete.status()).toBe(409);
  expect((await activeDelete.json()).error).toContain("Archive the question");

  await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), {
    key: "smartest-question-bank-admin-key",
    value: ADMIN_KEY,
  });
  await page.goto("/host/questions");

  const activeCard = page.locator("article.question-card").filter({ hasText: prompt });
  await expect(activeCard).toBeVisible();
  await activeCard.getByRole("button", { name: "Archive" }).click();
  await expect(activeCard).toHaveCount(0);

  await page.getByRole("button", { name: /^Archive \(\d+\)$/ }).click();
  const archivedCard = page.locator("article.question-card").filter({ hasText: prompt });
  await expect(archivedCard).toBeVisible();
  await expect(archivedCard.getByText("Archived", { exact: true })).toBeVisible();

  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("Permanently delete");
    await dialog.accept();
  });
  await archivedCard.getByRole("button", { name: "Delete permanently" }).click();
  await expect(archivedCard).toHaveCount(0);

  const list = await request.get("/api/questions", {
    headers: { "x-question-bank-key": ADMIN_KEY },
  });
  expect(list.ok()).toBeTruthy();
  const body = await list.json() as { questions: Array<{ id: string }> };
  expect(body.questions.some((question) => question.id === id)).toBeFalsy();
});
