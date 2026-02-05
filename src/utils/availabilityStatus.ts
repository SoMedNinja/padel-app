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
// - If slot is null, they are available the whole day (all slots).
// - If slot has a value, they are only available in that specific part of the day.
const getVoteSlots = (vote: AvailabilityVote): AvailabilitySlot[] => {
  if (!vote.slot) {
    return [...SLOT_PRIORITY];
  }
  return [vote.slot];
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

  let fullDayVotes = 0;
  for (const vote of uniqueVotes) {
    const slots = getVoteSlots(vote);
    if (!vote.slot) {
      fullDayVotes += 1;
    }
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

  if (!compatibleSlot && fullDayVotes >= 4) {
    compatibleSlot = "full-day";
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
