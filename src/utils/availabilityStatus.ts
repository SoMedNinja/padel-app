import { AvailabilityPollDay, AvailabilitySlot, AvailabilityVote } from "../types";

export interface DayAvailabilityStatus {
  totalVoters: number;
  hasMinimumPlayers: boolean;
  isCompatible: boolean;
  isGreen: boolean;
  compatibleSlot: AvailabilitySlot | "full-day" | null;
}

const SLOT_PRIORITY: AvailabilitySlot[] = ["morning", "day", "evening"];

// Note for non-coders: this helper converts one person's vote into the time slots they can play.
// - If no slots were chosen, it means "available all day".
// - If one or more slots were chosen, only those slots count.
export const getVoteSlots = (vote: AvailabilityVote): AvailabilitySlot[] => {
  const multi = vote.slot_preferences?.filter(Boolean) || [];
  if (multi.length > 0) {
    return multi;
  }

  if (vote.slot) {
    return [vote.slot];
  }

  return [...SLOT_PRIORITY];
};

// Note for non-coders: a day turns green only when at least 4 people can overlap on the same time.
// Full-day votes can overlap with any slot.
export const evaluateDayAvailability = (votes: AvailabilityVote[]): DayAvailabilityStatus => {
  const uniqueByUser = new Map<string, AvailabilityVote>();
  votes.forEach((vote) => {
    uniqueByUser.set(vote.profile_id, vote);
  });

  const uniqueVotes = Array.from(uniqueByUser.values());
  const totalVoters = uniqueVotes.length;
  const hasMinimumPlayers = totalVoters >= 4;

  const slotCounts: Record<AvailabilitySlot, number> = {
    morning: 0,
    day: 0,
    evening: 0,
  };

  for (const vote of uniqueVotes) {
    const slots = getVoteSlots(vote);
    slots.forEach((slot) => {
      slotCounts[slot] += 1;
    });
  }

  let compatibleSlot: DayAvailabilityStatus["compatibleSlot"] = null;
  for (const slot of SLOT_PRIORITY) {
    if (slotCounts[slot] >= 4) {
      compatibleSlot = slot;
      break;
    }
  }

  const isCompatible = compatibleSlot !== null;

  return {
    totalVoters,
    hasMinimumPlayers,
    isCompatible,
    isGreen: hasMinimumPlayers && isCompatible,
    compatibleSlot,
  };
};

export const evaluatePollDay = (day: AvailabilityPollDay): DayAvailabilityStatus => {
  return evaluateDayAvailability(day.votes || []);
};
