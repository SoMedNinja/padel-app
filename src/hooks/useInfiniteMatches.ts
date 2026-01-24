import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "../supabaseClient";
import { Match } from "../types";

const PAGE_SIZE = 20;

export const useInfiniteMatches = (filter: string) => {
  return useInfiniteQuery({
    queryKey: ["matches-infinite", filter],
    queryFn: async ({ pageParam }: { pageParam: string | null }) => {
      let query = supabase
        .from("matches")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      if (pageParam) {
        query = query.lt("created_at", pageParam);
      }

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
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return lastPage[lastPage.length - 1].created_at;
    },
  });
};
