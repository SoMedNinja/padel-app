import React, { useMemo } from "react";
import MVP from "../Components/MVP";
import EloLeaderboard from "../Components/EloLeaderboard";
import { HeadToHeadSection } from "../Components/PlayerSection";
import FilterBar from "../Components/FilterBar";
import { Box, Skeleton, Stack } from "@mui/material";
import PullToRefresh from "react-simple-pull-to-refresh";
import { useStore } from "../store/useStore";

import { useMatches } from "../hooks/useMatches";
import { useProfiles } from "../hooks/useProfiles";
import { usePadelData } from "../hooks/usePadelData";
import { Match, Profile, TournamentResult } from "../types";
import { useScrollToFragment } from "../hooks/useScrollToFragment";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
import { calculateElo } from "../utils/elo";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../utils/queryKeys";
import { CircularProgress, Typography } from "@mui/material";
import { supabase } from "../supabaseClient";
import { PostgrestError } from "@supabase/supabase-js";

type TournamentResultRow = TournamentResult & {
  mexicana_tournaments?: { tournament_type?: string | null } | null;
};

export default function Dashboard() {
  const { matchFilter, setMatchFilter, user, isGuest } = useStore();
  const {
    data: profiles = [] as Profile[],
    isLoading: isLoadingProfiles,
    isError: isProfilesError,
    error: profilesError,
    refetch: refetchProfiles
  } = useProfiles();
  const {
    data: matches = [] as Match[],
    isLoading: isLoadingMatches,
    isError: isMatchesError,
    error: matchesError,
    refetch: refetchMatches
  } = useMatches(matchFilter);
  const {
    data: allMatches = [] as Match[],
    isLoading: isLoadingAllMatches,
    refetch: refetchAllMatches,
  } = useMatches({ type: "all" });

  const {
    data: tournamentResults = [] as TournamentResult[],
    isLoading: isLoadingTournamentResults,
    refetch: refetchTournamentResults,
  } = useQuery({
    queryKey: queryKeys.tournamentResults(),
    queryFn: async () => {
      const { data, error } = (await supabase
        .from("mexicana_results")
        .select("*, mexicana_tournaments(tournament_type)")) as {
        data: TournamentResultRow[] | null;
        error: PostgrestError | null;
      };
      if (error) throw error;
      return (data || []).map((row) => ({
        ...row,
        tournament_type: row.mexicana_tournaments?.tournament_type || "mexicano",
      })) as TournamentResult[];
    },
  });

  useScrollToFragment();

  const handleRefresh = usePullToRefresh([
    refetchProfiles,
    refetchMatches,
    refetchAllMatches,
    refetchTournamentResults,
  ]);

  const { filteredMatches, playersWithTrend } = usePadelData(matches, matchFilter, profiles);
  // Note for non-coders: we build a "global" ELO list from all matches so the leaderboard rating
  // and other "current ELO" labels stay steady even when the filter shows a smaller slice of games.
  const allEloPlayers = useMemo(
    () => calculateElo(allMatches, profiles),
    [allMatches, profiles]
  );
  const allEloMap = useMemo(
    () => new Map(allEloPlayers.map(player => [player.id, player.elo])),
    [allEloPlayers]
  );
  const leaderboardPlayers = useMemo(
    () =>
      playersWithTrend.map(player => ({
        ...player,
        elo: allEloMap.get(player.id) ?? player.elo,
      })),
    [allEloMap, playersWithTrend]
  );
  const hasError = isProfilesError || isMatchesError;
  const errorMessage =
    (profilesError as Error | undefined)?.message ||
    (matchesError as Error | undefined)?.message ||
    "Något gick fel när data hämtades.";

  return (
    <PullToRefresh
      onRefresh={handleRefresh}
      pullingContent={
        <Box sx={{ p: 2, textAlign: 'center', opacity: 0.6 }}>
          <Typography variant="body2">Dra för att uppdatera...</Typography>
        </Box>
      }
      refreshingContent={
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <CircularProgress size={24} />
        </Box>
      }
    >
    <section id="dashboard" className="page-section">
      {hasError && (
        <div className="notice-banner error" role="alert">
          <span>{errorMessage}</span>
          <button type="button" className="ghost-button" onClick={handleRefresh}>
            Försök igen
          </button>
        </div>
      )}
      {(isLoadingProfiles || isLoadingMatches || isLoadingAllMatches || isLoadingTournamentResults) ? (
        <Stack spacing={2} sx={{ mb: 2 }}>
          {/* Note for non-coders: Stack is a layout helper that evenly spaces items vertically. */}
          <Skeleton variant="rectangular" width={160} height={40} sx={{ borderRadius: "12px" }} />
          <Box className="mvp-grid">
            <Skeleton variant="rectangular" height={160} sx={{ borderRadius: "14px" }} />
            <Skeleton variant="rectangular" height={160} sx={{ borderRadius: "14px" }} />
          </Box>
          <Skeleton variant="rectangular" height={400} sx={{ borderRadius: "14px" }} />
        </Stack>
      ) : (
        <>
          <FilterBar filter={matchFilter} setFilter={setMatchFilter} />
          {!filteredMatches.length ? (
            <div className="notice-banner" role="status">
              <span>Inga matcher ännu. Lägg in din första match för att se statistik.</span>
            </div>
          ) : (
            <>
              <div className="mvp-grid">
                {/* Note for non-coders: MVP should use the full match history so its ELO gain totals
                    match the global ELO calculation, even when the filter is showing fewer games. */}
                <MVP
                  matches={allMatches}
                  players={allEloPlayers}
                  mode="evening"
                  title="Kvällens MVP"
                />
                <MVP
                  matches={allMatches}
                  players={allEloPlayers}
                  mode="30days"
                  title="Månadens MVP"
                />
              </div>
              <EloLeaderboard players={leaderboardPlayers} />
              <section id="head-to-head" className="page-section">
                <HeadToHeadSection
                  user={isGuest ? null : user}
                  profiles={profiles}
                  matches={filteredMatches}
                  allEloPlayers={allEloPlayers}
                  tournamentResults={tournamentResults}
                />
              </section>
            </>
          )}
        </>
      )}
    </section>
    </PullToRefresh>
  );
}
