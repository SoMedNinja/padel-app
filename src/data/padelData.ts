import { matchService } from "../services/matchService";
import { profileService } from "../services/profileService";
import { tournamentService } from "../services/tournamentService";
import { MatchFilter } from "../types";

// Note for non-coders: this file is a "data layer" that groups all database reads in one place.
// Components and hooks can call these helpers instead of talking to the database directly.
export const padelData = {
  matches: {
    list: (filter: MatchFilter) => matchService.getMatches(filter),
  },
  profiles: {
    list: () => profileService.getProfiles(),
  },
  tournaments: {
    list: () => tournamentService.getTournaments(),
    details: (tournamentId: string) => tournamentService.getTournamentDetails(tournamentId),
    results: () => tournamentService.getTournamentResults(),
    resultsWithTypes: () => tournamentService.getTournamentResultsWithTypes(),
  },
};
