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

export type PublicQuestionState = {
  sessionId: string;
  stimulusRevealed: boolean;
  prompt: string | null;
  assets: PublicQuestionAsset[];
  revealedHints: string[];
  answerRevealed: boolean;
  answer: string | null;
  explanation: string | null;
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
};

export type PlayerIdentity = Omit<LobbyPlayer, "score" | "isReady"> & {
  reconnectToken: string;
};
