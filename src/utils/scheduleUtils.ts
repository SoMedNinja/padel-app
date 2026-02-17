import { AvailabilityPoll, AvailabilityPollDay, AvailabilitySlot } from "../types";
import { getISOWeek } from "./format";

export const SLOT_OPTIONS: Array<{ value: AvailabilitySlot; label: string }> = [
  { value: "morning", label: "Morgon" },
  { value: "day", label: "Dag" },
  { value: "evening", label: "Kväll" },
];

export const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

export const formatTimeSlice = (time: string) => time.slice(0, 5);

export interface UpcomingWeekOption {
  key: string;
  label: string;
  week: number;
  year: number;
}

export const buildUpcomingWeeks = (count = 26): UpcomingWeekOption[] => {
  const start = new Date();
  const seen = new Set<string>();
  const options: UpcomingWeekOption[] = [];

  for (let offset = 0; options.length < count; offset += 7) {
    const date = addDays(start, offset);
    const { week, year } = getISOWeek(date);
    const key = `${year}-W${String(week).padStart(2, "0")}`;
    if (seen.has(key)) continue;
    seen.add(key);
    options.push({ key, label: `Vecka ${week} (${year})`, week, year });
  }

  return options;
};

// Note for non-coders: if a user hasn't selected any slot, that means "whole day".
export const normalizeVoteSlots = (day: AvailabilityPollDay, userId?: string): AvailabilitySlot[] | null => {
  if (!userId) return null;
  const vote = day.votes?.find((entry) => entry.profile_id === userId);
  if (!vote) return null;

  if (vote.slot_preferences && vote.slot_preferences.length > 0) {
    return vote.slot_preferences;
  }

  if (vote.slot) return [vote.slot];
  return [];
};

export const computeEmailAvailability = (poll: AvailabilityPoll) => {
  const logs = poll.mail_logs || [];
  const sentCount = logs.length;
  const latest = logs[0]?.sent_at ? new Date(logs[0].sent_at) : null;

  if (sentCount >= 2) {
    return {
      canSend: false,
      helper: "Max 2 mail redan skickade för denna omröstning.",
    };
  }

  if (!latest) {
    return {
      canSend: true,
      helper: "Inga utskick ännu.",
    };
  }

  const nextAllowed = new Date(latest.getTime() + 24 * 60 * 60 * 1000);
  const now = new Date();
  if (now < nextAllowed) {
    const hoursLeft = Math.ceil((nextAllowed.getTime() - now.getTime()) / (1000 * 60 * 60));
    return {
      canSend: false,
      helper: `Vänta cirka ${hoursLeft}h till nästa utskick.`,
    };
  }

  return {
    canSend: true,
    helper: "Du kan skicka påminnelse nu.",
  };
};

export const mergeExpandedPollsState = (
  previousState: Record<string, boolean>,
  pollsSorted: Array<Pick<AvailabilityPoll, "id" | "status">>,
) => {
  let addedNewPoll = false;
  const nextState = { ...previousState };

  pollsSorted.forEach((poll, index) => {
    if (!(poll.id in nextState)) {
      // Note for non-coders: the very first poll opens automatically if it is open.
      // Closed polls are always collapsed by default.
      nextState[poll.id] = index === 0 && poll.status === "open";
      addedNewPoll = true;
    }
  });

  // Note for non-coders: returning the same object tells React "nothing changed", so no extra rerender.
  return addedNewPoll ? nextState : previousState;
};
