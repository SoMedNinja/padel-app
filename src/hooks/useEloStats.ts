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
  isFetching: boolean;
  lastUpdatedAt: number;
  hasCachedData: boolean;
}

export function useEloStats(): EloStats {
  // Note for non-coders: ELO calculation requires a comprehensive history. We request a large
  // bounded set to maintain correctness while avoiding completely unbounded results.
  const matchesQuery = useMatches({ type: "all", limit: 5000 });
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
    isFetching: matchesQuery.isFetching || profilesQuery.isFetching,
    // Note for non-coders: this timestamp helps the UI tell users when data was last confirmed by the server.
    lastUpdatedAt: Math.max(matchesQuery.dataUpdatedAt || 0, profilesQuery.dataUpdatedAt || 0),
    hasCachedData: allMatches.length > 0 || profiles.length > 0,
  };
}
