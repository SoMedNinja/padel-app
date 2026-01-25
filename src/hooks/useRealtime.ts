import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../supabaseClient";
import { queryKeys } from "../utils/queryKeys";

export const useRealtime = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const matchesChannel = supabase
      .channel("matches-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches" },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.matches() });
          queryClient.invalidateQueries({ queryKey: queryKeys.matchesInfiniteBase() });
        }
      )
      .subscribe();

    const profilesChannel = supabase
      .channel("profiles-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.profiles() });
        }
      )
      .subscribe();

    const tournamentResultsChannel = supabase
      .channel("mexicana-results-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mexicana_results" },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.tournamentResults() });
        }
      )
      .subscribe();

    const tournamentsChannel = supabase
      .channel("mexicana-tournaments-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mexicana_tournaments" },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.tournaments() });
          queryClient.invalidateQueries({ queryKey: queryKeys.tournamentDetails() });
        }
      )
      .subscribe();

    const roundsChannel = supabase
      .channel("mexicana-rounds-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mexicana_rounds" },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.tournamentDetails() });
        }
      )
      .subscribe();

    const participantsChannel = supabase
      .channel("mexicana-participants-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mexicana_participants" },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.tournamentDetails() });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(matchesChannel);
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(tournamentResultsChannel);
      supabase.removeChannel(tournamentsChannel);
      supabase.removeChannel(roundsChannel);
      supabase.removeChannel(participantsChannel);
    };
  }, [queryClient]);
};
