import { useMutation, useQueryClient } from "@tanstack/react-query";
import { matchService, MatchCreateInput } from "../services/matchService";
import { Match } from "../types";
import { queryKeys } from "../utils/queryKeys";
import { invalidateStatsData } from "../data/queryInvalidation";
import { createOptimisticMatch } from "../utils/optimisticUpdates";

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
        const optimisticMatch = createOptimisticMatch(newMatchInput);

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
