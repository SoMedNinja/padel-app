import { describe, expect, it } from "vitest";
import { evaluateDayAvailability } from "./availabilityStatus";
import { AvailabilityVote } from "../types";

const makeVote = (profileId: string, slot: AvailabilityVote["slot"]): AvailabilityVote => ({
  id: `vote-${profileId}`,
  poll_day_id: "day-1",
  profile_id: profileId,
  slot,
  created_at: new Date().toISOString(),
});

describe("availability status", () => {
  it("marks green when 4 players are available full day", () => {
    const votes = [
      makeVote("a", null),
      makeVote("b", null),
      makeVote("c", null),
      makeVote("d", null),
    ];

    const result = evaluateDayAvailability(votes);
    expect(result.isGreen).toBe(true);
    expect(result.compatibleSlot).toBe("morning");
  });

  it("marks green when at least 4 players overlap on one slot", () => {
    const votes = [
      makeVote("a", "morning"),
      makeVote("b", "morning"),
      makeVote("c", null),
      makeVote("d", "morning"),
    ];

    const result = evaluateDayAvailability(votes);
    expect(result.isGreen).toBe(true);
    expect(result.compatibleSlot).toBe("morning");
  });

  it("does not mark green when 4 players vote but no shared slot exists", () => {
    const votes = [
      makeVote("a", "morning"),
      makeVote("b", "day"),
      makeVote("c", "evening"),
      makeVote("d", "evening"),
    ];

    const result = evaluateDayAvailability(votes);
    expect(result.hasMinimumPlayers).toBe(true);
    expect(result.isCompatible).toBe(false);
    expect(result.isGreen).toBe(false);
  });

  it("does not mark green below 4 voters", () => {
    const votes = [
      makeVote("a", null),
      makeVote("b", null),
      makeVote("c", null),
    ];

    const result = evaluateDayAvailability(votes);
    expect(result.isGreen).toBe(false);
  });
});
