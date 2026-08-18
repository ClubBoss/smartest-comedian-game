import { requireHostForRoom } from "@/lib/room-auth";
import { broadcastRoomRefresh } from "@/lib/room-events";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code: rawCode } = await params;
  const auth = await requireHostForRoom(request, rawCode);
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });

  let body: {
    groupAPlayerIds?: unknown;
    groupBPlayerIds?: unknown;
    qualifierAPackId?: unknown;
    qualifierBPackId?: unknown;
    finalPackId?: unknown;
  };
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
  if (
    typeof body.qualifierAPackId !== "string" ||
    typeof body.qualifierBPackId !== "string" ||
    typeof body.finalPackId !== "string"
  ) {
    return Response.json({ error: "Choose Question Packs for Group A, Group B and Final Four." }, { status: 400 });
  }

  const { data, error } = await auth.supabase.rpc("start_league_8_tournament_with_packs_atomic", {
    p_room_id: auth.room.id,
    p_group_a_player_ids: groupAPlayerIds,
    p_group_b_player_ids: groupBPlayerIds,
    p_qualifier_a_pack_id: body.qualifierAPackId,
    p_qualifier_b_pack_id: body.qualifierBPackId,
    p_final_pack_id: body.finalPackId,
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
            : error.message.includes("ERR_TOURNAMENT_PACK") || error.message.includes("ERR_QUESTION_NOT_READY")
              ? "One of the three packs is missing, empty, uses the wrong stage/role, or contains a question that is not Ready."
              : null;
    if (message) return Response.json({ error: message }, { status: 409 });
    console.error("Tournament Night creation failed", error);
    return Response.json({ error: "Could not start Tournament Night." }, { status: 500 });
  }

  await broadcastRoomRefresh(auth.room.code);
  return Response.json({ tournamentId: data, stage: "qualifier_a" });
}
