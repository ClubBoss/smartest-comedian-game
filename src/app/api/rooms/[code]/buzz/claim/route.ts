import { broadcastRoomRefresh } from "@/lib/room-events";
import { requirePlayerForRoom } from "@/lib/room-auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code: rawCode } = await params;
  let body: { playerId?: unknown; cycleId?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (typeof body.playerId !== "string" || typeof body.cycleId !== "string") {
    return Response.json({ error: "Missing buzzer credentials." }, { status: 400 });
  }

  const auth = await requirePlayerForRoom(request, rawCode, body.playerId);
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });
  if (auth.room.active_buzz_cycle_id !== body.cycleId) {
    return Response.json({ error: "Buzzer cycle is no longer active." }, { status: 409 });
  }

  const { data, error } = await auth.supabase.rpc("claim_buzz_atomic", {
    p_cycle_id: body.cycleId,
    p_player_id: body.playerId,
  });

  if (error) {
    if (error.message.includes("ERR_STALE_CYCLE")) {
      return Response.json({ error: "Buzzer cycle is no longer active." }, { status: 409 });
    }
    if (error.message.includes("ERR_TOURNAMENT_PLAYER_INACTIVE")) {
      return Response.json({ error: "Your tournament group is not active right now." }, { status: 409 });
    }
    if (error.message.includes("ERR_PLAYER_NOT_ELIGIBLE")) {
      return Response.json({ error: "You are not eligible to buzz in this room." }, { status: 409 });
    }
    console.error("Buzz claim failed", error);
    return Response.json({ error: "Could not submit buzz." }, { status: 500 });
  }

  const result = Array.isArray(data) ? data[0] : data;
  await broadcastRoomRefresh(auth.room.code);
  return Response.json({
    accepted: Boolean(result?.accepted),
    winnerId: result?.winner_player_id ?? null,
  });
}
