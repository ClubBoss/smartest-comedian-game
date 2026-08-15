import { broadcastRoomRefresh } from "@/lib/room-events";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { tokenMatches } from "@/lib/tokens";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string; playerId: string }> },
) {
  const { code: rawCode, playerId } = await params;
  const code = rawCode.trim().toUpperCase();
  const reconnectToken = request.headers.get("x-player-token");
  if (!reconnectToken) return Response.json({ error: "Missing player token." }, { status: 401 });

  let body: { ready?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (typeof body.ready !== "boolean") {
    return Response.json({ error: "Ready must be true or false." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: room } = await supabase
    .from("rooms")
    .select("id")
    .eq("code", code)
    .is("ended_at", null)
    .maybeSingle();
  if (!room) return Response.json({ error: "Room not found." }, { status: 404 });

  const { data: player } = await supabase
    .from("players")
    .select("id, reconnect_token_hash")
    .eq("id", playerId)
    .eq("room_id", room.id)
    .is("removed_at", null)
    .maybeSingle();
  if (!player || !tokenMatches(reconnectToken, player.reconnect_token_hash)) {
    return Response.json({ error: "Player token is invalid." }, { status: 401 });
  }

  const { error } = await supabase.from("players").update({ is_ready: body.ready }).eq("id", player.id);
  if (error) {
    console.error("Player ready update failed", error);
    return Response.json({ error: "Could not update ready state." }, { status: 500 });
  }

  await broadcastRoomRefresh(code);
  return Response.json({ isReady: body.ready });
}
