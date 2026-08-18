import { broadcastRoomRefresh } from "@/lib/room-events";
import { requirePlayerForRoom } from "@/lib/room-auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code: rawCode } = await params;
  let body: { playerId?: unknown; sessionId?: unknown; answer?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof body.playerId !== "string" || typeof body.sessionId !== "string" || typeof body.answer !== "string") {
    return Response.json({ error: "Answer, player and question are required." }, { status: 400 });
  }

  const auth = await requirePlayerForRoom(request, rawCode, body.playerId);
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });

  const { data, error } = await auth.supabase.rpc("submit_special_answer_atomic", {
    p_question_session_id: body.sessionId,
    p_player_id: body.playerId,
    p_answer_text: body.answer,
  });

  if (error) {
    const message = error.message.includes("ERR_SPECIAL_ANSWER_ALREADY_LOCKED")
      ? "Your answer is already locked."
      : error.message.includes("ERR_TOURNAMENT_PLAYER_INACTIVE")
        ? "Your group is not playing this question."
        : error.message.includes("ERR_SPECIAL_ANSWER_ROLE")
          ? "This question does not use written answers."
          : error.message.includes("ERR_SPECIAL_ANSWER_INVALID")
            ? "Write a short answer before locking it."
            : null;
    if (message) return Response.json({ error: message }, { status: 409 });
    console.error("Special answer submission failed", error);
    return Response.json({ error: "Could not lock your answer." }, { status: 500 });
  }

  await broadcastRoomRefresh(auth.room.code);
  return Response.json({ lockedAt: data });
}
