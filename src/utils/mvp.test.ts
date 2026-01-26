import { describe, it, expect } from "vitest";
import { calculateMvpScore, scorePlayersForMvp, getMvpWinner } from "./mvp";
import { Match, PlayerStats } from "../types";

describe("mvp utility", () => {
  it("calculates MVP score correctly using the additive formula", () => {
    // Score = eloGain + (winRate * 15) + (games * 0.5)
    expect(calculateMvpScore(3, 3, 40)).toBe(40 + 15 + 1.5); // 56.5
    expect(calculateMvpScore(2, 4, 30)).toBe(30 + 7.5 + 2.0); // 39.5
    expect(calculateMvpScore(0, 4, -20)).toBe(-20 + 0 + 2.0); // -18
  });

  it("scores players correctly based on match history", () => {
    const players: PlayerStats[] = [
      {
        id: "p1",
        name: "Player 1",
        elo: 1050,
        history: [
          { matchId: "m1", result: "W", delta: 10, timestamp: 100, date: "", elo: 1010 },
          { matchId: "m2", result: "W", delta: 15, timestamp: 200, date: "", elo: 1025 },
          { matchId: "m3", result: "L", delta: -5, timestamp: 300, date: "", elo: 1020 },
        ],
      } as any,
    ];

    const matches: Match[] = [
      { id: "m1" } as any,
      { id: "m2" } as any,
    ];

    const results = scorePlayersForMvp(matches, players, 2);
    expect(results).toHaveLength(1);
    expect(results[0].wins).toBe(2);
    expect(results[0].games).toBe(2);
    expect(results[0].periodEloGain).toBe(25);
    expect(results[0].isEligible).toBe(true);
  });

  it("determines the winner with tie-breaking logic", () => {
    const results = [
      {
        name: "A",
        id: "a",
        score: 50,
        periodEloGain: 30,
        eloNet: 1100,
        wins: 3,
        isEligible: true,
      } as any,
      {
        name: "B",
        id: "b",
        score: 50,
        periodEloGain: 30,
        eloNet: 1200, // Higher eloNet wins tie
        wins: 3,
        isEligible: true,
      } as any,
    ];

    const winner = getMvpWinner(results);
    expect(winner?.name).toBe("B");
  });
});
