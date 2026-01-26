import { describe, it, expect } from "vitest";
import { calculateMvpScore, calculateRollingMvpScore, getMvpWinner } from "./stats";
import { Match, PlayerStats } from "../types";

describe("MVP stats logic", () => {
  it("calculates standard MVP score correctly", () => {
    // eloGain * (0.9 + 0.2 * winRate) + 0.3 * games
    // 30 * (0.9 + 0.2 * 1.0) + 0.3 * 3 = 30 * 1.1 + 0.9 = 33 + 0.9 = 33.9
    expect(calculateMvpScore(30, 1.0, 3)).toBeCloseTo(33.9);

    // 35 * (0.9 + 0.2 * 0.75) + 0.3 * 4 = 35 * 1.05 + 1.2 = 36.75 + 1.2 = 37.95
    expect(calculateMvpScore(35, 0.75, 4)).toBeCloseTo(37.95);
  });

  it("calculates rolling MVP score correctly", () => {
    // wins * 3 + winRate * 5 + games
    // 3 * 3 + 1.0 * 5 + 3 = 9 + 5 + 3 = 17
    expect(calculateRollingMvpScore(3, 1.0, 3)).toBe(17);
  });

  it("picks the correct MVP winner", () => {
    const players: PlayerStats[] = [
      {
        id: "p1",
        name: "Alice",
        elo: 1000,
        startElo: 1000,
        wins: 3,
        losses: 0,
        games: 3,
        history: [
          { result: "W", delta: 10, matchId: "m1", timestamp: 1, date: "", elo: 1010 },
          { result: "W", delta: 10, matchId: "m2", timestamp: 2, date: "", elo: 1020 },
          { result: "W", delta: 10, matchId: "m3", timestamp: 3, date: "", elo: 1030 },
        ],
        partners: {},
        recentResults: ["W", "W", "W"],
      },
      {
        id: "p2",
        name: "Bob",
        elo: 1000,
        startElo: 1000,
        wins: 3,
        losses: 1,
        games: 4,
        history: [
          { result: "W", delta: 10, matchId: "m1", timestamp: 1, date: "", elo: 1010 },
          { result: "W", delta: 10, matchId: "m2", timestamp: 2, date: "", elo: 1020 },
          { result: "W", delta: 10, matchId: "m3", timestamp: 3, date: "", elo: 1030 },
          { result: "W", delta: 5, matchId: "m4", timestamp: 4, date: "", elo: 1035 },
        ],
        partners: {},
        recentResults: ["W", "W", "W", "W"],
      }
    ];

    const matches: Match[] = [
      { id: "m1", team1: "Alice", team2: "Other", team1_ids: ["p1"], team2_ids: [], team1_sets: 2, team2_sets: 0, created_at: "2023-01-01" },
      { id: "m2", team1: "Alice", team2: "Other", team1_ids: ["p1"], team2_ids: [], team1_sets: 2, team2_sets: 0, created_at: "2023-01-01" },
      { id: "m3", team1: "Alice", team2: "Other", team1_ids: ["p1"], team2_ids: [], team1_sets: 2, team2_sets: 0, created_at: "2023-01-01" },
      { id: "m1", team1: "Bob", team2: "Other", team1_ids: ["p2"], team2_ids: [], team1_sets: 2, team2_sets: 0, created_at: "2023-01-01" },
      { id: "m2", team1: "Bob", team2: "Other", team1_ids: ["p2"], team2_ids: [], team1_sets: 2, team2_sets: 0, created_at: "2023-01-01" },
      { id: "m3", team1: "Bob", team2: "Other", team1_ids: ["p2"], team2_ids: [], team1_sets: 2, team2_sets: 0, created_at: "2023-01-01" },
      { id: "m4", team1: "Bob", team2: "Other", team1_ids: ["p2"], team2_ids: [], team1_sets: 2, team2_sets: 0, created_at: "2023-01-01" },
    ];

    // Alice: eloGain=30, winRate=1.0, games=3 => Score=33.9
    // Bob: eloGain=35, winRate=1.0, games=4 => Score=35*(1.1) + 0.3*4 = 38.5 + 1.2 = 39.7

    const winner = getMvpWinner(matches, players, "evening", 3);
    expect(winner?.name).toBe("Bob");
  });
});
