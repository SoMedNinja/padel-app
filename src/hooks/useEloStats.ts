import { useMemo } from "react";
import { useMatches } from "./useMatches";
import { useProfiles } from "./useProfiles";
import { calculateEloWithStats } from "../utils/elo";
import { Match, PlayerStats, Profile } from "../types";

export interface EloStats {
  eloPlayers: PlayerStats[];
  allMatches: Match[];
  profiles: Profile[];
  isLoading: boolean;
  eloDeltaByMatch: Record<string, Record<string, number>>;
  eloRatingByMatch: Record<string, Record<string, number>>;
}

export function useEloStats(): EloStats {
  const { data: allMatches = [], isLoading: isLoadingMatches } = useMatches({ type: "all" });
  const { data: profiles = [], isLoading: isLoadingProfiles } = useProfiles();

  const { eloPlayers, eloDeltaByMatch, eloRatingByMatch } = useMemo(() => {
    if (isLoadingMatches || isLoadingProfiles) {
      return { eloPlayers: [], eloDeltaByMatch: {}, eloRatingByMatch: {} };
    }

    const { players, eloDeltaByMatch, eloRatingByMatch } = calculateEloWithStats(allMatches, profiles);

    return { eloPlayers: players, eloDeltaByMatch, eloRatingByMatch };
  }, [allMatches, profiles, isLoadingMatches, isLoadingProfiles]);

  return {
    eloPlayers,
    allMatches,
    profiles,
    isLoading: isLoadingMatches || isLoadingProfiles,
    eloDeltaByMatch,
    eloRatingByMatch,
  };
}
