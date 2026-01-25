import React, { useMemo } from "react";
import MVP from "../Components/MVP";
import EloLeaderboard from "../Components/EloLeaderboard";
import Heatmap from "../Components/Heatmap";
import FilterBar from "../Components/FilterBar";
import { Box, Skeleton, Stack } from "@mui/material";
import PullToRefresh from "react-simple-pull-to-refresh";
import { useStore } from "../store/useStore";

import { useMatches } from "../hooks/useMatches";
import { useProfiles } from "../hooks/useProfiles";
import { usePadelData } from "../hooks/usePadelData";
import { Match, Profile } from "../types";
import { useScrollToFragment } from "../hooks/useScrollToFragment";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
import { calculateElo } from "../utils/elo";

export default function Dashboard() {
  const { matchFilter, setMatchFilter } = useStore();
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
  } = useMatches({ type: "all" });

  useScrollToFragment();

  const handleRefresh = usePullToRefresh([refetchProfiles, refetchMatches]);

  const { filteredMatches, playersWithTrend } = usePadelData(matches, matchFilter, profiles);
  // Note for non-coders: we build a "global" ELO list from all matches so the leaderboard rating
  // stays steady even when the filter shows a smaller slice of games.
  const allEloMap = useMemo(() => {
    const allEloPlayers = calculateElo(allMatches, profiles);
    return new Map(allEloPlayers.map(player => [player.id, player.elo]));
  }, [allMatches, profiles]);
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
    <PullToRefresh onRefresh={handleRefresh}>
    <section id="dashboard" className="page-section">
      {hasError && (
        <div className="notice-banner error" role="alert">
          <span>{errorMessage}</span>
          <button type="button" className="ghost-button" onClick={handleRefresh}>
            Försök igen
          </button>
        </div>
      )}
      {(isLoadingProfiles || isLoadingMatches || isLoadingAllMatches) ? (
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
                <MVP
                  matches={filteredMatches}
                  players={playersWithTrend}
                  mode="evening"
                  title="Kvällens MVP"
                />
                <MVP
                  matches={filteredMatches}
                  players={playersWithTrend}
                  mode="30days"
                  title="Månadens MVP"
                />
              </div>
              <EloLeaderboard players={leaderboardPlayers} />
              <Heatmap matches={filteredMatches} profiles={profiles} eloPlayers={playersWithTrend} />
            </>
          )}
        </>
      )}
    </section>
    </PullToRefresh>
  );
}
