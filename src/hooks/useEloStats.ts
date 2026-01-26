import { useMemo } from "react";
import { useMatches } from "./useMatches";
import { useProfiles } from "./useProfiles";
import { calculateElo } from "../utils/elo";
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

    const players = calculateElo(allMatches, profiles);
    const deltas: Record<string, Record<string, number>> = {};
    const ratings: Record<string, Record<string, number>> = {};

    players.forEach(player => {
      player.history.forEach(entry => {
        if (!deltas[entry.matchId]) deltas[entry.matchId] = {};
        if (!ratings[entry.matchId]) ratings[entry.matchId] = {};

        deltas[entry.matchId][player.id] = entry.delta;
        ratings[entry.matchId][player.id] = entry.elo;
      });
    });

    return { eloPlayers: players, eloDeltaByMatch: deltas, eloRatingByMatch: ratings };
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
