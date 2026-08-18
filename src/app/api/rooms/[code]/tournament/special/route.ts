import type { SupabaseClient } from "@supabase/supabase-js";
import { requireHostForRoom } from "@/lib/room-auth";
import { broadcastRoomRefresh } from "@/lib/room-events";

async function currentQuestion(supabase: SupabaseClient, roomId: string) {
  const { data: room } = await supabase
    .from("rooms")
    .select("current_question_session_id")
    .eq("id", roomId)
    .maybeSingle();
  if (!room?.current_question_session_id) return null;
  const { data: session } = await supabase
    .from("question_sessions")
    .select("id, question_role_snapshot, revealed_hint_count, hint_point_schedule_snapshot, answer_revealed")
    .eq("id", room.current_question_session_id)
    .is("ended_at", null)
    .maybeSingle();
  return session ?? null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code: rawCode } = await params;
  const auth = await requireHostForRoom(request, rawCode);
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });

  const session = await currentQuestion(auth.supabase, auth.room.id);
  if (!session || session.question_role_snapshot !== "qualifier_super") {
    return Response.json({ sessionId: session?.id ?? null, submissions: [] });
  }

  const { data: submissions, error } = await auth.supabase
    .from("special_answer_submissions")
    .select("player_id, answer_text, locked_at, awarded_points, awarded_at")
    .eq("question_session_id", session.id)
    .order("locked_at");
  if (error) {
    console.error("Special answer host lookup failed", error);
    return Response.json({ error: "Could not load locked answers." }, { status: 500 });
  }

  const playerIds = (submissions ?? []).map((item) => item.player_id);
  const { data: players } = playerIds.length
    ? await auth.supabase.from("players").select("id, display_name").in("id", playerIds)
    : { data: [] as { id: string; display_name: string }[] };
  const names = new Map((players ?? []).map((player) => [player.id, player.display_name]));

  return Response.json({
    sessionId: session.id,
    submissions: (submissions ?? []).map((item) => ({
      playerId: item.player_id,
      playerName: names.get(item.player_id) ?? "Player",
      answer: item.answer_text,
      lockedAt: item.locked_at,
      awardedPoints: item.awarded_points,
      awarded: Boolean(item.awarded_at),
    })),
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code: rawCode } = await params;
  const auth = await requireHostForRoom(request, rawCode);
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });

  let body: { action?: unknown; playerId?: unknown; correct?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { data: tournament, error: tournamentError } = await auth.supabase
    .from("tournament_nights")
    .select("id, current_stage, status")
    .eq("room_id", auth.room.id)
    .maybeSingle();
  if (tournamentError || !tournament) return Response.json({ error: "Tournament Night not found." }, { status: 404 });

  let data: unknown = null;
  let error: { message: string } | null = null;

  if (body.action === "score_super") {
    if (typeof body.playerId !== "string" || typeof body.correct !== "boolean") {
      return Response.json({ error: "Player and verdict are required." }, { status: 400 });
    }
    const session = await currentQuestion(auth.supabase, auth.room.id);
    if (!session || session.question_role_snapshot !== "qualifier_super") {
      return Response.json({ error: "The active question is not a Qualifier Super." }, { status: 409 });
    }
    ({ data, error } = await auth.supabase.rpc("award_qualifier_super_atomic", {
      p_question_session_id: session.id,
      p_player_id: body.playerId,
      p_correct: body.correct,
    }));
  } else if (body.action === "team") {
    if (typeof body.correct !== "boolean") return Response.json({ error: "Team verdict is required." }, { status: 400 });
    const session = await currentQuestion(auth.supabase, auth.room.id);
    if (!session || session.question_role_snapshot !== "team") {
      return Response.json({ error: "The active question is not the Team Question." }, { status: 409 });
    }
    ({ data, error } = await auth.supabase.rpc("set_tournament_team_bonus_atomic", {
      p_tournament_id: tournament.id,
      p_correct: body.correct,
    }));
  } else if (body.action === "champion") {
    if (typeof body.playerId !== "string") return Response.json({ error: "Choose the champion." }, { status: 400 });
    const session = await currentQuestion(auth.supabase, auth.room.id);
    if (session) return Response.json({ error: "Finish the current question before locking the champion." }, { status: 409 });
    ({ data, error } = await auth.supabase.rpc("complete_tournament_atomic", {
      p_tournament_id: tournament.id,
      p_champion_player_id: body.playerId,
    }));
  } else if (body.action === "take") {
    ({ data, error } = await auth.supabase.rpc("resolve_double_or_nothing_atomic", {
      p_tournament_id: tournament.id,
      p_risk: false,
      p_correct: null,
    }));
  } else if (body.action === "double_result") {
    if (typeof body.correct !== "boolean") return Response.json({ error: "Double-or-nothing verdict is required." }, { status: 400 });
    const session = await currentQuestion(auth.supabase, auth.room.id);
    if (!session || session.question_role_snapshot !== "double_or_nothing") {
      return Response.json({ error: "Start the Double or Nothing question first." }, { status: 409 });
    }
    ({ data, error } = await auth.supabase.rpc("resolve_double_or_nothing_atomic", {
      p_tournament_id: tournament.id,
      p_risk: true,
      p_correct: body.correct,
    }));
  } else {
    return Response.json({ error: "Unknown tournament special action." }, { status: 400 });
  }

  if (error) {
    const known = error.message.match(/ERR_[A-Z_]+/)?.[0];
    if (known) return Response.json({ error: known }, { status: 409 });
    console.error("Tournament special action failed", body.action, error);
    return Response.json({ error: "Could not complete tournament action." }, { status: 500 });
  }

  await broadcastRoomRefresh(auth.room.code);
  return Response.json({ ok: true, data });
}
