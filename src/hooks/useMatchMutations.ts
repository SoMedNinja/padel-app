import { useMutation, useQueryClient } from "@tanstack/react-query";
import { matchService, MatchCreateInput } from "../services/matchService";
import { queryKeys } from "../utils/queryKeys";
import { invalidateStatsData } from "../data/queryInvalidation";
import { performOptimisticMatchUpdate, rollbackOptimisticMatchUpdate } from "../utils/optimisticUpdates";

export const useCreateMatch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newMatch: MatchCreateInput) => matchService.createMatch(newMatch),
    onMutate: async (newMatchInput) => {
      // Cancel outgoing refetches to prevent overwriting our optimistic update
      // We cancel all match-related queries to be safe
      await queryClient.cancelQueries({ queryKey: queryKeys.matches() });
      await queryClient.cancelQueries({ queryKey: queryKeys.matchesInfiniteBase() });

      // Perform the update and get snapshot
      return performOptimisticMatchUpdate(queryClient, newMatchInput);
    },
    onError: (_err, _newMatch, context) => {
      // Rollback on error
      if (context) {
        rollbackOptimisticMatchUpdate(queryClient, context);
      }
    },
    onSettled: () => {
      // Always refetch after error or success.
      invalidateStatsData(queryClient);
    },
  });
};
