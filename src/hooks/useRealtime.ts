import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../supabaseClient";

export const useRealtime = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const matchesChannel = supabase
      .channel("matches-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["matches"] });
        }
      )
      .subscribe();

    const profilesChannel = supabase
      .channel("profiles-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["profiles"] });
        }
      )
      .subscribe();

    const tournamentResultsChannel = supabase
      .channel("mexicana-results-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mexicana_results" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["tournamentResults"] });
        }
      )
      .subscribe();

    const tournamentsChannel = supabase
      .channel("mexicana-tournaments-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mexicana_tournaments" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["tournaments"] });
          queryClient.invalidateQueries({ queryKey: ["tournamentDetails"] });
        }
      )
      .subscribe();

    const roundsChannel = supabase
      .channel("mexicana-rounds-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mexicana_rounds" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["tournamentDetails"] });
        }
      )
      .subscribe();

    const participantsChannel = supabase
      .channel("mexicana-participants-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mexicana_participants" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["tournamentDetails"] });
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
