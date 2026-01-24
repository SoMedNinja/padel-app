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

    return () => {
      supabase.removeChannel(matchesChannel);
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(tournamentResultsChannel);
    };
  }, [queryClient]);
};
