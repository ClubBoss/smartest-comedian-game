import { requireHostForRoom } from "@/lib/room-auth";
import { broadcastRoomRefresh } from "@/lib/room-events";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code: rawCode } = await params;
  const auth = await requireHostForRoom(request, rawCode);
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });

  let body: { tournamentId?: unknown; stage?: unknown; advancingPlayerIds?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (
    typeof body.tournamentId !== "string" ||
    (body.stage !== "qualifier_a" && body.stage !== "qualifier_b") ||
    !Array.isArray(body.advancingPlayerIds) ||
    body.advancingPlayerIds.length !== 2 ||
    !body.advancingPlayerIds.every((id) => typeof id === "string")
  ) {
    return Response.json({ error: "Choose exactly two advancing players from the active qualifier." }, { status: 400 });
  }

  const { data: liveRoom, error: roomStateError } = await auth.supabase
    .from("rooms")
    .select("current_question_session_id, active_buzz_cycle_id")
    .eq("id", auth.room.id)
    .maybeSingle();
  if (roomStateError) {
    console.error("Tournament transition room-state lookup failed", roomStateError);
    return Response.json({ error: "Could not verify current game state." }, { status: 500 });
  }

  let hasOpenBuzzCycle = false;
  if (liveRoom?.active_buzz_cycle_id) {
    const { data: cycle, error: cycleError } = await auth.supabase
      .from("buzz_cycles")
      .select("closed_at")
      .eq("id", liveRoom.active_buzz_cycle_id)
      .maybeSingle();
    if (cycleError) {
      console.error("Tournament transition buzzer lookup failed", cycleError);
      return Response.json({ error: "Could not verify current buzzer state." }, { status: 500 });
    }
    hasOpenBuzzCycle = Boolean(cycle && !cycle.closed_at);
  }

  if (liveRoom?.current_question_session_id || hasOpenBuzzCycle) {
    return Response.json({ error: "Finish the current question and buzzer cycle before changing tournament stage." }, { status: 409 });
  }

  const { data: tournament, error: lookupError } = await auth.supabase
    .from("tournament_nights")
    .select("id")
    .eq("id", body.tournamentId)
    .eq("room_id", auth.room.id)
    .maybeSingle();
  if (lookupError) {
    console.error("Tournament ownership lookup failed", lookupError);
    return Response.json({ error: "Could not verify Tournament Night." }, { status: 500 });
  }
  if (!tournament) return Response.json({ error: "Tournament Night not found for this room." }, { status: 404 });

  const { data, error } = await auth.supabase.rpc("advance_league_8_tournament_with_pack_atomic", {
    p_tournament_id: tournament.id,
    p_stage: body.stage,
    p_advancing_player_ids: body.advancingPlayerIds as string[],
  });

  if (error) {
    const message = error.message.includes("ERR_TOURNAMENT_STAGE_MISMATCH")
      ? "The tournament has already moved to another stage. Refresh and try again."
      : error.message.includes("ERR_QUALIFIER_PLAYER_NOT_MEMBER")
        ? "An advancing player is not a member of this qualifier."
        : error.message.includes("ERR_FINAL_REQUIRES_FOUR_QUALIFIERS")
          ? "Final Four cannot start until two players qualify from each group."
          : error.message.includes("ERR_QUALIFIER_REQUIRES_TWO")
            ? "Exactly two players must advance."
            : error.message.includes("ERR_TOURNAMENT_PACK") || error.message.includes("ERR_QUESTION_NOT_READY")
              ? "The next block's Question Pack is missing or no longer valid. Fix it in Question Bank before continuing."
              : null;
    if (message) return Response.json({ error: message }, { status: 409 });
    console.error("Tournament qualifier transition failed", error);
    return Response.json({ error: "Could not advance Tournament Night." }, { status: 500 });
  }

  await broadcastRoomRefresh(auth.room.code);
  return Response.json({ stage: data });
}
