import { expect, test } from "@playwright/test";

test("host can create a new room without losing the previous room", async ({ page }) => {
  await page.goto("/host");
  await page.locator("select").selectOption("2");
  await page.getByRole("button", { name: "Create room" }).click();

  const firstHeading = page.getByRole("heading", { name: /^Room [A-Z0-9]{6}$/ });
  await expect(firstHeading).toBeVisible();
  const firstCode = (await firstHeading.textContent())?.replace("Room ", "") ?? "";
  expect(firstCode).toMatch(/^[A-Z0-9]{6}$/);

  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain(`Room ${firstCode} will stay saved in Rooms`);
    await dialog.accept();
  });
  await page.getByRole("button", { name: "New room" }).click();
  await expect(page.getByRole("heading", { name: "Create a room" })).toBeVisible();
  await expect(page.getByText(`Room ${firstCode}`, { exact: true })).toBeVisible();

  await page.locator("select").selectOption("2");
  await page.getByRole("button", { name: "Create room" }).click();
  const secondHeading = page.getByRole("heading", { name: /^Room [A-Z0-9]{6}$/ });
  await expect(secondHeading).toBeVisible();
  const secondCode = (await secondHeading.textContent())?.replace("Room ", "") ?? "";
  expect(secondCode).toMatch(/^[A-Z0-9]{6}$/);
  expect(secondCode).not.toBe(firstCode);

  // Reconcile room history through the same browser-persistence path used after a real host refresh.
  // This avoids racing the 500 ms room-history observer against the second room creation.
  await page.reload();
  await expect(page.getByRole("heading", { name: `Room ${secondCode}` })).toBeVisible();

  const roomsPanel = page.locator("details").filter({ hasText: /^Rooms/ });
  if ((await roomsPanel.getAttribute("open")) === null) {
    await roomsPanel.locator("summary").click();
  }
  await expect(roomsPanel).toHaveAttribute("open", "");
  await expect(roomsPanel.getByText(`Room ${firstCode}`, { exact: true })).toBeVisible();

  const firstRoomRow = roomsPanel.locator(".split-heading").filter({ hasText: `Room ${firstCode}` });
  await firstRoomRow.getByRole("button", { name: "Open", exact: true }).click();

  await expect(page.getByRole("heading", { name: `Room ${firstCode}` })).toBeVisible();
});
