import { broadcastRoomRefresh } from "@/lib/room-events";
import { requireHostForRoom } from "@/lib/room-auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code: rawCode } = await params;
  const auth = await requireHostForRoom(request, rawCode);
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });

  const { data, error } = await auth.supabase.rpc("open_buzz_cycle_atomic", {
    p_room_id: auth.room.id,
  });

  if (error) {
    if (error.message.includes("ERR_NOT_ENOUGH_PLAYERS")) {
      return Response.json({ error: "At least two players are required." }, { status: 409 });
    }
    if (error.message.includes("ERR_STIMULUS_HIDDEN")) {
      return Response.json({ error: "ERR_STIMULUS_HIDDEN" }, { status: 409 });
    }
    if (error.message.includes("ERR_QUESTION_ROLE_NO_BUZZ")) {
      return Response.json({ error: "This special question does not use the buzzer. Follow the host note shown with the question." }, { status: 409 });
    }
    console.error("Open buzzer failed", error);
    return Response.json({ error: "Could not open buzzer." }, { status: 500 });
  }

  await broadcastRoomRefresh(auth.room.code);
  return Response.json({ cycleId: data });
}
