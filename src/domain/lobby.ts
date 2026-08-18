export type LobbyPlayer = {
  id: string;
  displayName: string;
  seatOrder: number;
  soundType: "builtin" | "custom";
  soundKey: string | null;
  score: number;
  isReady: boolean;
};

export type BuzzState = {
  cycleId: string;
  status: "open" | "locked" | "closed";
  winnerId: string | null;
  winnerName: string | null;
  winnerSource: "buzz" | "host" | null;
  winnerSoundType: "builtin" | "custom" | null;
  winnerSoundKey: string | null;
  winnerSoundUrl: string | null;
  scoreResolved: boolean;
  scoreDelta: number | null;
};

export type PublicQuestionAsset = {
  storagePath: string;
  mimeType: string | null;
  altText: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
  url: string | null;
};

export type TournamentQuestionRole = "regular" | "qualifier_super" | "team" | "last" | "double_or_nothing" | "tiebreak";

export type PublicQuestionState = {
  sessionId: string;
  stimulusRevealed: boolean;
  prompt: string | null;
  assets: PublicQuestionAsset[];
  revealedHints: string[];
  revealedHintCount: number;
  answerRevealed: boolean;
  answer: string | null;
  explanation: string | null;
  tournamentStage: "qualifier_a" | "qualifier_b" | "final" | null;
  tournamentRole: TournamentQuestionRole;
  correctPoints: number | null;
  wrongPoints: number | null;
  hintPointSchedule: number[];
};

export type TournamentStage = "qualifier_a" | "qualifier_b" | "final" | "complete";

export type TournamentMemberState = {
  playerId: string;
  stage: Exclude<TournamentStage, "complete">;
  seedOrder: number;
  qualified: boolean;
  score: number;
};

export type TournamentPublicState = {
  id: string;
  format: "league_8_v1";
  currentStage: TournamentStage;
  status: "active" | "completed";
  basePrize: number;
  teamBonus: number;
  currentPrize: number;
  championPlayerId: string | null;
  finalPayout: number | null;
  doubleAttempted: boolean;
  doubleCorrect: boolean | null;
  doubleResolved: boolean;
  activePlayerIds: string[];
  members: TournamentMemberState[];
};

export type LobbyState = {
  code: string;
  capacity: number;
  phase: string;
  playerCount: number;
  players: LobbyPlayer[];
  availableSoundKeys: string[];
  buzz: BuzzState | null;
  canUndoScore: boolean;
  question: PublicQuestionState | null;
  tournament: TournamentPublicState | null;
};

export type PlayerIdentity = Omit<LobbyPlayer, "score" | "isReady"> & {
  reconnectToken: string;
};
