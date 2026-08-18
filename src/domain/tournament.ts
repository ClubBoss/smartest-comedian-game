export const TOURNAMENT_FORMAT = "league_8_v1" as const;

export const TOURNAMENT_STAGES = ["qualifier_a", "qualifier_b", "final"] as const;

export type TournamentStage = (typeof TOURNAMENT_STAGES)[number];

export type StageScore = {
  playerId: string;
  score: number;
  seedOrder: number;
};

export type QualifierResolution = {
  automaticQualifierIds: string[];
  tieBreakPlayerIds: string[];
  openSlots: number;
};

export function resolveTopTwo(scores: StageScore[]): QualifierResolution {
  if (scores.length !== 4) {
    throw new Error("ERR_QUALIFIER_REQUIRES_FOUR_PLAYERS");
  }

  const uniquePlayers = new Set(scores.map((entry) => entry.playerId));
  if (uniquePlayers.size !== scores.length) {
    throw new Error("ERR_DUPLICATE_PLAYER");
  }

  const ordered = [...scores].sort(
    (left, right) => right.score - left.score || left.seedOrder - right.seedOrder,
  );
  const cutoffScore = ordered[1].score;
  const automaticQualifierIds = ordered
    .filter((entry) => entry.score > cutoffScore)
    .map((entry) => entry.playerId);
  const tieBreakPlayerIds = ordered
    .filter((entry) => entry.score === cutoffScore)
    .map((entry) => entry.playerId);
  const openSlots = 2 - automaticQualifierIds.length;

  if (tieBreakPlayerIds.length === openSlots) {
    return {
      automaticQualifierIds: [...automaticQualifierIds, ...tieBreakPlayerIds],
      tieBreakPlayerIds: [],
      openSlots: 0,
    };
  }

  return { automaticQualifierIds, tieBreakPlayerIds, openSlots };
}

export function buildFinalistIds(groupAQualifierIds: string[], groupBQualifierIds: string[]): string[] {
  if (groupAQualifierIds.length !== 2 || groupBQualifierIds.length !== 2) {
    throw new Error("ERR_FINAL_REQUIRES_TWO_FROM_EACH_GROUP");
  }

  const finalists = [...groupAQualifierIds, ...groupBQualifierIds];
  if (new Set(finalists).size !== 4) {
    throw new Error("ERR_FINALISTS_MUST_BE_UNIQUE");
  }

  return finalists;
}

export function qualifierSuperPoints(revealedHintCount: number): number {
  if (!Number.isInteger(revealedHintCount) || revealedHintCount < 0) {
    throw new Error("ERR_INVALID_HINT_COUNT");
  }

  return Math.max(0, 3 - revealedHintCount);
}
