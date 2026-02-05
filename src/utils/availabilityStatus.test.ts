import { describe, expect, it } from "vitest";
import { evaluateDayAvailability, getVoteSlots } from "./availabilityStatus";
import { AvailabilityVote } from "../types";

const makeVote = (
  profileId: string,
  slot: AvailabilityVote["slot"],
  slotPreferences?: AvailabilityVote["slot_preferences"],
): AvailabilityVote => ({
  id: `vote-${profileId}`,
  poll_day_id: "day-1",
  profile_id: profileId,
  slot,
  slot_preferences: slotPreferences,
  created_at: new Date().toISOString(),
});

describe("availability status", () => {
  it("maps no slot selection to full-day availability", () => {
    const vote = makeVote("a", null, null);
    expect(getVoteSlots(vote)).toEqual(["morning", "day", "evening"]);
  });

  it("marks green when 4 players are available full day", () => {
    const votes = [
      makeVote("a", null, null),
      makeVote("b", null, null),
      makeVote("c", null, null),
      makeVote("d", null, null),
    ];

    const result = evaluateDayAvailability(votes);
    expect(result.isGreen).toBe(true);
    expect(result.compatibleSlot).toBe("morning");
  });

  it("marks green when at least 4 players overlap on one slot", () => {
    const votes = [
      makeVote("a", null, ["morning"]),
      makeVote("b", null, ["morning", "day"]),
      makeVote("c", null, ["morning", "evening"]),
      makeVote("d", null, ["morning"]),
    ];

    const result = evaluateDayAvailability(votes);
    expect(result.isGreen).toBe(true);
    expect(result.compatibleSlot).toBe("morning");
  });

  it("does not mark green when 4 players vote but no shared slot exists", () => {
    const votes = [
      makeVote("a", null, ["morning"]),
      makeVote("b", null, ["day"]),
      makeVote("c", null, ["evening"]),
      makeVote("d", null, ["evening"]),
    ];

    const result = evaluateDayAvailability(votes);
    expect(result.hasMinimumPlayers).toBe(true);
    expect(result.isCompatible).toBe(false);
    expect(result.isGreen).toBe(false);
  });

  it("does not mark green below 4 voters", () => {
    const votes = [makeVote("a", null, null), makeVote("b", null, null), makeVote("c", null, null)];

    const result = evaluateDayAvailability(votes);
    expect(result.isGreen).toBe(false);
  });
});
