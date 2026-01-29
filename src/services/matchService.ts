import { supabase } from "../supabaseClient";
import { Match, MatchFilter } from "../types";

const getDateRange = (filter: MatchFilter) => {
  if (filter.type === "last7") {
    const start = new Date();
    start.setDate(start.getDate() - 7);
    return { start, end: new Date() };
  }
  if (filter.type === "last30") {
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return { start, end: new Date() };
  }
  if (filter.type === "range" && (filter.startDate || filter.endDate)) {
    const start = filter.startDate ? new Date(filter.startDate) : null;
    const end = filter.endDate ? new Date(filter.endDate) : null;
    if (start) start.setHours(0, 0, 0, 0);
    if (end) end.setHours(23, 59, 59, 999);
    return { start, end };
  }
  return null;
};

export const matchService = {
  async getMatches(filter?: MatchFilter): Promise<Match[]> {
    let query = supabase
      .from("matches")
      .select("*")
      .order("created_at", { ascending: false });

    if (filter) {
      if (filter.type === "short") {
        query = query.lte("team1_sets", 3).lte("team2_sets", 3);
      } else if (filter.type === "long") {
        query = query.or("team1_sets.gte.6,team2_sets.gte.6");
      } else if (filter.type === "tournaments") {
        query = query.not("source_tournament_id", "is", null);
      }

      const range = getDateRange(filter);
      if (range?.start) {
        query = query.gte("created_at", range.start.toISOString());
      }
      if (range?.end) {
        query = query.lte("created_at", range.end.toISOString());
      }
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as Match[];
  },

  async createMatch(match: any): Promise<void> {
    if (match.team1_sets !== undefined && (typeof match.team1_sets !== "number" || match.team1_sets < 0)) {
      throw new Error("Ogiltigt resultat för Lag 1");
    }
    if (match.team2_sets !== undefined && (typeof match.team2_sets !== "number" || match.team2_sets < 0)) {
      throw new Error("Ogiltigt resultat för Lag 2");
    }

    const { error } = await supabase
      .from("matches")
      .insert(match);
    if (error) throw error;
  },

  async updateMatch(matchId: string, updates: any): Promise<void> {
    if (updates.team1_sets !== undefined && (typeof updates.team1_sets !== "number" || updates.team1_sets < 0)) {
      throw new Error("Ogiltigt resultat för Lag 1");
    }
    if (updates.team2_sets !== undefined && (typeof updates.team2_sets !== "number" || updates.team2_sets < 0)) {
      throw new Error("Ogiltigt resultat för Lag 2");
    }

    const { error } = await supabase
      .from("matches")
      .update(updates)
      .eq("id", matchId);
    if (error) throw error;
  },

  async deleteMatch(matchId: string): Promise<void> {
    const { error } = await supabase
      .from("matches")
      .delete()
      .eq("id", matchId);
    if (error) throw error;
  },

  async deleteMatchesByTournamentId(tournamentId: string): Promise<void> {
    const { error } = await supabase
      .from("matches")
      .delete()
      .eq("source_tournament_id", tournamentId);
    if (error) throw error;
  },

};
