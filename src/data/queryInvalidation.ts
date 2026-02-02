import { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "../utils/queryKeys";

// Note for non-coders: these helpers group "refresh" calls so every page stays in sync.
export const invalidateMatchData = (queryClient: QueryClient) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.matches() });
  queryClient.invalidateQueries({ queryKey: queryKeys.matchesInfiniteBase() });
};

export const invalidateProfileData = (queryClient: QueryClient) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.profiles() });
};

export const invalidateTournamentData = (queryClient: QueryClient, tournamentId?: string) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.tournaments() });
  // Note for non-coders: we invalidate the base key so any tournament detail cache refreshes.
  queryClient.invalidateQueries({ queryKey: ["tournamentDetails"] });
  if (tournamentId) {
    queryClient.invalidateQueries({ queryKey: queryKeys.tournamentDetails(tournamentId) });
  }
  queryClient.invalidateQueries({ queryKey: queryKeys.tournamentResults() });
  queryClient.invalidateQueries({ queryKey: queryKeys.tournamentResultsHistory() });
};

export const refetchTournamentDetails = (queryClient: QueryClient, tournamentId?: string) => {
  // Note for non-coders: refetch forces a "fresh pull" right now, even if the cache is still valid.
  queryClient.refetchQueries({ queryKey: ["tournamentDetails"] });
  if (tournamentId) {
    queryClient.refetchQueries({ queryKey: queryKeys.tournamentDetails(tournamentId) });
  }
};

export const invalidateStatsData = (queryClient: QueryClient) => {
  invalidateMatchData(queryClient);
  invalidateProfileData(queryClient);
  invalidateTournamentData(queryClient);
};
