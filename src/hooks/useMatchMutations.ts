import { useMutation, useQueryClient } from "@tanstack/react-query";
import { matchService, MatchCreateInput } from "../services/matchService";
import { Match } from "../types";
import { queryKeys } from "../utils/queryKeys";
import { invalidateStatsData } from "../data/queryInvalidation";

export const useCreateMatch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newMatch: MatchCreateInput) => matchService.createMatch(newMatch),
    onMutate: async (newMatchInput) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      // We specifically target the 'all' list which is most likely to show the new match
      await queryClient.cancelQueries({ queryKey: queryKeys.matches({ type: "all" }) });

      // Snapshot the previous value
      const previousMatches = queryClient.getQueryData<Match[]>(queryKeys.matches({ type: "all" }));

      // Optimistically update to the new value
      if (previousMatches) {
        // We need to convert the input (MatchCreateInput) to a Match object for the UI
        // This is a best-effort conversion for immediate display
        const input = Array.isArray(newMatchInput) ? newMatchInput[0] : newMatchInput;

        const optimisticMatch: Match = {
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

        queryClient.setQueryData<Match[]>(queryKeys.matches({ type: "all" }), (old: Match[] | undefined) => {
          return old ? [optimisticMatch, ...old] : [optimisticMatch];
        });
      }

      // Return a context object with the snapshotted value
      return { previousMatches };
    },
    onError: (_err, _newMatch, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousMatches) {
        queryClient.setQueryData(queryKeys.matches({ type: "all" }), context.previousMatches);
      }
    },
    onSettled: () => {
      // Always refetch after error or success.
      invalidateStatsData(queryClient);
    },
  });
};
