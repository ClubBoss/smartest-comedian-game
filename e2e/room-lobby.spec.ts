import { expect, test, type APIRequestContext } from "@playwright/test";

const SOUNDS = ["duck", "airhorn", "bell", "gong", "siren", "bike", "kazoo", "whistle", "horn", "buzzer"];

async function createRoom(request: APIRequestContext, capacity: number) {
  const response = await request.post("/api/rooms", { data: { capacity } });
  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<{ code: string; hostToken: string }>;
}

async function joinPlayer(
  request: APIRequestContext,
  code: string,
  index: number,
) {
  const response = await request.post(`/api/rooms/${code}/join`, {
    data: { displayName: `Player ${index + 1}`, soundKey: SOUNDS[index] },
  });
  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<{
    playerId: string;
    reconnectToken: string;
    seatOrder: number;
  }>;
}

test.describe.configure({ mode: "serial" });

for (const capacity of [2, 8, 10]) {
  test(`${capacity}-player lobby fills exactly to capacity`, async ({ request, page }) => {
    const room = await createRoom(request, capacity);

    for (let index = 0; index < capacity; index += 1) {
      await joinPlayer(request, room.code, index);
    }

    const stateResponse = await request.get(`/api/rooms/${room.code}`);
    expect(stateResponse.ok()).toBeTruthy();
    const state = await stateResponse.json();
    expect(state.playerCount).toBe(capacity);
    expect(state.players).toHaveLength(capacity);

    const overflow = await request.post(`/api/rooms/${room.code}/join`, {
      data: { displayName: "Overflow", soundKey: "duck" },
    });
    expect(overflow.status()).toBe(409);

    await page.goto(`/display/${room.code}`);
    await expect(page.getByText(`Player ${capacity}`, { exact: true })).toBeVisible();
    await expect(page.getByText(`${capacity} / ${capacity} players`, { exact: true })).toBeVisible();
  });
}

test("player reconnect survives refresh credentials", async ({ request }) => {
  const room = await createRoom(request, 2);
  const joined = await joinPlayer(request, room.code, 0);

  const reconnect = await request.post(`/api/rooms/${room.code}/reconnect`, {
    data: {
      playerId: joined.playerId,
      reconnectToken: joined.reconnectToken,
    },
  });

  expect(reconnect.ok()).toBeTruthy();
  const identity = await reconnect.json();
  expect(identity.playerId).toBe(joined.playerId);
  expect(identity.seatOrder).toBe(1);
  expect(identity.soundKey).toBe("duck");
});

test("custom sound replaces built-in identity only after successful upload", async ({ request }) => {
  const room = await createRoom(request, 2);
  const joined = await joinPlayer(request, room.code, 0);

  const upload = await request.post(
    `/api/rooms/${room.code}/players/${joined.playerId}/sound`,
    {
      headers: { "x-player-token": joined.reconnectToken },
      multipart: {
        sound: {
          name: "short.mp3",
          mimeType: "audio/mpeg",
          buffer: Buffer.from([0x49, 0x44, 0x33, 0x03, 0x00, 0x00, 0x00, 0x00]),
        },
      },
    },
  );

  expect(upload.ok()).toBeTruthy();

  const state = await (await request.get(`/api/rooms/${room.code}`)).json();
  expect(state.players[0].soundType).toBe("custom");
  expect(state.players[0].soundKey).toBeNull();
});

test("host UI creates a room and exposes QR lobby", async ({ page }) => {
  await page.goto("/host");
  await page.locator("select").selectOption("2");
  await page.getByRole("button", { name: "Create room" }).click();
  await expect(page.getByText("Lobby", { exact: true })).toBeVisible();
  await expect(page.locator(".room-code")).toHaveText(/[A-Z0-9]{6}/);
  await expect(page.getByAltText("Join room QR code")).toBeVisible();
});
