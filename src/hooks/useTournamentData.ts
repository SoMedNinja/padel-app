import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../utils/queryKeys";
import { padelData } from "../data/padelData";

export function useTournaments() {
  return useQuery({
    queryKey: queryKeys.tournaments(),
    queryFn: () => padelData.tournaments.list(),
  });
}

export function useTournamentDetails(tournamentId: string) {
  return useQuery({
    queryKey: queryKeys.tournamentDetails(tournamentId),
    queryFn: () => padelData.tournaments.details(tournamentId),
    enabled: !!tournamentId,
  });
}

export function useTournamentResults() {
  return useQuery({
    queryKey: queryKeys.tournamentResultsHistory(),
    queryFn: () => padelData.tournaments.results(),
  });
}
