import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

const ROOM_CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function createOpaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function tokenMatches(token: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashToken(token), "hex");
  const expected = Buffer.from(expectedHash, "hex");

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function createRoomCode(length = 6): string {
  return Array.from({ length }, () =>
    ROOM_CODE_ALPHABET[randomInt(ROOM_CODE_ALPHABET.length)],
  ).join("");
}
