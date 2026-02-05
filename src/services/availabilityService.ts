import { supabase } from "../supabaseClient";
import { AvailabilityPoll, AvailabilityPollDay, AvailabilitySlot } from "../types";
import { requireAdmin } from "./authUtils";

interface CreatePollInput {
  weekYear: number;
  weekNumber: number;
}

// Note for non-coders: this helper computes Monday-to-Sunday for an ISO week number.
const getISOWeekRange = (week: number, year: number) => {
  const firstThursday = new Date(Date.UTC(year, 0, 1));
  while (firstThursday.getUTCDay() !== 4) {
    firstThursday.setUTCDate(firstThursday.getUTCDate() + 1);
  }
  const week1Monday = new Date(firstThursday);
  week1Monday.setUTCDate(firstThursday.getUTCDate() - 3);

  const start = new Date(week1Monday);
  start.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);

  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);

  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
};

const parsePollStatus = (poll: AvailabilityPoll): AvailabilityPoll => {
  const nowDate = new Date().toISOString().slice(0, 10);
  if (poll.status === "open" && poll.end_date < nowDate) {
    return { ...poll, status: "closed" };
  }
  return poll;
};

export const availabilityService = {
  async getPolls(): Promise<AvailabilityPoll[]> {
    const { data, error } = await supabase
      .from("availability_polls")
      .select("*, days:availability_poll_days(*, votes:availability_votes(*))")
      .order("week_year", { ascending: true })
      .order("week_number", { ascending: true });

    if (error) throw error;

    const polls = ((data || []) as AvailabilityPoll[]).map((poll) => ({
      ...parsePollStatus(poll),
      days: (poll.days || []).sort((a, b) => a.date.localeCompare(b.date)),
    }));

    return polls;
  },

  async createPoll(input: CreatePollInput): Promise<AvailabilityPoll> {
    const currentUser = await requireAdmin("Endast administratörer kan skapa veckoomröstningar.");

    const { start, end } = getISOWeekRange(input.weekNumber, input.weekYear);
    const today = new Date().toISOString().slice(0, 10);
    if (start <= today) {
      throw new Error("Välj en framtida vecka för att skapa en ny omröstning.");
    }

    const { data: poll, error } = await supabase
      .from("availability_polls")
      .insert({
        created_by: currentUser.id,
        week_year: input.weekYear,
        week_number: input.weekNumber,
        start_date: start,
        end_date: end,
      })
      .select("*")
      .single();

    if (error) throw error;

    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(`${start}T00:00:00.000Z`);
      date.setUTCDate(date.getUTCDate() + index);
      return {
        poll_id: poll.id,
        date: date.toISOString().slice(0, 10),
      };
    });

    const { error: dayError } = await supabase.from("availability_poll_days").insert(days);
    if (dayError) throw dayError;

    return poll as AvailabilityPoll;
  },

  async closePoll(pollId: string): Promise<void> {
    await requireAdmin("Endast administratörer kan stänga omröstningar.");

    const { error } = await supabase
      .from("availability_polls")
      .update({ status: "closed", closed_at: new Date().toISOString() })
      .eq("id", pollId);

    if (error) throw error;
  },

  async deletePoll(pollId: string): Promise<void> {
    await requireAdmin("Endast administratörer kan radera omröstningar.");

    const { error } = await supabase
      .from("availability_polls")
      .delete()
      .eq("id", pollId);

    if (error) throw error;
  },

  // Note for non-coders: "upsert" means create-or-update in one safe database call.
  async upsertVote(day: AvailabilityPollDay, slot: AvailabilitySlot | null): Promise<void> {
    const { data: sessionData } = await supabase.auth.getSession();
    const currentUser = sessionData.session?.user;

    if (!currentUser) {
      throw new Error("Du måste vara inloggad för att rösta.");
    }

    const { error } = await supabase
      .from("availability_votes")
      .upsert(
        {
          poll_day_id: day.id,
          profile_id: currentUser.id,
          slot,
        },
        { onConflict: "poll_day_id,profile_id" }
      );

    if (error) throw error;
  },

  async removeVote(day: AvailabilityPollDay): Promise<void> {
    const { data: sessionData } = await supabase.auth.getSession();
    const currentUser = sessionData.session?.user;

    if (!currentUser) {
      throw new Error("Du måste vara inloggad för att ta bort din röst.");
    }

    const { error } = await supabase
      .from("availability_votes")
      .delete()
      .eq("poll_day_id", day.id)
      .eq("profile_id", currentUser.id);

    if (error) throw error;
  },
};
