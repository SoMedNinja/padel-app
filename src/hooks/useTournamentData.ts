import { useQuery } from "@tanstack/react-query";
import { supabase } from "../supabaseClient";
import { GUEST_ID } from "../utils/guest";

export function useTournaments() {
  return useQuery({
    queryKey: ["tournaments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mexicana_tournaments")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useTournamentDetails(tournamentId: string) {
  return useQuery({
    queryKey: ["tournamentDetails", tournamentId],
    queryFn: async () => {
      if (!tournamentId) return { participants: [], rounds: [] };

      const [{ data: participantRows, error: participantError }, { data: roundRows, error: roundError }] =
        await Promise.all([
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
    enabled: !!tournamentId,
  });
}

export function useTournamentResults() {
  return useQuery({
    queryKey: ["tournamentResultsHistory"],
    queryFn: async () => {
      const { data, error } = await supabase.from("mexicana_results").select("*");
      if (error) throw error;

      const grouped = (data || []).reduce((acc: any, row: any) => {
        if (!row?.tournament_id) return acc;
        if (!acc[row.tournament_id]) acc[row.tournament_id] = [];
        acc[row.tournament_id].push(row);
        return acc;
      }, {});
      return grouped;
    }
  });
}
