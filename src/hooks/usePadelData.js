import { useMemo } from "react";
import { filterMatches } from "../utils/filters";
import { calculateElo } from "../utils/elo";
import { getRecentResults } from "../utils/stats";

export function usePadelData(matches, filter) {
  return useMemo(() => {
    const filteredMatches = filterMatches(matches, filter);
    const players = calculateElo(filteredMatches);

    const playersWithTrend = players.map(p => ({
      ...p,
      recentResults: getRecentResults(filteredMatches, p.name),
    }));

    return {
      filteredMatches,
      players,
      playersWithTrend,
    };
  }, [matches, filter]);
}
