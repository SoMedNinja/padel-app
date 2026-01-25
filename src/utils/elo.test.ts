import { describe, it, expect } from "vitest";
import {
  calculateElo,
  getExpectedScore,
  getKFactor,
  getMarginMultiplier,
  getMatchWeight,
  getPlayerWeight,
} from "./elo";

describe("ELO Logic", () => {
  it("should calculate correct K-factor based on games played", () => {
    expect(getKFactor(0)).toBe(40);
    expect(getKFactor(9)).toBe(40);
    expect(getKFactor(10)).toBe(30);
    expect(getKFactor(29)).toBe(30);
    expect(getKFactor(30)).toBe(20);
  });

  it("should calculate expected score correctly", () => {
    // Equal ratings should give 0.5 expected score
    expect(getExpectedScore(1000, 1000)).toBeCloseTo(0.5);
    // Higher rating should have higher expected score
    expect(getExpectedScore(1200, 1000)).toBeGreaterThan(0.5);
    expect(getExpectedScore(1000, 1200)).toBeLessThan(0.5);
  });

  it("should calculate margin multiplier correctly", () => {
    expect(getMarginMultiplier(2, 0)).toBeCloseTo(1.2);
    expect(getMarginMultiplier(1, 0)).toBeCloseTo(1.1);
    expect(getMarginMultiplier(0, 0)).toBe(1);
  });

  it("should calculate player weight based on team average", () => {
    // If player is better than team avg, weight should be < 1 (contribution is 'easier')
    expect(getPlayerWeight(1200, 1000)).toBeLessThan(1);
    // If player is worse than team avg, weight should be > 1 (contribution is 'harder')
    expect(getPlayerWeight(800, 1000)).toBeGreaterThan(1);
  });

  it("should weight long matches more than short matches", () => {
    const shortMatch: any = {
      team1_sets: 2,
      team2_sets: 1,
      score_type: "sets",
    };
    const midMatch: any = {
      team1_sets: 4,
      team2_sets: 2,
      score_type: "sets",
    };
    const longMatch: any = {
      team1_sets: 6,
      team2_sets: 4,
      score_type: "sets",
    };

    expect(getMatchWeight(shortMatch)).toBe(getMatchWeight(midMatch));
    expect(getMatchWeight(shortMatch)).toBeLessThan(getMatchWeight(longMatch));
  });

  it("should calculate new ELOs after a match", () => {
    const profiles: any[] = [
      { id: "p1", name: "Player 1" },
      { id: "p2", name: "Player 2" },
      { id: "p3", name: "Player 3" },
      { id: "p4", name: "Player 4" },
    ];
    const matches: any[] = [
      {
        id: "m1",
        created_at: new Date().toISOString(),
        team1_ids: ["p1", "p2"],
        team2_ids: ["p3", "p4"],
        team1_sets: 2,
        team2_sets: 0,
      }
    ];

    const results = calculateElo(matches, profiles);
    const p1 = results.find(r => r.id === "p1");
    const p3 = results.find(r => r.id === "p3");

    expect(p1!.elo).toBeGreaterThan(1000);
    expect(p3!.elo).toBeLessThan(1000);
    expect(p1!.wins).toBe(1);
    expect(p3!.losses).toBe(1);
  });
});
