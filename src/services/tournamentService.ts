import { supabase } from "../supabaseClient";
import { GUEST_ID } from "../utils/guest";

export const tournamentService = {
  async getTournaments() {
    const { data, error } = await supabase
      .from("mexicana_tournaments")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getTournamentDetails(tournamentId: string) {
    if (!tournamentId) return { participants: [], rounds: [] };

    const [
      { data: participantRows, error: participantError },
      { data: roundRows, error: roundError }
    ] = await Promise.all([
      supabase
        .from("mexicana_participants")
        .select("profile_id")
        .eq("tournament_id", tournamentId),
      supabase
        .from("mexicana_rounds")
        .select("*")
        .eq("tournament_id", tournamentId)
        .order("round_number", { ascending: true }),
    ]);

    if (participantError) throw participantError;
    if (roundError) throw roundError;

    const participants = participantRows?.map(row => row.profile_id === null ? GUEST_ID : row.profile_id) || [];

    const rounds = (roundRows || []).map(round => ({
      ...round,
      team1_ids: (round.team1_ids || []).map(id => id === null ? GUEST_ID : id),
      team2_ids: (round.team2_ids || []).map(id => id === null ? GUEST_ID : id),
      resting_ids: (round.resting_ids || []).map(id => id === null ? GUEST_ID : id),
    }));

    return { participants, rounds };
  },

  async getTournamentResults() {
    const { data, error } = await supabase.from("mexicana_results").select("*");
    if (error) throw error;

    const grouped = (data || []).reduce((acc: any, row: any) => {
      if (!row?.tournament_id) return acc;
      if (!acc[row.tournament_id]) acc[row.tournament_id] = [];
      acc[row.tournament_id].push(row);
      return acc;
    }, {});
    return grouped;
  },

  async getTournamentResultsWithTypes() {
    const { data, error } = await supabase
      .from("mexicana_results")
      .select("*, mexicana_tournaments(tournament_type)");
    if (error) throw error;

    return (data || []).map((row: any) => ({
      ...row,
      tournament_type: row.mexicana_tournaments?.tournament_type || "mexicano",
    }));
  },

  async deleteParticipants(tournamentId: string) {
    const { error } = await supabase.from("mexicana_participants").delete().eq("tournament_id", tournamentId);
    if (error) throw error;
  },

  async createParticipants(participants: any[]) {
    const { error } = await supabase.from("mexicana_participants").insert(participants);
    if (error) throw error;
  },

  async deleteTournament(tournamentId: string) {
    const { error } = await supabase.from("mexicana_tournaments").delete().eq("id", tournamentId);
    if (error) throw error;
  },

  async updateTournament(tournamentId: string, updates: any) {
    const sanitized = { ...updates };
    if (sanitized.name !== undefined) sanitized.name = sanitized.name?.trim();
    if (sanitized.location !== undefined) sanitized.location = sanitized.location?.trim();

    if (sanitized.name === "") {
      throw new Error("Turneringsnamn får inte vara tomt");
    }

    const { error } = await supabase.from("mexicana_tournaments").update(sanitized).eq("id", tournamentId);
    if (error) throw error;
  },

  async createTournamentResults(results: any[]) {
    const { error } = await supabase.from("mexicana_results").insert(results);
    if (error) throw error;
  },

  async createTournament(tournament: any) {
    const sanitized = {
      ...tournament,
      name: tournament.name?.trim(),
      location: tournament.location?.trim(),
    };
    if (!sanitized.name) {
      throw new Error("Turneringsnamn får inte vara tomt");
    }

    const { data, error } = await supabase
      .from("mexicana_tournaments")
      .insert(sanitized)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async createRounds(rounds: any[]) {
    const { error } = await supabase.from("mexicana_rounds").insert(rounds);
    if (error) throw error;
  },

  async updateRound(roundId: string, updates: any) {
    const { error } = await supabase
      .from("mexicana_rounds")
      .update(updates)
      .eq("id", roundId);
    if (error) throw error;
  }
};
