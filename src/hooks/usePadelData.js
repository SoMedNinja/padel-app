import { useMemo, useRef } from "react";
import { filterMatches } from "../utils/filters";
import { calculateElo } from "../utils/elo";
import { getRecentResults } from "../utils/stats";

export function usePadelData(matches, filter, profiles = []) {
  const cacheRef = useRef({
    matches: null,
    profiles: null,
    data: new Map(),
  });

  return useMemo(() => {
    if (cacheRef.current.matches !== matches || cacheRef.current.profiles !== profiles) {
      cacheRef.current = {
        matches,
        profiles,
        data: new Map(),
      };
    }

    const cached = cacheRef.current.data.get(filter);
    if (cached) return cached;

    const filteredMatches = filterMatches(matches, filter);
    const eloPlayers = calculateElo(filteredMatches, profiles);
    const avatarMap = new Map(
      profiles.map(profile => [profile.id, profile.avatar_url || null])
    );

    const playersWithTrend = eloPlayers.map(p => ({
      ...p,
      avatarUrl: p.avatarUrl || avatarMap.get(p.id) || null,
      recentResults: getRecentResults(filteredMatches, p.name),
    }));

    const result = {
      filteredMatches,
      players: eloPlayers,
      playersWithTrend,
    };

    cacheRef.current.data.set(filter, result);
    return result;
  }, [matches, filter, profiles]);
}
