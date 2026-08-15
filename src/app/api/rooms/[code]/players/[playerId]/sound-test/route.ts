import { broadcastRoomMeta } from "@/lib/room-events";
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
    .select("id, display_name, sound_type, sound_key, custom_sound_path, reconnect_token_hash")
    .eq("id", playerId)
    .eq("room_id", room.id)
    .is("removed_at", null)
    .maybeSingle();
  if (!player || !tokenMatches(reconnectToken, player.reconnect_token_hash)) {
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
