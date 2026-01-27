import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../utils/queryKeys";
import { tournamentService } from "../services/tournamentService";

export function useTournaments() {
  return useQuery({
    queryKey: queryKeys.tournaments(),
    queryFn: () => tournamentService.getTournaments(),
  });
}

export function useTournamentDetails(tournamentId: string) {
  return useQuery({
    queryKey: queryKeys.tournamentDetails(tournamentId),
    queryFn: () => tournamentService.getTournamentDetails(tournamentId),
    enabled: !!tournamentId,
  });
}

export function useTournamentResults() {
  return useQuery({
    queryKey: queryKeys.tournamentResultsHistory(),
    queryFn: () => tournamentService.getTournamentResults(),
  });
}
