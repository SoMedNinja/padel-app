import { supabase } from "../supabaseClient";
import { GUEST_ID } from "../utils/guest";
import { checkIsAdmin } from "./authUtils";

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
    const { data: sessionData } = await supabase.auth.getSession();
    const isAdmin = await checkIsAdmin(sessionData.session?.user?.id);
    if (!isAdmin) throw new Error("Endast administratörer kan radera deltagare.");

    const { error } = await supabase.from("mexicana_participants").delete().eq("tournament_id", tournamentId);
    if (error) throw error;
  },

  async createParticipants(participants: any[]) {
    const { data: sessionData } = await supabase.auth.getSession();
    const isAdmin = await checkIsAdmin(sessionData.session?.user?.id);
    if (!isAdmin) throw new Error("Endast administratörer kan lägga till deltagare.");

    const { error } = await supabase.from("mexicana_participants").insert(participants);
    if (error) throw error;
  },

  async deleteTournament(tournamentId: string) {
    const { data: sessionData } = await supabase.auth.getSession();
    const isAdmin = await checkIsAdmin(sessionData.session?.user?.id);
    if (!isAdmin) throw new Error("Endast administratörer kan radera turneringar.");

    // Note for non-coders: this calls a database function that deletes related data and the
    // tournament in one transaction, so we don't leave half-deleted records behind.
    const { error } = await supabase.rpc("delete_mexicana_tournament", {
      target_tournament_id: tournamentId,
    });
    if (error) throw error;
  },

  async updateTournament(tournamentId: string, updates: any) {
    const { data: sessionData } = await supabase.auth.getSession();
    const isAdmin = await checkIsAdmin(sessionData.session?.user?.id);
    if (!isAdmin) throw new Error("Endast administratörer kan ändra turneringar.");

    const sanitized = { ...updates };
    delete sanitized.id;
    delete sanitized.created_at;

    if (sanitized.name !== undefined) {
      sanitized.name = sanitized.name?.trim();
      if (sanitized.name === "") {
        throw new Error("Turneringsnamn får inte vara tomt");
      }
      if (sanitized.name.length > 50) {
        throw new Error("Turneringsnamnet är för långt (max 50 tecken)");
      }
    }

    if (sanitized.location !== undefined) {
      sanitized.location = sanitized.location?.trim();
      if (sanitized.location && sanitized.location.length > 50) {
        throw new Error("Platsen är för lång (max 50 tecken)");
      }
    }

    const { error } = await supabase.from("mexicana_tournaments").update(sanitized).eq("id", tournamentId);
    if (error) throw error;
  },

  async createTournamentResults(results: any[]) {
    const { data: sessionData } = await supabase.auth.getSession();
    const isAdmin = await checkIsAdmin(sessionData.session?.user?.id);
    if (!isAdmin) throw new Error("Endast administratörer kan registrera turneringsresultat.");

    // Note for non-coders: we upsert by tournament+player so re-saving a tournament updates
    // the same rows instead of crashing with a duplicate key error.
    const { error } = await supabase
      .from("mexicana_results")
      .upsert(results, { onConflict: "tournament_id,profile_id" });
    if (error) throw error;
  },

  async createTournament(tournament: any) {
    const { data: sessionData } = await supabase.auth.getSession();
    const isAdmin = await checkIsAdmin(sessionData.session?.user?.id);
    if (!isAdmin) throw new Error("Endast administratörer kan skapa turneringar.");

    const sanitized = {
      ...tournament,
      name: tournament.name?.trim(),
      location: tournament.location?.trim(),
    };
    delete sanitized.id;
    delete sanitized.created_at;

    if (!sanitized.name) {
      throw new Error("Turneringsnamn får inte vara tomt");
    }
    if (sanitized.name.length > 50) {
      throw new Error("Turneringsnamnet är för långt (max 50 tecken)");
    }
    if (sanitized.location && sanitized.location.length > 50) {
      throw new Error("Platsen är för lång (max 50 tecken)");
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
    const { data: sessionData } = await supabase.auth.getSession();
    const isAdmin = await checkIsAdmin(sessionData.session?.user?.id);
    if (!isAdmin) throw new Error("Endast administratörer kan skapa rundor.");

    const { error } = await supabase.from("mexicana_rounds").insert(rounds);
    if (error) throw error;
  },

  async updateRound(roundId: string, updates: any) {
    const { data: sessionData } = await supabase.auth.getSession();
    const isAdmin = await checkIsAdmin(sessionData.session?.user?.id);
    if (!isAdmin) throw new Error("Endast administratörer kan uppdatera rundor.");

    const filteredUpdates = { ...updates };
    delete filteredUpdates.id;
    delete filteredUpdates.tournament_id;
    delete filteredUpdates.created_at;

    const { error } = await supabase
      .from("mexicana_rounds")
      .update(filteredUpdates)
      .eq("id", roundId);
    if (error) throw error;
  }
};
