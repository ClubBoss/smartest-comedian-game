import { describe, expect, it } from "vitest";
import { assertRoomCapacity, isValidRoomCapacity } from "./room";

describe("room capacity", () => {
  it("accepts the lower boundary", () => {
    expect(isValidRoomCapacity(2)).toBe(true);
    expect(assertRoomCapacity(2)).toBe(2);
  });

  it("accepts the upper boundary", () => {
    expect(isValidRoomCapacity(10)).toBe(true);
    expect(assertRoomCapacity(10)).toBe(10);
  });

  it("rejects one player", () => {
    expect(isValidRoomCapacity(1)).toBe(false);
    expect(() => assertRoomCapacity(1)).toThrow(RangeError);
  });

  it("rejects eleven players", () => {
    expect(isValidRoomCapacity(11)).toBe(false);
    expect(() => assertRoomCapacity(11)).toThrow(RangeError);
  });

  it("rejects non-integer capacity", () => {
    expect(isValidRoomCapacity(4.5)).toBe(false);
  });
});
