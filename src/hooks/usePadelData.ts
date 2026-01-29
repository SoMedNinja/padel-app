import { useMemo } from "react";
import { filterMatches } from "../utils/filters";
import { calculateElo } from "../utils/elo";
import { Match, MatchFilter, Profile, PlayerStats } from "../types";

export function usePadelData(matches: Match[], filter: MatchFilter, profiles: Profile[] = []) {
  return useMemo(() => {
    const filteredMatches = filterMatches(matches, filter);
    const eloPlayers = calculateElo(filteredMatches, profiles);
    const avatarMap = new Map(
      profiles.map(profile => [profile.id, profile.avatar_url || null])
    );

    const playersWithTrend: PlayerStats[] = eloPlayers.map(p => ({
      ...p,
      avatarUrl: p.avatarUrl || avatarMap.get(p.id) || null,
      // Optimization: use recentResults already calculated in calculateElo to avoid O(P * M) redundant re-scan
      recentResults: p.recentResults.slice(-5),
    }));

    return {
      filteredMatches,
      players: eloPlayers,
      playersWithTrend,
    };
  }, [matches, filter, profiles]);
}
