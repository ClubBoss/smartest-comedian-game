export type LobbyPlayer = {
  id: string;
  displayName: string;
  seatOrder: number;
  soundType: "builtin" | "custom";
  soundKey: string | null;
};

export type LobbyState = {
  code: string;
  capacity: number;
  phase: string;
  playerCount: number;
  players: LobbyPlayer[];
  availableSoundKeys: string[];
};

export type PlayerIdentity = LobbyPlayer & {
  reconnectToken: string;
};
