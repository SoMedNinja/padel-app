import { supabase, supabaseAnonKey } from "../supabaseClient";
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

const mapCreatePollError = (error: any) => {
  // Note for non-coders: Postgres error code 23505 means "already exists".
  if (error?.code === "23505") {
    return new Error("Det finns redan en omröstning för den veckan. Välj en annan vecka.");
  }
  return error;
};

const isMissingRpcFunctionError = (error: any): boolean => {
  // Note for non-coders: PGRST202 is returned when Supabase API cannot find an RPC function in its schema cache.
  return error?.code === "PGRST202";
};

// Note for non-coders: if this flag becomes true, we skip the RPC call entirely to avoid repeated 404 noise in the browser.
let shouldUseRpcCreatePoll = true;

const createPollWithoutRpc = async (
  weekYear: number,
  weekNumber: number,
  startDate: string,
  endDate: string,
): Promise<AvailabilityPoll> => {
  // Note for non-coders: this is a safe fallback path when the RPC function is not yet deployed/refreshed.
  const { data: sessionData } = await supabase.auth.getSession();
  const currentUser = sessionData.session?.user;

  // Note for non-coders: created_by is required by the database, so we explicitly attach the logged-in user's id here.
  if (!currentUser) {
    throw new Error("Du måste vara inloggad för att skapa en omröstning.");
  }

  const { data: poll, error: pollError } = await supabase
    .from("availability_polls")
    .insert({
      created_by: currentUser.id,
      week_year: weekYear,
      week_number: weekNumber,
      start_date: startDate,
      end_date: endDate,
    })
    .select("*")
    .single();

  if (pollError) {
    throw mapCreatePollError(pollError);
  }

  const dayRows = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(`${startDate}T00:00:00.000Z`);
    day.setUTCDate(day.getUTCDate() + index);
    return {
      poll_id: poll.id,
      date: day.toISOString().slice(0, 10),
    };
  });

  const { error: daysError } = await supabase.from("availability_poll_days").insert(dayRows);

  if (daysError) {
    // Note for non-coders: if day creation fails, we delete the parent poll so no half-finished poll remains.
    await supabase.from("availability_polls").delete().eq("id", poll.id);
    throw mapCreatePollError(daysError);
  }

  return poll as AvailabilityPoll;
};

export const availabilityService = {
  async getPolls(): Promise<AvailabilityPoll[]> {
    const { data, error } = await supabase
      .from("availability_polls")
      .select(
        "*, days:availability_poll_days(*, votes:availability_votes(*)), mail_logs:availability_poll_mail_log(id, poll_id, sent_by, sent_at, created_at)",
      )
      .order("week_year", { ascending: true })
      .order("week_number", { ascending: true });

    if (error) throw error;

    const polls = ((data || []) as AvailabilityPoll[]).map((poll) => ({
      ...parsePollStatus(poll),
      days: (poll.days || []).sort((a, b) => a.date.localeCompare(b.date)),
      mail_logs: (poll.mail_logs || []).sort((a, b) => b.sent_at.localeCompare(a.sent_at)),
    }));

    return polls;
  },

  async createPoll(input: CreatePollInput): Promise<AvailabilityPoll> {
    await requireAdmin("Endast administratörer kan skapa veckoomröstningar.");

    const { start, end } = getISOWeekRange(input.weekNumber, input.weekYear);
    const today = new Date().toISOString().slice(0, 10);
    if (start <= today) {
      throw new Error("Välj en framtida vecka för att skapa en ny omröstning.");
    }

    if (shouldUseRpcCreatePoll) {
      // Note for non-coders: we try one database function first so poll + 7 days are created as one all-or-nothing save.
      const { data: poll, error } = await supabase.rpc("create_availability_poll_with_days", {
        p_week_year: input.weekYear,
        p_week_number: input.weekNumber,
        p_start_date: start,
        p_end_date: end,
      });

      if (!error) {
        return poll as AvailabilityPoll;
      }

      if (!isMissingRpcFunctionError(error)) {
        throw mapCreatePollError(error);
      }

      // Note for non-coders: your database does not currently expose this function, so we remember that and use direct table writes instead.
      shouldUseRpcCreatePoll = false;
    }

    return createPollWithoutRpc(input.weekYear, input.weekNumber, start, end);
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

    const { error } = await supabase.from("availability_polls").delete().eq("id", pollId);

    if (error) throw error;
  },

  async sendPollEmail(
    pollId: string,
    options?: { testRecipientEmail?: string; onlyMissingVotes?: boolean },
  ): Promise<{
    success: boolean;
    sent: number;
    total: number;
    totalBeforeVoteFilter?: number;
    votedProfileCount?: number;
    onlyMissingVotes?: boolean;
    error?: string;
    mode?: string;
  }> {
    await requireAdmin("Endast administratörer kan skicka omröstningsmail.");

    if (typeof supabaseAnonKey === "string" && supabaseAnonKey.startsWith("sb_publishable_")) {
      // Note for non-coders: publishable keys can browse data but cannot authenticate Edge Function calls.
      throw new Error(
        "Miljöfel: VITE_SUPABASE_ANON_KEY använder sb_publishable_*. Byt till Supabase anon public key i Project Settings → API för att kunna skicka mail."
      );
    }

    const { data, error } = await supabase.functions.invoke("availability-poll-mail", {
      body: {
        pollId,
        testRecipientEmail: options?.testRecipientEmail || null,
        onlyMissingVotes: options?.onlyMissingVotes === true,
      },
    });

    if (error) {
      throw new Error(error.message || "Kunde inte skicka mail.");
    }

    if (!data?.success) {
      throw new Error(data?.error || "Kunde inte skicka mail.");
    }

    return data as {
      success: boolean;
      sent: number;
      total: number;
      totalBeforeVoteFilter?: number;
      votedProfileCount?: number;
      onlyMissingVotes?: boolean;
      error?: string;
      mode?: string;
    };
  },
  // Note for non-coders: calendar invites are separate emails that can add/edit/cancel events in people's calendars.
  async sendCalendarInvite(input: {
    pollId: string;
    date: string;
    startTime: string;
    endTime: string;
    inviteeProfileIds: string[];
    action: "create" | "update" | "cancel";
    title?: string;
  }): Promise<{
    success: boolean;
    sent: number;
    total: number;
  }> {
    await requireAdmin("Endast administratörer kan skicka kalenderinbjudningar.");

    if (typeof supabaseAnonKey === "string" && supabaseAnonKey.startsWith("sb_publishable_")) {
      // Note for non-coders: publishable keys can browse data but cannot authenticate Edge Function calls.
      throw new Error(
        "Miljöfel: VITE_SUPABASE_ANON_KEY använder sb_publishable_*. Byt till Supabase anon public key i Project Settings → API för att kunna skicka mail.",
      );
    }

    const { data, error } = await supabase.functions.invoke("availability-calendar-invite", {
      body: {
        pollId: input.pollId,
        date: input.date,
        startTime: input.startTime,
        endTime: input.endTime,
        inviteeProfileIds: input.inviteeProfileIds,
        action: input.action,
        title: input.title || null,
      },
    });

    if (error) {
      throw new Error(error.message || "Kunde inte skicka kalenderinbjudan.");
    }

    if (!data?.success) {
      throw new Error(data?.error || "Kunde inte skicka kalenderinbjudan.");
    }

    return data as {
      success: boolean;
      sent: number;
      total: number;
    };
  },

  // Note for non-coders: "upsert" means create-or-update in one safe database call.
  async upsertVote(day: AvailabilityPollDay, slotPreferences: AvailabilitySlot[] | null): Promise<void> {
    const { data: sessionData } = await supabase.auth.getSession();
    const currentUser = sessionData.session?.user;

    if (!currentUser) {
      throw new Error("Du måste vara inloggad för att rösta.");
    }

    const normalized = slotPreferences && slotPreferences.length > 0 ? slotPreferences : null;

    const { error } = await supabase.from("availability_votes").upsert(
      {
        poll_day_id: day.id,
        profile_id: currentUser.id,
        slot: normalized && normalized.length === 1 ? normalized[0] : null,
        slot_preferences: normalized,
      },
      { onConflict: "poll_day_id,profile_id" },
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
