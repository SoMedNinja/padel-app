import { describe, it, expect } from "vitest";
import { findMatchHighlight } from "./highlights";
import { Match, PlayerStats } from "../types";

describe("Highlights Logic", () => {
  const mockProfiles: any[] = [
    { id: "p1", name: "Player 1" },
    { id: "p2", name: "Player 2" },
    { id: "p3", name: "Player 3" },
    { id: "p4", name: "Player 4" },
  ];

  const mockPlayerStats: PlayerStats[] = [
    { id: "p1", name: "Player 1", elo: 1000, wins: 0, losses: 0, games: 0, history: [], recentResults: [] },
    { id: "p2", name: "Player 2", elo: 1000, wins: 0, losses: 0, games: 0, history: [], recentResults: [] },
    { id: "p3", name: "Player 3", elo: 1000, wins: 0, losses: 0, games: 0, history: [], recentResults: [] },
    { id: "p4", name: "Player 4", elo: 1000, wins: 0, losses: 0, games: 0, history: [], recentResults: [] },
  ];

  it("should identify an upset with win chance < 35%", () => {
    // Team 1 is much stronger
    const eloDeltaByMatch = {
      "m1": { "p1": 10, "p2": 10, "p3": -10, "p4": -10 }
    };
    const eloRatingByMatch = {
      "m1": { "p1": 1300, "p2": 1300, "p3": 900, "p4": 900 }
    };
    // If team 2 (weaker) wins, it's an upset
    const matches: Match[] = [
      {
        id: "m1",
        created_at: "2024-01-01T10:00:00Z",
        team1_ids: ["p1", "p2"],
        team2_ids: ["p3", "p4"],
        team1_sets: 0,
        team2_sets: 2,
        team1: [], team2: []
      }
    ];

    const highlight = findMatchHighlight(matches, mockPlayerStats, eloDeltaByMatch, eloRatingByMatch);
    expect(highlight).not.toBeNull();
    expect(highlight?.reason).toBe("upset");
  });

  it("should NOT identify an upset if win chance is 40% (new threshold is 35%)", () => {
    // Small elo diff gives ~40% win chance for underdog
    const eloDeltaByMatch = {
      "m1": { "p1": 10, "p2": 10, "p3": -10, "p4": -10 }
    };
    const eloRatingByMatch = {
      "m1": { "p1": 1050, "p2": 1050, "p3": 1000, "p4": 1000 }
    };
    const matches: Match[] = [
      {
        id: "m1",
        created_at: "2024-01-01T10:00:00Z",
        team1_ids: ["p1", "p2"],
        team2_ids: ["p3", "p4"],
        team1_sets: 0,
        team2_sets: 2,
        team1: [], team2: []
      }
    ];

    const highlight = findMatchHighlight(matches, mockPlayerStats, eloDeltaByMatch, eloRatingByMatch);
    // Might find 'thriller' or 'titans' if no upset, but definitely not 'upset'
    if (highlight) {
        expect(highlight.reason).not.toBe("upset");
    }
  });

  it("should identify titans if total elo > 2200", () => {
    const eloDeltaByMatch = {
      "m1": { "p1": 10, "p2": 10, "p3": -10, "p4": -10 }
    };
    const eloRatingByMatch = {
      "m1": { "p1": 1200, "p2": 1200, "p3": 1150, "p4": 1150 }
    };
    const matches: Match[] = [
      {
        id: "m1",
        created_at: "2024-01-01T10:00:00Z",
        team1_ids: ["p1", "p2"],
        team2_ids: ["p3", "p4"],
        team1_sets: 2,
        team2_sets: 1,
        team1: [], team2: []
      }
    ];

    const highlight = findMatchHighlight(matches, mockPlayerStats, eloDeltaByMatch, eloRatingByMatch);
    expect(highlight).not.toBeNull();
    // Titans has low priority, but if nothing else is found it should be there.
    // Actually 2-1 is a thriller (margin 1). Thriller has higher priority.
    // Let's make it 2-0.
    matches[0].team1_sets = 2;
    matches[0].team2_sets = 0;

    const highlight2 = findMatchHighlight(matches, mockPlayerStats, eloDeltaByMatch, eloRatingByMatch);
    expect(highlight2?.reason).toBe("titans");
  });

  it("should NOT identify titans if total elo is 2100", () => {
    const eloDeltaByMatch = {
      "m1": { "p1": 10, "p2": 10, "p3": -10, "p4": -10 }
    };
    const eloRatingByMatch = {
      "m1": { "p1": 1050, "p2": 1050, "p3": 1000, "p4": 1000 }
    };
    const matches: Match[] = [
      {
        id: "m1",
        created_at: "2024-01-01T10:00:00Z",
        team1_ids: ["p1", "p2"],
        team2_ids: ["p3", "p4"],
        team1_sets: 2,
        team2_sets: 0,
        team1: [], team2: []
      }
    ];

    const highlight = findMatchHighlight(matches, mockPlayerStats, eloDeltaByMatch, eloRatingByMatch);
    expect(highlight).toBeNull();
  });
});
