import { useQuery } from "@tanstack/react-query";
import { supabase } from "../supabaseClient";
import { Match } from "../types";

export const useMatches = (filter: string) => {
  return useQuery({
    queryKey: ["matches", filter],
    queryFn: async () => {
      let query = supabase
        .from("matches")
        .select("*")
        .order("created_at", { ascending: false });

      if (filter === "short") {
        query = query.lte("team1_sets", 3).lte("team2_sets", 3);
      } else if (filter === "long") {
        query = query.or("team1_sets.gte.6,team2_sets.gte.6");
      } else if (filter === "tournaments") {
        query = query.not("source_tournament_id", "is", null);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Match[];
    },
  });
};
