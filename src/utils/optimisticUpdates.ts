import { QueryClient, QueryKey } from "@tanstack/react-query";
import { MatchCreateInput } from "../services/matchService";
import { Match, MatchFilter } from "../types";
import { queryKeys } from "./queryKeys";

export const createOptimisticMatch = (newMatchInput: MatchCreateInput): Match => {
  const input = Array.isArray(newMatchInput) ? newMatchInput[0] : newMatchInput;

  return {
    id: `temp-${Date.now()}`, // Temporary ID
    created_at: new Date().toISOString(),
    team1: Array.isArray(input.team1) ? input.team1 : [input.team1],
    team2: Array.isArray(input.team2) ? input.team2 : [input.team2],
    team1_ids: input.team1_ids || [],
    team2_ids: input.team2_ids || [],
    team1_sets: input.team1_sets,
    team2_sets: input.team2_sets,
    score_type: input.score_type || "sets",
    score_target: input.score_target || null,
    team1_serves_first: input.team1_serves_first ?? true,
    source_tournament_id: input.source_tournament_id || null,
    source_tournament_type: input.source_tournament_type || null,
    // created_by will be filled by the backend, but we can assume current user for now if we had context
    created_by: "current-user-placeholder",
  };
};

export interface OptimisticUpdateContext {
  previousQueries: Array<{ queryKey: QueryKey; data: any }>;
}

export const performOptimisticMatchUpdate = (
  queryClient: QueryClient,
  newMatchInput: MatchCreateInput
): OptimisticUpdateContext => {
  const optimisticMatch = createOptimisticMatch(newMatchInput);

  // We want to update all relevant queries. Matches are typically fetched via:
  // 1. queryKeys.matches(filter) -> ["matches", filter] or ["matches"]
  // 2. queryKeys.matchesInfinite(filter) -> ["matches-infinite", filter] or ["matches-infinite"]
  const matchQueries = queryClient.getQueriesData({ queryKey: queryKeys.matches() });
  const infiniteQueries = queryClient.getQueriesData({ queryKey: queryKeys.matchesInfiniteBase() });

  const allQueries = [...matchQueries, ...infiniteQueries];
  const previousQueries: Array<{ queryKey: QueryKey; data: any }> = [];

  for (const [queryKey, oldData] of allQueries) {
    if (!oldData) continue;

    // Check if the match fits the filter logic derived from the query key
    // The query key structure is usually [string, FilterObject]
    const filter = (queryKey[1] as MatchFilter) || { type: "all" };

    // Basic client-side filtering to avoid showing irrelevant matches
    let matchesFilter = true;

    if (filter.type === "short") {
      // Short match logic: <= 3 sets or < 15 points (simplified logic matching useInfiniteMatches)
      // useInfiniteMatches logic: lte("team1_sets", 3).lte("team2_sets", 3)
      if (optimisticMatch.team1_sets > 3 || optimisticMatch.team2_sets > 3) {
        matchesFilter = false;
      }
    } else if (filter.type === "long") {
      // Long match logic: >= 6 sets (simplified)
      // useInfiniteMatches logic: or("team1_sets.gte.6,team2_sets.gte.6")
      if (optimisticMatch.team1_sets < 6 && optimisticMatch.team2_sets < 6) {
        matchesFilter = false;
      }
    } else if (filter.type === "tournaments") {
      if (!optimisticMatch.source_tournament_id) {
        matchesFilter = false;
      }
    }
    // We skip date range filtering (last7, last30, range) as the new match is 'now' and likely fits,
    // and complex parsing is risky here. The server invalidation will correct any edge cases.

    if (!matchesFilter) continue;

    // Snapshot the previous data for rollback
    previousQueries.push({ queryKey, data: oldData });

    // Update the query data
    queryClient.setQueryData(queryKey, (old: any) => {
      if (!old) return old;

      // Handle Infinite Query structure ({ pages: Match[][], pageParams: ... })
      if (old.pages && Array.isArray(old.pages)) {
        const firstPage = old.pages[0];
        if (Array.isArray(firstPage)) {
          return {
            ...old,
            pages: [[optimisticMatch, ...firstPage], ...old.pages.slice(1)],
          };
        }
        return old;
      }

      // Handle Standard Query structure (Match[])
      if (Array.isArray(old)) {
        return [optimisticMatch, ...old];
      }

      return old;
    });
  }

  return { previousQueries };
};

export const rollbackOptimisticMatchUpdate = (
  queryClient: QueryClient,
  context: OptimisticUpdateContext | undefined
) => {
  if (context?.previousQueries) {
    for (const { queryKey, data } of context.previousQueries) {
      queryClient.setQueryData(queryKey, data);
    }
  }
};
