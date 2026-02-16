import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { filterMatches } from "./filters";

// Shim for Bun environment which lacks some Vitest globals
if (typeof Bun !== "undefined") {
  const { setSystemTime } = require("bun:test");
  if (!vi.useFakeTimers) {
    (vi as any).useFakeTimers = () => {};
  }
  if (!vi.setSystemTime) {
    (vi as any).setSystemTime = (date: Date | string | number) => {
      setSystemTime(new Date(date));
    };
  }
  if (!vi.useRealTimers) {
    (vi as any).useRealTimers = () => {
      setSystemTime(); // Resets to current time
    };
  }
}
import { Match, MatchFilter } from "../types";

describe("filterMatches", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-05-10T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const mockMatches: Match[] = [
    {
      id: "1",
      team1: "P1, P2",
      team2: "P3, P4",
      team1_ids: ["p1", "p2"],
      team2_ids: ["p3", "p4"],
      team1_sets: 2,
      team2_sets: 1,
      score_type: "sets",
      created_at: "2024-05-05T10:00:00Z", // 5 days ago
    },
    {
      id: "2",
      team1: "P1, P2",
      team2: "P3, P4",
      team1_ids: ["p1", "p2"],
      team2_ids: ["p3", "p4"],
      team1_sets: 6,
      team2_sets: 2,
      score_type: "sets",
      created_at: "2024-04-20T10:00:00Z", // 20 days ago
    },
    {
      id: "3",
      team1: "P1, P2",
      team2: "P3, P4",
      team1_ids: ["p1", "p2"],
      team2_ids: ["p3", "p4"],
      team1_sets: 2,
      team2_sets: 0,
      score_type: "sets",
      source_tournament_id: "tourney-1",
      created_at: "2024-03-01T10:00:00Z", // ~70 days ago
    },
    {
      id: "4",
      team1: "P1, P2",
      team2: "P3, P4",
      team1_ids: ["p1", "p2"],
      team2_ids: ["p3", "p4"],
      team1_sets: 21,
      team2_sets: 15,
      score_type: "points",
      created_at: "2024-05-09T10:00:00Z", // 1 day ago
    },
  ];

  it("should return all matches when filter type is 'all'", () => {
    const filter: MatchFilter = { type: "all" };
    const result = filterMatches(mockMatches, filter);
    expect(result).toHaveLength(mockMatches.length);
    expect(result).toEqual(mockMatches);
  });

  it("should filter short matches (max sets <= 3)", () => {
    const filter: MatchFilter = { type: "short" };
    const result = filterMatches(mockMatches, filter);
    // Match 1 (max sets 2), Match 3 (max sets 2) should be kept.
    // Match 2 (max sets 6) should be filtered out.
    // Match 4 (score_type points) should be filtered out.
    expect(result).toHaveLength(2);
    expect(result.map(m => m.id)).toEqual(["1", "3"]);
  });

  it("should filter long matches (max sets >= 6)", () => {
    const filter: MatchFilter = { type: "long" };
    const result = filterMatches(mockMatches, filter);
    // Match 2 (max sets 6) should be kept.
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  it("should filter tournament matches", () => {
    const filter: MatchFilter = { type: "tournaments" };
    const result = filterMatches(mockMatches, filter);
    // Match 3 has source_tournament_id
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("3");
  });

  it("should filter matches from last 7 days", () => {
    const filter: MatchFilter = { type: "last7" };
    const result = filterMatches(mockMatches, filter);
    // Mock now: 2024-05-10
    // Match 1: 2024-05-05 (5 days ago) - OK
    // Match 4: 2024-05-09 (1 day ago) - OK
    // Match 2: 2024-04-20 (20 days ago) - NO
    expect(result).toHaveLength(2);
    expect(result.map(m => m.id)).toEqual(["1", "4"]);
  });

  it("should filter matches from last 30 days", () => {
    const filter: MatchFilter = { type: "last30" };
    const result = filterMatches(mockMatches, filter);
    // Mock now: 2024-05-10
    // Match 1: 5 days ago - OK
    // Match 4: 1 day ago - OK
    // Match 2: 20 days ago - OK
    // Match 3: ~70 days ago - NO
    expect(result).toHaveLength(3);
    expect(result.map(m => m.id)).toEqual(["1", "2", "4"]);
  });

  it("should filter matches within a date range", () => {
    const filter: MatchFilter = {
      type: "range",
      startDate: "2024-04-01T00:00:00Z",
      endDate: "2024-04-30T23:59:59Z",
    };
    const result = filterMatches(mockMatches, filter);
    // Match 2: 2024-04-20 - OK
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  it("should return empty array for null or empty matches", () => {
    const filter: MatchFilter = { type: "all" };
    expect(filterMatches([], filter)).toEqual([]);
    expect(filterMatches(null as any, filter)).toEqual([]);
  });

  it("should return empty array for range filter without startDate", () => {
    const filter: MatchFilter = { type: "range" };
    const result = filterMatches(mockMatches, filter);
    expect(result).toEqual([]);
  });

  it("should use current date as endDate when only startDate is provided for range", () => {
    const filter: MatchFilter = {
      type: "range",
      startDate: "2024-05-01",
    };
    const result = filterMatches(mockMatches, filter);
    // Mock now: 2024-05-10
    // Match 1: 2024-05-05 - OK
    // Match 4: 2024-05-09 - OK
    expect(result).toHaveLength(2);
    expect(result.map(m => m.id)).toEqual(["1", "4"]);
  });
});
