import { requireHostForRoom } from "@/lib/room-auth";
import { broadcastRoomRefresh } from "@/lib/room-events";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code: rawCode } = await params;
  const auth = await requireHostForRoom(request, rawCode);
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });

  let body: { groupAPlayerIds?: unknown; groupBPlayerIds?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const groupAPlayerIds = Array.isArray(body.groupAPlayerIds) && body.groupAPlayerIds.every((id) => typeof id === "string")
    ? body.groupAPlayerIds as string[]
    : null;
  const groupBPlayerIds = Array.isArray(body.groupBPlayerIds) && body.groupBPlayerIds.every((id) => typeof id === "string")
    ? body.groupBPlayerIds as string[]
    : null;

  if (!groupAPlayerIds || !groupBPlayerIds || groupAPlayerIds.length !== 4 || groupBPlayerIds.length !== 4) {
    return Response.json({ error: "Tournament Night requires two groups of four players." }, { status: 400 });
  }

  const { data, error } = await auth.supabase.rpc("create_league_8_tournament_atomic", {
    p_room_id: auth.room.id,
    p_group_a_player_ids: groupAPlayerIds,
    p_group_b_player_ids: groupBPlayerIds,
  });

  if (error) {
    const message = error.message.includes("ERR_LEAGUE_8_REQUIRES_8_PLAYERS")
      ? "Exactly 8 active players are required."
      : error.message.includes("ERR_LEAGUE_GROUP_SIZE") || error.message.includes("ERR_LEAGUE_GROUP_DUPLICATE")
        ? "Choose exactly 4 unique players for each group."
        : error.message.includes("ERR_TOURNAMENT_ALREADY_EXISTS")
          ? "This room already has a Tournament Night."
          : error.message.includes("ERR_LEAGUE_PLAYER_NOT_ACTIVE")
            ? "One or more selected players are no longer active in the room."
            : null;
    if (message) return Response.json({ error: message }, { status: 409 });
    console.error("Tournament Night creation failed", error);
    return Response.json({ error: "Could not start Tournament Night." }, { status: 500 });
  }

  await broadcastRoomRefresh(auth.room.code);
  return Response.json({ tournamentId: data });
}
