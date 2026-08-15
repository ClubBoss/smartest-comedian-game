import { BUILTIN_SOUNDS } from "@/domain/sounds";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code: rawCode } = await params;
  const code = rawCode.trim().toUpperCase();
  const supabase = getSupabaseAdmin();

  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("id, code, capacity, phase")
    .eq("code", code)
    .is("ended_at", null)
    .maybeSingle();

  if (roomError) {
    console.error("Room lookup failed", roomError);
    return Response.json({ error: "Could not load room." }, { status: 500 });
  }

  if (!room) {
    return Response.json({ error: "Room not found." }, { status: 404 });
  }

  const { data: players, error: playersError } = await supabase
    .from("players")
    .select("id, display_name, sound_type, sound_key, seat_order")
    .eq("room_id", room.id)
    .is("removed_at", null)
    .order("seat_order", { ascending: true });

  if (playersError) {
    console.error("Player lookup failed", playersError);
    return Response.json({ error: "Could not load players." }, { status: 500 });
  }

  const usedSoundKeys = new Set(
    (players ?? [])
      .filter((player) => player.sound_type === "builtin")
      .map((player) => player.sound_key)
      .filter((value): value is string => Boolean(value)),
  );

  return Response.json({
    code: room.code,
    capacity: room.capacity,
    phase: room.phase,
    playerCount: players?.length ?? 0,
    players: (players ?? []).map((player) => ({
      id: player.id,
      displayName: player.display_name,
      soundType: player.sound_type,
      soundKey: player.sound_key,
      seatOrder: player.seat_order,
    })),
    availableSoundKeys: BUILTIN_SOUNDS.map((sound) => sound.key).filter(
      (key) => !usedSoundKeys.has(key),
    ),
  });
}
