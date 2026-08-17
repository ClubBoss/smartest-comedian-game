import { requireHostForRoom } from "@/lib/room-auth";
import { broadcastRoomMeta } from "@/lib/room-events";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { tokenMatches } from "@/lib/tokens";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string; playerId: string }> },
) {
  const { code: rawCode, playerId } = await params;
  const code = rawCode.trim().toUpperCase();
  const hostToken = request.headers.get("x-host-token");
  const reconnectToken = request.headers.get("x-player-token");
  const supabase = getSupabaseAdmin();

  let roomId: string;
  if (hostToken) {
    const auth = await requireHostForRoom(request, code);
    if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });
    roomId = auth.room.id;
  } else {
    if (!reconnectToken) return Response.json({ error: "Missing sound-test token." }, { status: 401 });
    const { data: room } = await supabase
      .from("rooms")
      .select("id")
      .eq("code", code)
      .is("ended_at", null)
      .maybeSingle();
    if (!room) return Response.json({ error: "Room not found." }, { status: 404 });
    roomId = room.id;
  }

  const { data: player } = await supabase
    .from("players")
    .select("id, display_name, sound_type, sound_key, custom_sound_path, reconnect_token_hash")
    .eq("id", playerId)
    .eq("room_id", roomId)
    .is("removed_at", null)
    .maybeSingle();

  if (!player) return Response.json({ error: "Player not found." }, { status: 404 });
  if (!hostToken && (!reconnectToken || !tokenMatches(reconnectToken, player.reconnect_token_hash))) {
    return Response.json({ error: "Player token is invalid." }, { status: 401 });
  }

  let soundUrl: string | null = null;
  if (player.sound_type === "custom" && player.custom_sound_path) {
    const { data } = await supabase.storage.from("buzzer-sounds").createSignedUrl(player.custom_sound_path, 120);
    soundUrl = data?.signedUrl ?? null;
  }

  const payload = {
    playerId: player.id,
    displayName: player.display_name,
    soundType: player.sound_type,
    soundKey: player.sound_key,
    soundUrl,
  };
  await broadcastRoomMeta(code, "sound_test", payload);
  return Response.json({ ok: true });
}
