import { describe, expect, it } from "vitest";

import { buildFinalistIds, qualifierSuperPoints, resolveTopTwo } from "./tournament";

describe("resolveTopTwo", () => {
  it("returns the top two directly when the cutoff is clear", () => {
    expect(
      resolveTopTwo([
        { playerId: "a", score: 5, seedOrder: 0 },
        { playerId: "b", score: 3, seedOrder: 1 },
        { playerId: "c", score: 2, seedOrder: 2 },
        { playerId: "d", score: 1, seedOrder: 3 },
      ]),
    ).toEqual({ automaticQualifierIds: ["a", "b"], tieBreakPlayerIds: [], openSlots: 0 });
  });

  it("requires a tiebreak only for the players tied across the cutoff", () => {
    expect(
      resolveTopTwo([
        { playerId: "a", score: 5, seedOrder: 0 },
        { playerId: "b", score: 3, seedOrder: 1 },
        { playerId: "c", score: 3, seedOrder: 2 },
        { playerId: "d", score: 1, seedOrder: 3 },
      ]),
    ).toEqual({ automaticQualifierIds: ["a"], tieBreakPlayerIds: ["b", "c"], openSlots: 1 });
  });

  it("handles a three-way tie for both finalist slots", () => {
    expect(
      resolveTopTwo([
        { playerId: "a", score: 4, seedOrder: 0 },
        { playerId: "b", score: 4, seedOrder: 1 },
        { playerId: "c", score: 4, seedOrder: 2 },
        { playerId: "d", score: 1, seedOrder: 3 },
      ]),
    ).toEqual({ automaticQualifierIds: [], tieBreakPlayerIds: ["a", "b", "c"], openSlots: 2 });
  });

  it("rejects malformed qualifier rosters", () => {
    expect(() => resolveTopTwo([{ playerId: "a", score: 1, seedOrder: 0 }])).toThrow(
      "ERR_QUALIFIER_REQUIRES_FOUR_PLAYERS",
    );
  });
});

describe("buildFinalistIds", () => {
  it("preserves two qualifiers from each group", () => {
    expect(buildFinalistIds(["a1", "a2"], ["b1", "b2"])).toEqual(["a1", "a2", "b1", "b2"]);
  });

  it("rejects duplicate finalists", () => {
    expect(() => buildFinalistIds(["a1", "shared"], ["b1", "shared"])).toThrow(
      "ERR_FINALISTS_MUST_BE_UNIQUE",
    );
  });
});

describe("qualifierSuperPoints", () => {
  it.each([
    [0, 3],
    [1, 2],
    [2, 1],
    [3, 0],
    [4, 0],
  ])("awards %i revealed hints as %i points", (hintCount, expected) => {
    expect(qualifierSuperPoints(hintCount)).toBe(expected);
  });
});
