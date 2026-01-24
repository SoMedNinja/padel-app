import { useMemo } from "react";
import { filterMatches } from "../utils/filters";
import { calculateElo } from "../utils/elo";
import { getRecentResults } from "../utils/stats";
import { Match, Profile, PlayerStats } from "../types";

export function usePadelData(matches: Match[], filter: string, profiles: Profile[] = []) {
  return useMemo(() => {
    const filteredMatches = filterMatches(matches, filter);
    const eloPlayers = calculateElo(filteredMatches, profiles);
    const avatarMap = new Map(
      profiles.map(profile => [profile.id, profile.avatar_url || null])
    );

    const playersWithTrend: PlayerStats[] = eloPlayers.map(p => ({
      ...p,
      avatarUrl: p.avatarUrl || avatarMap.get(p.id) || null,
      recentResults: getRecentResults(filteredMatches, p.name),
    }));

    return {
      filteredMatches,
      players: eloPlayers,
      playersWithTrend,
    };
  }, [matches, filter, profiles]);
}
