import { useMemo } from "react";
import { filterMatches } from "../utils/filters";
import { calculateElo } from "../utils/elo";
import { getRecentResults } from "../utils/stats";

export function usePadelData(matches, filter, profiles = []) {
  return useMemo(() => {
    const filteredMatches = filterMatches(matches, filter);
    const eloPlayers = calculateElo(filteredMatches, profiles);

    const playersWithTrend = eloPlayers.map(p => ({
      ...p,
      recentResults: getRecentResults(filteredMatches, p.name),
    }));

    return {
      filteredMatches,
      players: eloPlayers,
      playersWithTrend,
    };
  }, [matches, filter, profiles]);
}
