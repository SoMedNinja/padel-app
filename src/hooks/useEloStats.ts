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
  isError: boolean;
  error: Error | null;
  eloDeltaByMatch: Record<string, Record<string, number>>;
  eloRatingByMatch: Record<string, Record<string, number>>;
}

export function useEloStats(): EloStats {
  const matchesQuery = useMatches({ type: "all" });
  const profilesQuery = useProfiles();
  const { data: allMatches = [], isLoading: isLoadingMatches, isError: isMatchesError, error: matchesError } = matchesQuery;
  const { data: profiles = [], isLoading: isLoadingProfiles, isError: isProfilesError, error: profilesError } = profilesQuery;
  const isError = isMatchesError || isProfilesError;
  const error = (matchesError as Error) || (profilesError as Error) || null;

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
    isError,
    error,
    eloDeltaByMatch,
    eloRatingByMatch,
  };
}
