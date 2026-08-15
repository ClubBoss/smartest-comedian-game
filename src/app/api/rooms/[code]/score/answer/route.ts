import { requireHostForRoom } from "@/lib/room-auth";
import { broadcastRoomRefresh } from "@/lib/room-events";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code: rawCode } = await params;
  const auth = await requireHostForRoom(request, rawCode);
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });

  let body: { playerId?: unknown; cycleId?: unknown; delta?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (
    typeof body.playerId !== "string" ||
    typeof body.cycleId !== "string" ||
    !Number.isInteger(body.delta) ||
    ![-1, 0, 1].includes(body.delta as number)
  ) {
    return Response.json({ error: "Answer score must be -1, 0 or +1 for the current winner." }, { status: 400 });
  }

  const { data, error } = await auth.supabase.rpc("resolve_answer_score_atomic", {
    p_room_id: auth.room.id,
    p_player_id: body.playerId,
    p_buzz_cycle_id: body.cycleId,
    p_delta: body.delta as number,
  });

  if (error) {
    if (error.message.includes("ERR_CYCLE_ALREADY_SCORED")) {
      return Response.json({ error: "This buzz answer is already scored. Undo it first to correct it." }, { status: 409 });
    }
    if (error.message.includes("ERR_PLAYER_NOT_WINNER") || error.message.includes("ERR_BUZZ_NOT_RESOLVABLE")) {
      return Response.json({ error: "The selected player is not the winner of this buzz cycle." }, { status: 409 });
    }
    console.error("Answer scoring failed", error);
    return Response.json({ error: "Could not score answer." }, { status: 500 });
  }

  await broadcastRoomRefresh(auth.room.code);
  return Response.json({ eventId: data });
}
