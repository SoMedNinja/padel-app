import { useMemo } from "react";
import { filterMatches } from "../utils/filters";
import { calculateElo } from "../utils/elo";
import { Match, MatchFilter, Profile, PlayerStats } from "../types";

export function usePadelData(matches: Match[], filter: MatchFilter, profiles: Profile[] = []) {
  return useMemo(() => {
    const filteredMatches = filterMatches(matches, filter);
    const eloPlayers = calculateElo(filteredMatches, profiles);

    // Optimization: avoid redundant avatar mapping and extra player mapping pass.
    // calculateElo already populates avatarUrl and the full recentResults.
    // We only need to slice recentResults for the trend indicator if necessary,
    // but most components already handle the full list or perform their own slicing.
    const playersWithTrend: PlayerStats[] = eloPlayers.map(p => ({
      ...p,
      recentResults: p.recentResults.slice(-5),
    }));

    return {
      filteredMatches,
      players: eloPlayers,
      playersWithTrend,
    };
  }, [matches, filter, profiles]);
}
