export type LobbyPlayer = {
  id: string;
  displayName: string;
  seatOrder: number;
  soundType: "builtin" | "custom";
  soundKey: string | null;
  score: number;
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

export type LobbyState = {
  code: string;
  capacity: number;
  phase: string;
  playerCount: number;
  players: LobbyPlayer[];
  availableSoundKeys: string[];
  buzz: BuzzState | null;
  canUndoScore: boolean;
};

export type PlayerIdentity = Omit<LobbyPlayer, "score"> & {
  reconnectToken: string;
};
