import { expect, test, type APIRequestContext } from "@playwright/test";

const SOUNDS = ["duck", "airhorn", "bell", "gong", "siren", "bike", "kazoo", "whistle"];

type Room = { code: string; hostToken: string };
type Joined = {
  playerId: string;
  reconnectToken: string;
  seatOrder: number;
  displayName: string;
  soundType: "builtin";
  soundKey: string;
};

async function createRoom(request: APIRequestContext): Promise<Room> {
  const response = await request.post("/api/rooms", { data: { capacity: 8 } });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function join(request: APIRequestContext, room: Room, index: number): Promise<Joined> {
  const displayName = index < 4 ? `Group A ${index + 1}` : `Group B ${index - 3}`;
  const response = await request.post(`/api/rooms/${room.code}/join`, {
    data: { displayName, soundKey: SOUNDS[index] },
  });
  expect(response.ok()).toBeTruthy();
  const joined = await response.json();
  return {
    ...joined,
    displayName,
    soundType: "builtin",
    soundKey: SOUNDS[index],
  };
}

async function startTournament(request: APIRequestContext, room: Room, players: Joined[]) {
  const response = await request.post(`/api/rooms/${room.code}/tournament/start`, {
    headers: { "x-host-token": room.hostToken },
    data: {
      groupAPlayerIds: players.slice(0, 4).map((player) => player.playerId),
      groupBPlayerIds: players.slice(4).map((player) => player.playerId),
    },
  });
  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<{ tournamentId: string }>;
}

async function roomState(request: APIRequestContext, room: Room) {
  const response = await request.get(`/api/rooms/${room.code}`);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function manualScore(request: APIRequestContext, room: Room, playerId: string, delta: number) {
  const response = await request.post(`/api/rooms/${room.code}/score/manual`, {
    headers: { "x-host-token": room.hostToken },
    data: { playerId, delta, reason: "tournament e2e" },
  });
  expect(response.ok()).toBeTruthy();
}

async function advance(
  request: APIRequestContext,
  room: Room,
  tournamentId: string,
  stage: "qualifier_a" | "qualifier_b",
  playerIds: string[],
) {
  const response = await request.post(`/api/rooms/${room.code}/tournament/advance`, {
    headers: { "x-host-token": room.hostToken },
    data: { tournamentId, stage, advancingPlayerIds: playerIds },
  });
  expect(response.ok()).toBeTruthy();
}

test("League 8 isolates A/B/Final scores and gates inactive buzzers", async ({ request, page }) => {
  const room = await createRoom(request);
  const players: Joined[] = [];
  for (let index = 0; index < 8; index += 1) players.push(await join(request, room, index));

  const { tournamentId } = await startTournament(request, room, players);
  let state = await roomState(request, room);
  expect(state.tournament.currentStage).toBe("qualifier_a");
  expect(state.tournament.activePlayerIds).toEqual(players.slice(0, 4).map((player) => player.playerId));

  await page.goto(`/play/${room.code}`);
  await page.evaluate(({ key, identity }) => localStorage.setItem(key, JSON.stringify(identity)), {
    key: `smartest-player-${room.code}`,
    identity: {
      playerId: players[4].playerId,
      displayName: players[4].displayName,
      seatOrder: players[4].seatOrder,
      soundType: players[4].soundType,
      soundKey: players[4].soundKey,
      reconnectToken: players[4].reconnectToken,
    },
  });
  await page.reload();
  await expect(page.getByText("QUALIFIER B · YOU'RE UP NEXT", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "WATCHING" })).toBeDisabled();

  const opened = await request.post(`/api/rooms/${room.code}/buzz/open`, {
    headers: { "x-host-token": room.hostToken },
  });
  expect(opened.ok()).toBeTruthy();
  const { cycleId } = await opened.json();

  const inactiveBuzz = await request.post(`/api/rooms/${room.code}/buzz/claim`, {
    headers: { "x-player-token": players[4].reconnectToken },
    data: { playerId: players[4].playerId, cycleId },
  });
  expect(inactiveBuzz.status()).toBe(409);
  expect((await inactiveBuzz.json()).error).toContain("not active");

  const activeBuzz = await request.post(`/api/rooms/${room.code}/buzz/claim`, {
    headers: { "x-player-token": players[0].reconnectToken },
    data: { playerId: players[0].playerId, cycleId },
  });
  expect(activeBuzz.ok()).toBeTruthy();
  expect((await activeBuzz.json()).accepted).toBe(true);

  await manualScore(request, room, players[0].playerId, 3);
  await manualScore(request, room, players[1].playerId, 2);
  await advance(request, room, tournamentId, "qualifier_a", [players[0].playerId, players[1].playerId]);

  state = await roomState(request, room);
  expect(state.tournament.currentStage).toBe("qualifier_b");
  expect(state.tournament.activePlayerIds).toEqual(players.slice(4).map((player) => player.playerId));
  const a1Qualifier = state.tournament.members.find(
    (member: { playerId: string; stage: string }) => member.playerId === players[0].playerId && member.stage === "qualifier_a",
  );
  expect(a1Qualifier.score).toBe(3);
  expect(a1Qualifier.qualified).toBe(true);

  await manualScore(request, room, players[4].playerId, 4);
  await manualScore(request, room, players[5].playerId, 1);
  await advance(request, room, tournamentId, "qualifier_b", [players[4].playerId, players[5].playerId]);

  state = await roomState(request, room);
  expect(state.tournament.currentStage).toBe("final");
  expect(new Set(state.tournament.activePlayerIds)).toEqual(new Set([
    players[0].playerId,
    players[1].playerId,
    players[4].playerId,
    players[5].playerId,
  ]));
  const finalMembers = state.tournament.members.filter((member: { stage: string }) => member.stage === "final");
  expect(finalMembers).toHaveLength(4);
  expect(finalMembers.every((member: { score: number }) => member.score === 0)).toBe(true);

  await page.goto(`/display/${room.code}`);
  await expect(page.getByText("FINAL FOUR", { exact: true })).toBeVisible();
  await expect(page.getByText(players[0].displayName, { exact: true })).toBeVisible();
  await expect(page.getByText(players[4].displayName, { exact: true })).toBeVisible();
  await expect(page.getByText(players[2].displayName, { exact: true })).toHaveCount(0);
  await expect(page.getByText(players[6].displayName, { exact: true })).toHaveCount(0);
});
