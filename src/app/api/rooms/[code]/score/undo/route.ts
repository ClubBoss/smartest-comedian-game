import { requireHostForRoom } from "@/lib/room-auth";
import { broadcastRoomRefresh } from "@/lib/room-events";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code: rawCode } = await params;
  const auth = await requireHostForRoom(request, rawCode);
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });

  const { data, error } = await auth.supabase.rpc("undo_latest_score_atomic", {
    p_room_id: auth.room.id,
  });

  if (error) {
    if (error.message.includes("ERR_NO_SCORE_TO_UNDO")) {
      return Response.json({ error: "There is no active score event to undo." }, { status: 409 });
    }
    console.error("Score undo failed", error);
    return Response.json({ error: "Could not undo score." }, { status: 500 });
  }

  const result = Array.isArray(data) ? data[0] : data;
  await broadcastRoomRefresh(auth.room.code);
  return Response.json({
    eventId: result?.revert_event_id ?? null,
    revertedEventId: result?.reverted_event_id ?? null,
  });
}
