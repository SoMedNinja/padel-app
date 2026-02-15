import { describe, expect, it } from "vitest";
import { GUEST_ID } from "./guest";
import { makeNameToIdMap, resolveTeamIds } from "./profileMap";

describe("profileMap guest resolution", () => {
  it("maps legacy guest spellings to guest id in history name fallback", () => {
    const nameToIdMap = makeNameToIdMap([
      { id: "p1", name: "Anna" },
      { id: "p2", name: "Bosse" },
    ]);

    // Note for non-coders: old saved matches may only have names (no IDs),
    // so this test verifies that variants of "gäst" still become the same guest player id.
    expect(resolveTeamIds(undefined, ["gäst"], nameToIdMap)).toEqual([GUEST_ID]);
    expect(resolveTeamIds(undefined, ["Gästspelare"], nameToIdMap)).toEqual([GUEST_ID]);
    expect(resolveTeamIds(undefined, ["guest"], nameToIdMap)).toEqual([GUEST_ID]);
  });

  it("resolves known player names regardless of case", () => {
    const nameToIdMap = makeNameToIdMap([
      { id: "p1", name: "Anna" },
      { id: "p2", name: "Bosse" },
    ]);

    expect(resolveTeamIds(undefined, ["anna", "BOSSE"], nameToIdMap)).toEqual(["p1", "p2"]);
  });
});
