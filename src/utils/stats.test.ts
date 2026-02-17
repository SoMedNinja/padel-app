import { describe, it, expect } from "vitest";
import { getWinnersAndLosers, getPartnerSynergy, getToughestOpponent, getRecentResults } from "./stats";
import { Match } from "../types";

describe("Stats Logic", () => {
  const matches: Match[] = [
    {
      id: "1",
      team1: "Player1, Player2",
      team2: "Player3, Player4",
      team1_ids: ["p1", "p2"],
      team2_ids: ["p3", "p4"],
      team1_sets: 2,
      team2_sets: 1,
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "2",
      team1: "Player1, Player3",
      team2: "Player2, Player4",
      team1_ids: ["p1", "p3"],
      team2_ids: ["p2", "p4"],
      team1_sets: 2,
      team2_sets: 0,
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "3",
      team1: "Player1, Player2",
      team2: "Player3, Player4",
      team1_ids: ["p1", "p2"],
      team2_ids: ["p3", "p4"],
      team1_sets: 0,
      team2_sets: 2,
      created_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(), // Older than 30 days
    }
  ];

  it("should correctly identify winners and losers", () => {
    const match = matches[0];
    const { winners, losers } = getWinnersAndLosers(match);
    expect(winners).toContain("Player1");
    expect(winners).toContain("Player2");
    expect(losers).toContain("Player3");
    expect(losers).toContain("Player4");
  });

  it("should calculate recent results correctly", () => {
    const results = getRecentResults(matches, "Player1");
    // Match 1: Win, Match 2: Win, Match 3: Loss.
    // Sorted by date: Match 3 (L), Match 1 (W), Match 2 (W).
    expect(results).toEqual(["L", "W", "W"]);
  });

  it("should find the best partner in the last 30 days", () => {
    const synergy = getPartnerSynergy(matches, "Player1");
    // Match 1: Partner Player2, Win.
    // Match 2: Partner Player3, Win.
    // Match 3 is excluded (too old).
    // Both Player2 and Player3 have 100% win rate (1/1).
    // The current implementation might pick either depending on sort, but let's check it returns one.
    expect(synergy).not.toBeNull();
    expect(["Player2", "Player3"]).toContain(synergy?.name);
    expect(synergy?.games).toBe(1);
    expect(synergy?.wins).toBe(1);
  });

  it("should find the toughest opponent in the last 30 days", () => {
    const rival = getToughestOpponent(matches, "Player1");
    // Match 1: Opponents Player3, Player4. Player1 won, so 0 losses.
    // Match 2: Opponents Player2, Player4. Player1 won, so 0 losses.
    // Match 3 is excluded.
    // No one has losses against Player1 in the last 30 days.
    // The current implementation returns the one with most games if loss rate is same.
    expect(rival).not.toBeNull();
    expect(["Player3", "Player4", "Player2"]).toContain(rival?.name);
  });

  it("should find the best partner using IDs (optimized path) in the last 30 days", () => {
    const eloDeltaByMatch = {
      "1": { "p1": 10 },
      "2": { "p1": 10 }
    };
    const synergy = getPartnerSynergy(matches, "Player1", "p1", eloDeltaByMatch);
    expect(synergy).not.toBeNull();
    // In ID mode, the partner ID is returned as 'name'
    expect(["p2", "p3"]).toContain(synergy?.name);
    expect(synergy?.games).toBe(1);
    expect(synergy?.wins).toBe(1);
  });
});
