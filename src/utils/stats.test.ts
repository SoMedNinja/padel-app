import { describe, it, expect } from "vitest";
import { getWinnersAndLosers } from "./stats";

describe("Stats Logic", () => {
  it("should correctly identify winners and losers", () => {
    const match: any = {
      team1: "A, B",
      team2: "C, D",
      team1_sets: 2,
      team2_sets: 1
    };
    const { winners, losers } = getWinnersAndLosers(match);
    expect(winners).toContain("A");
    expect(winners).toContain("B");
    expect(losers).toContain("C");
    expect(losers).toContain("D");
  });
});
