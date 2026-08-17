import { randomUUID } from "node:crypto";
import { isBuiltinSoundKey } from "@/domain/sounds";
import { broadcastRoomRefresh } from "@/lib/room-events";
import { resolveSoundUploadFormat } from "@/lib/sound-upload";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { tokenMatches } from "@/lib/tokens";

const MAX_SOUND_BYTES = 1_572_864;

type SoundControlContext = Awaited<ReturnType<typeof authorizeSoundControl>>;

async function authorizeSoundControl(request: Request, rawCode: string, playerId: string) {
  const code = rawCode.trim().toUpperCase();
  const supabase = getSupabaseAdmin();
  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("id, code, host_secret_hash")
    .eq("code", code)
    .is("ended_at", null)
    .maybeSingle();

  if (roomError) {
    console.error("Sound control room lookup failed", roomError);
    return { error: "Could not load room.", status: 500 as const };
  }
  if (!room) return { error: "Room not found.", status: 404 as const };

  const { data: player, error: playerError } = await supabase
    .from("players")
    .select("id, reconnect_token_hash, custom_sound_path")
    .eq("id", playerId)
    .eq("room_id", room.id)
    .is("removed_at", null)
    .maybeSingle();

  if (playerError) {
    console.error("Sound control player lookup failed", playerError);
    return { error: "Could not load player.", status: 500 as const };
  }
  if (!player) return { error: "Player not found.", status: 404 as const };

  const hostToken = request.headers.get("x-host-token");
  const playerToken = request.headers.get("x-player-token");
  const hostAuthorized = Boolean(hostToken && tokenMatches(hostToken, room.host_secret_hash));
  const playerAuthorized = Boolean(playerToken && tokenMatches(playerToken, player.reconnect_token_hash));

  if (!hostAuthorized && !playerAuthorized) {
    return { error: "Sound control token is invalid.", status: 401 as const };
  }

  return { supabase, room, player };
}

function contextError(context: SoundControlContext) {
  return "error" in context
    ? Response.json({ error: context.error }, { status: context.status })
    : null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string; playerId: string }> },
) {
  const { code: rawCode, playerId } = await params;
  const context = await authorizeSoundControl(request, rawCode, playerId);
  const authError = contextError(context);
  if (authError) return authError;
  if ("error" in context) return Response.json({ error: context.error }, { status: context.status });

  const form = await request.formData();
  const file = form.get("sound");
  if (!(file instanceof File)) {
    return Response.json({ error: "Choose an audio file." }, { status: 400 });
  }

  const format = resolveSoundUploadFormat(file.name, file.type);
  if (!format) {
    return Response.json({ error: "Use MP3, WAV, OGG, M4A, or browser-recorded WebM audio." }, { status: 400 });
  }

  if (file.size < 1 || file.size > MAX_SOUND_BYTES) {
    return Response.json({ error: "Custom sound must be at most 1.5 MB." }, { status: 400 });
  }

  const path = `${context.room.id}/${context.player.id}/${randomUUID()}.${format.extension}`;
  const bytes = await file.arrayBuffer();
  const { error: uploadError } = await context.supabase.storage
    .from("buzzer-sounds")
    .upload(path, bytes, { contentType: format.contentType, upsert: false });

  if (uploadError) {
    console.error("Custom sound upload failed", uploadError);
    return Response.json({ error: "Could not upload custom sound." }, { status: 500 });
  }

  const { error: updateError } = await context.supabase
    .from("players")
    .update({
      sound_type: "custom",
      sound_key: null,
      custom_sound_path: path,
      custom_sound_mime_type: format.contentType,
    })
    .eq("id", context.player.id);

  if (updateError) {
    await context.supabase.storage.from("buzzer-sounds").remove([path]);
    console.error("Custom sound player update failed", updateError);
    return Response.json({ error: "Could not activate custom sound." }, { status: 500 });
  }

  if (context.player.custom_sound_path) {
    await context.supabase.storage.from("buzzer-sounds").remove([context.player.custom_sound_path]);
  }

  await broadcastRoomRefresh(context.room.code);
  return Response.json({ soundType: "custom", soundKey: null });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ code: string; playerId: string }> },
) {
  const { code: rawCode, playerId } = await params;
  const context = await authorizeSoundControl(request, rawCode, playerId);
  const authError = contextError(context);
  if (authError) return authError;
  if ("error" in context) return Response.json({ error: context.error }, { status: context.status });

  let body: { soundKey?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof body.soundKey !== "string" || !isBuiltinSoundKey(body.soundKey)) {
    return Response.json({ error: "Choose a valid built-in sound." }, { status: 400 });
  }

  const previousCustomPath = context.player.custom_sound_path;
  const { error: updateError } = await context.supabase
    .from("players")
    .update({
      sound_type: "builtin",
      sound_key: body.soundKey,
      custom_sound_path: null,
      custom_sound_mime_type: null,
    })
    .eq("id", context.player.id);

  if (updateError) {
    if (updateError.code === "23505") {
      return Response.json({ error: "That built-in sound is already assigned to another player." }, { status: 409 });
    }
    console.error("Built-in sound assignment failed", updateError);
    return Response.json({ error: "Could not assign built-in sound." }, { status: 500 });
  }

  if (previousCustomPath) {
    await context.supabase.storage.from("buzzer-sounds").remove([previousCustomPath]);
  }

  await broadcastRoomRefresh(context.room.code);
  return Response.json({ soundType: "builtin", soundKey: body.soundKey });
}
