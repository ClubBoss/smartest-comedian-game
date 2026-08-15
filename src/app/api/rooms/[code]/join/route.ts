import { isBuiltinSoundKey } from "@/domain/sounds";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { createOpaqueToken, hashToken } from "@/lib/tokens";

function statusForJoinError(message: string): number {
  if (message.includes("ERR_ROOM_NOT_FOUND")) return 404;
  if (message.includes("ERR_ROOM_FULL") || message.includes("ERR_SOUND_TAKEN")) return 409;
  if (message.includes("ERR_INVALID_NAME")) return 400;
  return 500;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code: rawCode } = await params;
  let body: { displayName?: unknown; soundKey?: unknown };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
  const soundKey = typeof body.soundKey === "string" ? body.soundKey : "";

  if (displayName.length < 1 || displayName.length > 40) {
    return Response.json({ error: "Name must contain 1 to 40 characters." }, { status: 400 });
  }

  if (!isBuiltinSoundKey(soundKey)) {
    return Response.json({ error: "Choose an available buzzer sound." }, { status: 400 });
  }

  const reconnectToken = createOpaqueToken();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc("join_room_atomic", {
    p_code: rawCode.trim().toUpperCase(),
    p_display_name: displayName,
    p_sound_key: soundKey,
    p_reconnect_token_hash: hashToken(reconnectToken),
  });

  if (error) {
    const status = statusForJoinError(error.message);
    if (status === 500) console.error("Join failed", error);
    const friendly = status === 404
      ? "Room not found."
      : error.message.includes("ERR_ROOM_FULL")
        ? "Room is full."
        : error.message.includes("ERR_SOUND_TAKEN")
          ? "That sound was just taken. Choose another one."
          : status === 400
            ? "Invalid player name."
            : "Could not join room.";
    return Response.json({ error: friendly }, { status });
  }

  const joined = Array.isArray(data) ? data[0] : data;
  if (!joined) {
    return Response.json({ error: "Could not join room." }, { status: 500 });
  }

  return Response.json({
    playerId: joined.player_id,
    seatOrder: joined.seat_number,
    displayName,
    soundType: "builtin",
    soundKey,
    reconnectToken,
  });
}
