import { expect, test } from "@playwright/test";

test("host reaction menu broadcasts only with host authority and reaches the shared TV", async ({ request, browser }) => {
  const roomResponse = await request.post("/api/rooms", { data: { capacity: 2 } });
  expect(roomResponse.ok()).toBeTruthy();
  const room = await roomResponse.json() as { code: string; hostToken: string };

  const unauthorized = await request.post(`/api/rooms/${room.code}/reaction`, { data: { key: "laugh" } });
  expect(unauthorized.status()).toBe(401);

  const invalid = await request.post(`/api/rooms/${room.code}/reaction`, {
    headers: { "x-host-token": room.hostToken },
    data: { key: "airhorn" },
  });
  expect(invalid.status()).toBe(400);

  const context = await browser.newContext();
  const display = await context.newPage();
  await display.goto(`/display/${room.code}`);
  await expect(display.getByText("Display connected")).toBeVisible({ timeout: 10_000 });
  await display.getByRole("button", { name: "Enable sound" }).click();
  await expect(display.getByRole("button", { name: "Sound enabled" })).toBeVisible();

  const host = await context.newPage();
  await host.addInitScript(({ code, token }) => {
    localStorage.setItem("smartest-host-current-room", code);
    localStorage.setItem(`smartest-host-${code}`, token);
  }, { code: room.code, token: room.hostToken });
  await host.goto("/host");
  await expect(host.getByRole("heading", { name: `Room ${room.code}` })).toBeVisible();
  await expect(host.getByText("Realtime connected")).toBeVisible({ timeout: 10_000 });

  await host.getByText("🎭 Reactions").click();
  await host.getByRole("button", { name: /Laugh/ }).click();
  await expect(display.locator(".display-reaction")).toContainText("Laugh", { timeout: 10_000 });

  await context.close();
});
