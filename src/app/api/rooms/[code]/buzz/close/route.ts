import { broadcastRoomRefresh } from "@/lib/room-events";
import { requireHostForRoom } from "@/lib/room-auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code: rawCode } = await params;
  const auth = await requireHostForRoom(request, rawCode);
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });

  const { error } = await auth.supabase.rpc("close_buzz_cycle_atomic", {
    p_room_id: auth.room.id,
  });
  if (error) {
    console.error("Close buzzer failed", error);
    return Response.json({ error: "Could not close buzzer." }, { status: 500 });
  }

  await broadcastRoomRefresh(auth.room.code);
  return Response.json({ ok: true });
}
