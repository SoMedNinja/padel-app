import { describe, it, expect } from "vitest";
import { calculateMvpScore, getMvpWinner, scorePlayersForMvp } from "./mvp";
import { Match, PlayerStats } from "../types";

describe("MVP stats logic", () => {
  it("calculates standard MVP score correctly", () => {
    // Score = eloGain + (winRate * 15) + (games * 0.5)
    // 30 + (1.0 * 15) + (3 * 0.5) = 30 + 15 + 1.5 = 46.5
    expect(calculateMvpScore(3, 3, 30)).toBeCloseTo(46.5);

    // 35 + (0.75 * 15) + (4 * 0.5) = 35 + 11.25 + 2 = 48.25
    expect(calculateMvpScore(3, 4, 35)).toBeCloseTo(48.25);
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

    // Alice: eloGain=30, winRate=1.0, games=3 => Score=46.5
    // Bob: eloGain=35, winRate=1.0, games=4 => Score=52.0

    const results = scorePlayersForMvp(matches, players, 3);
    const winner = getMvpWinner(results);
    expect(winner?.name).toBe("Bob");
  });
});
