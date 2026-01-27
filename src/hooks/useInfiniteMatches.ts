import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "../supabaseClient";
import { Match, MatchFilter } from "../types";
import { queryKeys } from "../utils/queryKeys";

const PAGE_SIZE = 20;

// Note for non-coders: we keep earlier pages on screen while loading more.
const keepPreviousData = <T,>(previousData: T | undefined) => previousData;

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

export const useInfiniteMatches = (filter: MatchFilter) => {
  return useInfiniteQuery({
    queryKey: queryKeys.matchesInfinite(filter),
    placeholderData: keepPreviousData,
    queryFn: async ({ pageParam }: { pageParam: string | null }) => {
      let query = supabase
        .from("matches")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      if (pageParam) {
        query = query.lt("created_at", pageParam);
      }

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
