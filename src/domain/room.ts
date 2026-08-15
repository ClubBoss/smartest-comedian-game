export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 10;

export type RoomCapacity = number;

export function isValidRoomCapacity(value: number): value is RoomCapacity {
  return Number.isInteger(value) && value >= MIN_PLAYERS && value <= MAX_PLAYERS;
}

export function assertRoomCapacity(value: number): RoomCapacity {
  if (!isValidRoomCapacity(value)) {
    throw new RangeError(
      `Room capacity must be an integer between ${MIN_PLAYERS} and ${MAX_PLAYERS}.`,
    );
  }

  return value;
}
