import { broadcastRoomRefresh } from "@/lib/room-events";
import { requireHostForRoom } from "@/lib/room-auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code: rawCode } = await params;
  const auth = await requireHostForRoom(request, rawCode);
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });

  let body: { playerId?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (typeof body.playerId !== "string") {
    return Response.json({ error: "Choose a player." }, { status: 400 });
  }

  const { error } = await auth.supabase.rpc("override_buzz_winner_atomic", {
    p_room_id: auth.room.id,
    p_player_id: body.playerId,
  });
  if (error) {
    if (error.message.includes("ERR_PLAYER_NOT_ELIGIBLE")) {
      return Response.json({ error: "Player is not eligible." }, { status: 409 });
    }
    console.error("Winner override failed", error);
    return Response.json({ error: "Could not override winner." }, { status: 500 });
  }

  await broadcastRoomRefresh(auth.room.code);
  return Response.json({ ok: true });
}
