import { BUILTIN_SOUNDS } from "@/domain/sounds";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type SnapshotAsset = {
  storage_path?: string;
  mime_type?: string;
  alt_text?: string | null;
  caption?: string | null;
  width?: number | null;
  height?: number | null;
};

type TournamentScoreRow = {
  stage: "qualifier_a" | "qualifier_b" | "final";
  player_id: string;
  seed_order: number;
  qualified_at: string | null;
  score: number;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code: rawCode } = await params;
  const code = rawCode.trim().toUpperCase();
  const supabase = getSupabaseAdmin();

  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("id, code, capacity, phase, active_buzz_cycle_id, current_question_session_id")
    .eq("code", code)
    .is("ended_at", null)
    .maybeSingle();

  if (roomError) {
    console.error("Room lookup failed", roomError);
    return Response.json({ error: "Could not load room." }, { status: 500 });
  }
  if (!room) return Response.json({ error: "Room not found." }, { status: 404 });

  const [
    { data: players, error: playersError },
    { data: scoreEvents, error: scoresError },
    { data: tournament, error: tournamentError },
  ] = await Promise.all([
    supabase
      .from("players")
      .select("id, display_name, sound_type, sound_key, custom_sound_path, seat_order, is_ready")
      .eq("room_id", room.id)
      .is("removed_at", null)
      .order("seat_order", { ascending: true }),
    supabase
      .from("score_events")
      .select("id, player_id, buzz_cycle_id, kind, delta, reverted_event_id")
      .eq("room_id", room.id),
    supabase
      .from("tournament_nights")
      .select("id, format, current_stage, status, base_prize, team_bonus, champion_player_id, final_payout, double_resolved, double_attempted, double_correct")
      .eq("room_id", room.id)
      .maybeSingle(),
  ]);

  if (playersError || scoresError || tournamentError) {
    console.error("Room relation lookup failed", playersError ?? scoresError ?? tournamentError);
    return Response.json({ error: "Could not load room state." }, { status: 500 });
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

  const activeTournamentScoreByPlayer = new Map<string, number>();
  let tournamentState = null;
  if (tournament) {
    const { data: stageScores, error: stageScoresError } = await supabase
      .from("tournament_stage_scores")
      .select("stage, player_id, seed_order, qualified_at, score")
      .eq("tournament_id", tournament.id);

    if (stageScoresError) {
      console.error("Tournament score lookup failed", stageScoresError);
      return Response.json({ error: "Could not load game state." }, { status: 500 });
    }

    const members = ((stageScores ?? []) as TournamentScoreRow[])
      .map((row) => ({
        playerId: row.player_id,
        stage: row.stage,
        seedOrder: row.seed_order,
        qualified: Boolean(row.qualified_at),
        score: Number(row.score ?? 0),
      }))
      .sort((left, right) => left.stage.localeCompare(right.stage) || left.seedOrder - right.seedOrder);
    const activePlayerIds = tournament.current_stage === "complete"
      ? []
      : members
        .filter((member) => member.stage === tournament.current_stage)
        .sort((left, right) => left.seedOrder - right.seedOrder)
        .map((member) => member.playerId);

    if (tournament.current_stage !== "complete") {
      for (const member of members) {
        if (member.stage === tournament.current_stage) activeTournamentScoreByPlayer.set(member.playerId, member.score);
      }
    }

    tournamentState = {
      id: tournament.id,
      format: tournament.format,
      currentStage: tournament.current_stage,
      status: tournament.status,
      basePrize: tournament.base_prize,
      teamBonus: tournament.team_bonus,
      currentPrize: tournament.base_prize + tournament.team_bonus,
      championPlayerId: tournament.champion_player_id,
      finalPayout: tournament.final_payout,
      doubleResolved: Boolean(tournament.double_resolved),
      doubleAttempted: Boolean(tournament.double_attempted),
      doubleCorrect: tournament.double_correct,
      activePlayerIds,
      members,
    };
  }

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
        (event) => event.kind === "answer" && event.buzz_cycle_id === cycle.id && !revertedIds.has(event.id),
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

  let question = null;
  if (room.current_question_session_id) {
    const { data: session, error: sessionError } = await supabase
      .from("question_sessions")
      .select("id, prompt_snapshot, answer_snapshot, explanation_snapshot, hints_snapshot, assets_snapshot, stimulus_revealed, revealed_hint_count, answer_revealed, ended_at, question_role_snapshot, correct_points_snapshot, wrong_points_snapshot")
      .eq("id", room.current_question_session_id)
      .maybeSingle();
    if (sessionError) {
      console.error("Public question lookup failed", sessionError);
      return Response.json({ error: "Could not load question state." }, { status: 500 });
    }

    if (session && !session.ended_at) {
      const allHints = Array.isArray(session.hints_snapshot)
        ? session.hints_snapshot.filter((hint): hint is string => typeof hint === "string")
        : [];
      const rawAssets = session.stimulus_revealed && Array.isArray(session.assets_snapshot)
        ? (session.assets_snapshot as SnapshotAsset[])
        : [];
      const assets = await Promise.all(rawAssets.map(async (asset) => {
        let url: string | null = null;
        if (asset.storage_path) {
          const { data } = await supabase.storage
            .from("question-images")
            .createSignedUrl(asset.storage_path, 600);
          url = data?.signedUrl ?? null;
        }
        return {
          storagePath: asset.storage_path ?? "",
          mimeType: asset.mime_type ?? null,
          altText: asset.alt_text ?? null,
          caption: asset.caption ?? null,
          width: asset.width ?? null,
          height: asset.height ?? null,
          url,
        };
      }));

      question = {
        sessionId: session.id,
        stimulusRevealed: session.stimulus_revealed,
        prompt: session.stimulus_revealed ? session.prompt_snapshot : null,
        assets,
        revealedHints: session.stimulus_revealed ? allHints.slice(0, session.revealed_hint_count) : [],
        answerRevealed: session.answer_revealed,
        answer: session.answer_revealed ? session.answer_snapshot : null,
        explanation: session.answer_revealed ? session.explanation_snapshot : null,
        role: session.question_role_snapshot ?? "regular",
        correctPoints: session.correct_points_snapshot,
        wrongPoints: session.wrong_points_snapshot,
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
      score: activeTournamentScoreByPlayer.get(player.id) ?? scoreByPlayer.get(player.id) ?? 0,
      isReady: player.is_ready,
    })),
    availableSoundKeys: BUILTIN_SOUNDS.map((sound) => sound.key).filter((key) => !usedSoundKeys.has(key)),
    buzz,
    canUndoScore,
    question,
    tournament: tournamentState,
  });
}
