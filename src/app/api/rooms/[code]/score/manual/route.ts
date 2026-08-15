import { requireHostForRoom } from "@/lib/room-auth";
import { broadcastRoomRefresh } from "@/lib/room-events";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code: rawCode } = await params;
  const auth = await requireHostForRoom(request, rawCode);
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });

  let body: { playerId?: unknown; delta?: unknown; reason?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof body.playerId !== "string" || !Number.isInteger(body.delta)) {
    return Response.json({ error: "Choose a player and an integer score adjustment." }, { status: 400 });
  }
  if (body.reason !== undefined && typeof body.reason !== "string") {
    return Response.json({ error: "Score reason must be text." }, { status: 400 });
  }

  const { data, error } = await auth.supabase.rpc("add_manual_score_atomic", {
    p_room_id: auth.room.id,
    p_player_id: body.playerId,
    p_delta: body.delta as number,
    p_reason: typeof body.reason === "string" ? body.reason.slice(0, 200) : null,
  });

  if (error) {
    if (error.message.includes("ERR_PLAYER_NOT_ELIGIBLE")) {
      return Response.json({ error: "Player is not active in this room." }, { status: 409 });
    }
    console.error("Manual scoring failed", error);
    return Response.json({ error: "Could not adjust score." }, { status: 500 });
  }

  await broadcastRoomRefresh(auth.room.code);
  return Response.json({ eventId: data });
}
