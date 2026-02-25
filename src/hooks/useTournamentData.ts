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

export function useTournamentParticipants(tournamentId: string) {
  return useQuery({
    queryKey: queryKeys.tournamentParticipants(tournamentId),
    queryFn: () => padelData.tournaments.participants(tournamentId),
    enabled: !!tournamentId,
  });
}

export function useTournamentRounds(tournamentId: string) {
  return useQuery({
    queryKey: queryKeys.tournamentRounds(tournamentId),
    queryFn: () => padelData.tournaments.rounds(tournamentId),
    enabled: !!tournamentId,
  });
}

export function useTournamentResults() {
  return useQuery({
    queryKey: queryKeys.tournamentResultsHistory(),
    queryFn: () => padelData.tournaments.results(),
  });
}

export function useTournamentResultsWithTypes() {
  return useQuery({
    queryKey: queryKeys.tournamentResults(),
    queryFn: () => padelData.tournaments.resultsWithTypes(),
  });
}
