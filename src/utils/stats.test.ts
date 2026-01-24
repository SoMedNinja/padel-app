import { describe, it, expect } from "vitest";
import { getWinnersAndLosers, getMvpStats } from "./stats";

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

  it("should calculate MVP stats correctly", () => {
    const matches: any[] = [
      {
        team1: ["Alice", "Bob"],
        team2: ["Charlie", "David"],
        team1_sets: 2,
        team2_sets: 0
      },
      {
        team1: ["Alice", "Charlie"],
        team2: ["Bob", "David"],
        team1_sets: 2,
        team2_sets: 1
      }
    ];
    const stats = getMvpStats(matches);
    expect(stats["Alice"].wins).toBe(2);
    expect(stats["Alice"].games).toBe(2);
    expect(stats["Bob"].wins).toBe(1);
    expect(stats["Bob"].games).toBe(2);
    expect(stats["David"].wins).toBe(0);
    expect(stats["David"].games).toBe(2);
  });
});
