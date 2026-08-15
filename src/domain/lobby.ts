export type LobbyPlayer = {
  id: string;
  displayName: string;
  seatOrder: number;
  soundType: "builtin" | "custom";
  soundKey: string | null;
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
};

export type LobbyState = {
  code: string;
  capacity: number;
  phase: string;
  playerCount: number;
  players: LobbyPlayer[];
  availableSoundKeys: string[];
  buzz: BuzzState | null;
};

export type PlayerIdentity = LobbyPlayer & {
  reconnectToken: string;
};
