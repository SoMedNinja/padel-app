import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../supabaseClient";
import { invalidateMatchData, invalidateProfileData, invalidateTournamentData } from "../data/queryInvalidation";

export const useRealtime = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const matchesChannel = supabase
      .channel("matches-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches" },
        () => {
          invalidateMatchData(queryClient);
        }
      )
      .subscribe();

    const profilesChannel = supabase
      .channel("profiles-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => {
          invalidateProfileData(queryClient);
        }
      )
      .subscribe();

    const tournamentResultsChannel = supabase
      .channel("mexicana-results-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mexicana_results" },
        () => {
          invalidateTournamentData(queryClient);
        }
      )
      .subscribe();

    const tournamentsChannel = supabase
      .channel("mexicana-tournaments-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mexicana_tournaments" },
        () => {
          invalidateTournamentData(queryClient);
        }
      )
      .subscribe();

    const roundsChannel = supabase
      .channel("mexicana-rounds-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mexicana_rounds" },
        () => {
          invalidateTournamentData(queryClient);
        }
      )
      .subscribe();

    const participantsChannel = supabase
      .channel("mexicana-participants-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mexicana_participants" },
        () => {
          invalidateTournamentData(queryClient);
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
