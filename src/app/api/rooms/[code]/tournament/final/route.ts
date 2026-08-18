import { requireHostForRoom } from "@/lib/room-auth";
import { broadcastRoomRefresh } from "@/lib/room-events";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code: rawCode } = await params;
  const auth = await requireHostForRoom(request, rawCode);
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });

  let body: { action?: unknown; championPlayerId?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const action = typeof body.action === "string" ? body.action : "";
  const { data: tournament, error: tournamentError } = await auth.supabase
    .from("tournament_nights")
    .select("id, current_stage, status, champion_player_id")
    .eq("room_id", auth.room.id)
    .maybeSingle();

  if (tournamentError) {
    console.error("Final game lookup failed", tournamentError);
    return Response.json({ error: "Could not load final game state." }, { status: 500 });
  }
  if (!tournament) return Response.json({ error: "Game Night is not active." }, { status: 404 });

  let data: unknown = null;
  let error: { message: string } | null = null;

  if (action === "team-correct" || action === "team-wrong") {
    ({ data, error } = await auth.supabase.rpc("set_team_question_result_atomic", {
      p_tournament_id: tournament.id,
      p_correct: action === "team-correct",
    }));
  } else if (action === "complete") {
    if (typeof body.championPlayerId !== "string") {
      return Response.json({ error: "Choose the winner first." }, { status: 400 });
    }
    const { data: roomState, error: roomStateError } = await auth.supabase
      .from("rooms")
      .select("current_question_session_id, active_buzz_cycle_id")
      .eq("id", auth.room.id)
      .maybeSingle();
    if (roomStateError) return Response.json({ error: "Could not verify live game state." }, { status: 500 });
    if (roomState?.current_question_session_id) {
      return Response.json({ error: "Finish the current question before locking the winner." }, { status: 409 });
    }
    ({ data, error } = await auth.supabase.rpc("complete_game_night_atomic", {
      p_tournament_id: tournament.id,
      p_champion_player_id: body.championPlayerId,
    }));
  } else if (action === "take") {
    ({ data, error } = await auth.supabase.rpc("resolve_game_night_prize_atomic", {
      p_tournament_id: tournament.id,
      p_risk: false,
      p_correct: null,
    }));
  } else if (action === "double-correct" || action === "double-wrong") {
    ({ data, error } = await auth.supabase.rpc("resolve_game_night_prize_atomic", {
      p_tournament_id: tournament.id,
      p_risk: true,
      p_correct: action === "double-correct",
    }));
  } else {
    return Response.json({ error: "Unknown final action." }, { status: 400 });
  }

  if (error) {
    const known = error.message.match(/ERR_[A-Z_]+/)?.[0];
    const messages: Record<string, string> = {
      ERR_GAME_NOT_IN_FINAL: "This action is only available during the Final.",
      ERR_CHAMPION_NOT_FINALIST: "The selected winner is not a finalist.",
      ERR_PRIZE_ALREADY_RESOLVED: "The prize decision has already been recorded.",
      ERR_DOUBLE_RESULT_REQUIRED: "Record whether the Double or Nothing answer was correct.",
    };
    if (known) return Response.json({ error: messages[known] ?? known }, { status: 409 });
    console.error("Final game action failed", action, error);
    return Response.json({ error: "Could not update final game state." }, { status: 500 });
  }

  await broadcastRoomRefresh(auth.room.code);
  return Response.json({ ok: true, value: data });
}
