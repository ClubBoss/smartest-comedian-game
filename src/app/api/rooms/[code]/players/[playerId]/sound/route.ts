import { randomUUID } from "node:crypto";
import { broadcastRoomRefresh } from "@/lib/room-events";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { tokenMatches } from "@/lib/tokens";

const MAX_SOUND_BYTES = 1_572_864;
const ALLOWED_TYPES = new Map([
  ["audio/mpeg", "mp3"],
  ["audio/wav", "wav"],
  ["audio/x-wav", "wav"],
  ["audio/ogg", "ogg"],
  ["audio/mp4", "m4a"],
]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string; playerId: string }> },
) {
  const { code: rawCode, playerId } = await params;
  const code = rawCode.trim().toUpperCase();
  const reconnectToken = request.headers.get("x-player-token");
  if (!reconnectToken) {
    return Response.json({ error: "Missing player token." }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("sound");
  if (!(file instanceof File)) {
    return Response.json({ error: "Choose an audio file." }, { status: 400 });
  }

  const extension = ALLOWED_TYPES.get(file.type);
  if (!extension) {
    return Response.json({ error: "Use MP3, WAV, OGG, or M4A audio." }, { status: 400 });
  }

  if (file.size < 1 || file.size > MAX_SOUND_BYTES) {
    return Response.json({ error: "Custom sound must be at most 1.5 MB." }, { status: 400 });
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
    .select("id, reconnect_token_hash, custom_sound_path")
    .eq("id", playerId)
    .eq("room_id", room.id)
    .is("removed_at", null)
    .maybeSingle();

  if (!player || !tokenMatches(reconnectToken, player.reconnect_token_hash)) {
    return Response.json({ error: "Player token is invalid." }, { status: 401 });
  }

  const path = `${room.id}/${player.id}/${randomUUID()}.${extension}`;
  const bytes = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from("buzzer-sounds")
    .upload(path, bytes, { contentType: file.type, upsert: false });

  if (uploadError) {
    console.error("Custom sound upload failed", uploadError);
    return Response.json({ error: "Could not upload custom sound." }, { status: 500 });
  }

  const { error: updateError } = await supabase
    .from("players")
    .update({
      sound_type: "custom",
      sound_key: null,
      custom_sound_path: path,
      custom_sound_mime_type: file.type,
    })
    .eq("id", player.id);

  if (updateError) {
    await supabase.storage.from("buzzer-sounds").remove([path]);
    console.error("Custom sound player update failed", updateError);
    return Response.json({ error: "Could not activate custom sound." }, { status: 500 });
  }

  if (player.custom_sound_path) {
    await supabase.storage.from("buzzer-sounds").remove([player.custom_sound_path]);
  }

  await broadcastRoomRefresh(code);
  return Response.json({ soundType: "custom", soundKey: null });
}
