import { getSupabaseAdmin } from "./supabase-admin";
import { tokenMatches } from "./tokens";

export async function requireHostForRoom(request: Request, rawCode: string) {
  const hostToken = request.headers.get("x-host-token");
  if (!hostToken) return { error: "Missing host token.", status: 401 as const };

  const supabase = getSupabaseAdmin();
  const code = rawCode.trim().toUpperCase();
  const { data: room, error } = await supabase
    .from("rooms")
    .select("id, code, host_secret_hash, active_buzz_cycle_id")
    .eq("code", code)
    .is("ended_at", null)
    .maybeSingle();

  if (error) {
    console.error("Host room lookup failed", error);
    return { error: "Could not load room.", status: 500 as const };
  }
  if (!room) return { error: "Room not found.", status: 404 as const };
  if (!tokenMatches(hostToken, room.host_secret_hash)) {
    return { error: "Host token is invalid.", status: 401 as const };
  }

  return { supabase, room };
}

export async function requirePlayerForRoom(
  request: Request,
  rawCode: string,
  playerId: string,
) {
  const playerToken = request.headers.get("x-player-token");
  if (!playerToken) return { error: "Missing player token.", status: 401 as const };

  const supabase = getSupabaseAdmin();
  const code = rawCode.trim().toUpperCase();
  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("id, code, active_buzz_cycle_id")
    .eq("code", code)
    .is("ended_at", null)
    .maybeSingle();

  if (roomError) {
    console.error("Player room lookup failed", roomError);
    return { error: "Could not load room.", status: 500 as const };
  }
  if (!room) return { error: "Room not found.", status: 404 as const };

  const { data: player, error: playerError } = await supabase
    .from("players")
    .select("id, reconnect_token_hash")
    .eq("id", playerId)
    .eq("room_id", room.id)
    .is("removed_at", null)
    .maybeSingle();

  if (playerError) {
    console.error("Player lookup failed", playerError);
    return { error: "Could not load player.", status: 500 as const };
  }
  if (!player || !tokenMatches(playerToken, player.reconnect_token_hash)) {
    return { error: "Player token is invalid.", status: 401 as const };
  }

  return { supabase, room, player };
}
