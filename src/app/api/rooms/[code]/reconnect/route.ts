import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { tokenMatches } from "@/lib/tokens";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code: rawCode } = await params;
  let body: { playerId?: unknown; reconnectToken?: unknown };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof body.playerId !== "string" || typeof body.reconnectToken !== "string") {
    return Response.json({ error: "Missing reconnect credentials." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: room } = await supabase
    .from("rooms")
    .select("id")
    .eq("code", rawCode.trim().toUpperCase())
    .is("ended_at", null)
    .maybeSingle();

  if (!room) return Response.json({ error: "Room not found." }, { status: 404 });

  const { data: player, error } = await supabase
    .from("players")
    .select("id, display_name, seat_order, sound_type, sound_key, reconnect_token_hash")
    .eq("id", body.playerId)
    .eq("room_id", room.id)
    .is("removed_at", null)
    .maybeSingle();

  if (error) {
    console.error("Reconnect lookup failed", error);
    return Response.json({ error: "Could not reconnect." }, { status: 500 });
  }

  if (!player || !tokenMatches(body.reconnectToken, player.reconnect_token_hash)) {
    return Response.json({ error: "Reconnect credentials are no longer valid." }, { status: 401 });
  }

  return Response.json({
    playerId: player.id,
    seatOrder: player.seat_order,
    displayName: player.display_name,
    soundType: player.sound_type,
    soundKey: player.sound_key,
    reconnectToken: body.reconnectToken,
  });
}
