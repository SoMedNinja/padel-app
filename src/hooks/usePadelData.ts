import { useMemo } from "react";
import { filterMatches } from "../utils/filters";
import { calculateElo } from "../utils/elo";
import { Match, MatchFilter, Profile, PlayerStats } from "../types";

export function usePadelData(matches: Match[], filter: MatchFilter, profiles: Profile[] = []) {
  return useMemo(() => {
    const filteredMatches = filterMatches(matches, filter);
    const eloPlayers = calculateElo(filteredMatches, profiles);

    // Optimization: avoid redundant avatar mapping and extra player mapping pass.
    // calculateElo already populates avatarUrl, trend, and streak.
    // We reuse the same array to avoid O(P) object allocations.
    return {
      filteredMatches,
      players: eloPlayers,
      playersWithTrend: eloPlayers,
    };
  }, [matches, filter, profiles]);
}
