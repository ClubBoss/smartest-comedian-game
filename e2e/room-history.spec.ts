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

  const roomsPanel = page.locator("details").filter({ hasText: /^Rooms/ });
  if ((await roomsPanel.getAttribute("open")) === null) {
    await roomsPanel.locator("summary").click();
  }
  await expect(roomsPanel).toHaveAttribute("open", "");

  const firstRoomRow = roomsPanel.locator(".split-heading").filter({ hasText: `Room ${firstCode}` });
  await expect(firstRoomRow.getByRole("button", { name: "Open" })).toBeVisible();
  await firstRoomRow.getByRole("button", { name: "Open" }).click();

  await expect(page.getByRole("heading", { name: `Room ${firstCode}` })).toBeVisible();
});
