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
    .select("id, code, capacity, phase, active_buzz_cycle_id")
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

  const [{ data: players, error: playersError }, { data: scoreEvents, error: scoresError }] = await Promise.all([
    supabase
      .from("players")
      .select("id, display_name, sound_type, sound_key, custom_sound_path, seat_order")
      .eq("room_id", room.id)
      .is("removed_at", null)
      .order("seat_order", { ascending: true }),
    supabase
      .from("score_events")
      .select("id, player_id, buzz_cycle_id, kind, delta, reverted_event_id")
      .eq("room_id", room.id),
  ]);

  if (playersError) {
    console.error("Player lookup failed", playersError);
    return Response.json({ error: "Could not load players." }, { status: 500 });
  }
  if (scoresError) {
    console.error("Score lookup failed", scoresError);
    return Response.json({ error: "Could not load scores." }, { status: 500 });
  }

  const activePlayers = players ?? [];
  const events = scoreEvents ?? [];
  const scoreByPlayer = new Map<string, number>();
  for (const event of events) {
    scoreByPlayer.set(event.player_id, (scoreByPlayer.get(event.player_id) ?? 0) + event.delta);
  }
  const revertedIds = new Set(
    events.map((event) => event.reverted_event_id).filter((value): value is string => Boolean(value)),
  );
  const canUndoScore = events.some(
    (event) => (event.kind === "answer" || event.kind === "manual") && !revertedIds.has(event.id),
  );

  const usedSoundKeys = new Set(
    activePlayers
      .filter((player) => player.sound_type === "builtin")
      .map((player) => player.sound_key)
      .filter((value): value is string => Boolean(value)),
  );

  let buzz = null;
  if (room.active_buzz_cycle_id) {
    const { data: cycle, error: cycleError } = await supabase
      .from("buzz_cycles")
      .select("id, winner_player_id, winner_source, closed_at")
      .eq("id", room.active_buzz_cycle_id)
      .maybeSingle();

    if (cycleError) {
      console.error("Buzz cycle lookup failed", cycleError);
      return Response.json({ error: "Could not load buzzer state." }, { status: 500 });
    }

    if (cycle) {
      const winner = cycle.winner_player_id
        ? activePlayers.find((player) => player.id === cycle.winner_player_id) ?? null
        : null;
      let winnerSoundUrl: string | null = null;
      if (winner?.sound_type === "custom" && winner.custom_sound_path) {
        const { data: signed } = await supabase.storage
          .from("buzzer-sounds")
          .createSignedUrl(winner.custom_sound_path, 120);
        winnerSoundUrl = signed?.signedUrl ?? null;
      }
      const activeAnswer = events.find(
        (event) =>
          event.kind === "answer" &&
          event.buzz_cycle_id === cycle.id &&
          !revertedIds.has(event.id),
      );

      buzz = {
        cycleId: cycle.id,
        status: cycle.winner_player_id ? "locked" : cycle.closed_at ? "closed" : "open",
        winnerId: cycle.winner_player_id,
        winnerName: winner?.display_name ?? null,
        winnerSource: cycle.winner_source,
        winnerSoundType: winner?.sound_type ?? null,
        winnerSoundKey: winner?.sound_key ?? null,
        winnerSoundUrl,
        scoreResolved: Boolean(activeAnswer),
        scoreDelta: activeAnswer?.delta ?? null,
      };
    }
  }

  return Response.json({
    code: room.code,
    capacity: room.capacity,
    phase: room.phase,
    playerCount: activePlayers.length,
    players: activePlayers.map((player) => ({
      id: player.id,
      displayName: player.display_name,
      soundType: player.sound_type,
      soundKey: player.sound_key,
      seatOrder: player.seat_order,
      score: scoreByPlayer.get(player.id) ?? 0,
    })),
    availableSoundKeys: BUILTIN_SOUNDS.map((sound) => sound.key).filter(
      (key) => !usedSoundKeys.has(key),
    ),
    buzz,
    canUndoScore,
  });
}
