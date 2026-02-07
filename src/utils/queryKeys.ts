import { MatchFilter } from "../types";

// Note for non-coders: Query keys are labels React Query uses to cache and refresh data consistently.
export const queryKeys = {
  profiles: () => ["profiles"] as const,
  matches: (filter?: MatchFilter) => (filter ? ["matches", filter] : ["matches"]) as const,
  matchesInfinite: (filter: MatchFilter) => ["matches-infinite", filter] as const,
  matchesInfiniteBase: () => ["matches-infinite"] as const,
  tournaments: () => ["tournaments"] as const,
  // Note for non-coders: this base key lets us refresh any tournament detail screen, no matter which tournament is open.
  tournamentDetailsBase: () => ["tournamentDetails"] as const,
  tournamentDetails: (tournamentId?: string) =>
    ["tournamentDetails", tournamentId] as const,
  tournamentResults: () => ["tournamentResults"] as const,
  tournamentResultsHistory: () => ["tournamentResultsHistory"] as const,
  availabilityPolls: () => ["availabilityPolls"] as const,
  scheduledGames: () => ["availabilityScheduledGames"] as const,
};
