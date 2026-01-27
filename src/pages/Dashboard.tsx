import React, { useMemo, useEffect } from "react";
import MVP from "../Components/MVP";
import MatchHighlightCard from "../Components/MatchHighlightCard";
import EloLeaderboard from "../Components/EloLeaderboard";
import { HeadToHeadSection } from "../Components/PlayerSection";
import FilterBar from "../Components/FilterBar";
import { Box, Skeleton, Stack, Container, CircularProgress, Typography, Button, Grid } from "@mui/material";
import PullToRefresh from "react-simple-pull-to-refresh";
import AppAlert from "../Components/Shared/AppAlert";
import { useStore } from "../store/useStore";

import { useEloStats } from "../hooks/useEloStats";
import { TournamentResult } from "../types";
import { useScrollToFragment } from "../hooks/useScrollToFragment";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
import { findMatchHighlight } from "../utils/highlights";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../utils/queryKeys";
import { filterMatches } from "../utils/filters";
import { tournamentService } from "../services/tournamentService";

type TournamentResultRow = TournamentResult & {
  mexicana_tournaments?: { tournament_type?: string | null } | null;
};

export default function Dashboard() {
  const queryClient = useQueryClient();
  const {
    matchFilter,
    setMatchFilter,
    user,
    isGuest,
    dismissedMatchId,
    dismissMatch,
    checkAndResetDismissed
  } = useStore();

  const { eloPlayers, allMatches, profiles, isLoading: isLoadingElo } = useEloStats();

  const {
    data: tournamentResults = [] as TournamentResult[],
    isLoading: isLoadingTournamentResults,
    isError: isTournamentResultsError,
    error: tournamentResultsError,
    refetch: refetchTournamentResults,
  } = useQuery({
    queryKey: queryKeys.tournamentResults(),
    queryFn: () => tournamentService.getTournamentResultsWithTypes(),
  });

  useScrollToFragment();

  const handleRefresh = usePullToRefresh([
    () => queryClient.invalidateQueries({ queryKey: queryKeys.profiles() }),
    () => queryClient.invalidateQueries({ queryKey: queryKeys.matches({ type: "all" }) }),
    refetchTournamentResults,
  ]);

  const filteredMatches = useMemo(
    () => filterMatches(allMatches, matchFilter),
    [allMatches, matchFilter]
  );

  const highlight = useMemo(() => {
    if (!allMatches.length || !eloPlayers.length) return null;
    return findMatchHighlight(allMatches, eloPlayers);
  }, [allMatches, eloPlayers]);

  useEffect(() => {
    if (highlight?.matchDate) {
      checkAndResetDismissed(highlight.matchDate);
    }
  }, [highlight, checkAndResetDismissed]);

  const showHighlight = useMemo(() => {
    if (!highlight) return false;
    if (dismissedMatchId === highlight.matchId) return false;
    return true;
  }, [highlight, dismissedMatchId]);

  const highlightMatch = useMemo(() => {
    if (!highlight) return null;
    return allMatches.find(m => m.id === highlight.matchId);
  }, [highlight, allMatches]);

  const hasError = isTournamentResultsError;
  const errorMessage =
    (tournamentResultsError as Error | undefined)?.message ||
    "Något gick fel när data hämtades.";

  const isLoading = isLoadingElo || isLoadingTournamentResults;

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
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box id="dashboard" component="section">
        {hasError && (
          <AppAlert severity="error" sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <Typography variant="body2">{errorMessage}</Typography>
              <Button color="inherit" size="small" onClick={handleRefresh}>
                Försök igen
              </Button>
            </Box>
          </AppAlert>
        )}
        {isLoading ? (
          <Stack spacing={2} sx={{ mb: 2 }}>
            <Skeleton variant="rectangular" width={160} height={40} sx={{ borderRadius: "12px" }} />
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Skeleton variant="rectangular" height={160} sx={{ borderRadius: "14px" }} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Skeleton variant="rectangular" height={160} sx={{ borderRadius: "14px" }} />
              </Grid>
            </Grid>
            <Skeleton variant="rectangular" height={400} sx={{ borderRadius: "14px" }} />
          </Stack>
        ) : (
          <>
            <FilterBar filter={matchFilter} setFilter={setMatchFilter} />
            {showHighlight && highlight && highlightMatch && (
              <MatchHighlightCard
                highlight={highlight}
                match={highlightMatch}
                onDismiss={() => dismissMatch(highlight.matchId, highlight.matchDate)}
              />
            )}
            {!filteredMatches.length ? (
              <AppAlert severity="info" sx={{ mb: 2 }}>
                Inga matcher ännu. Lägg in din första match för att se statistik.
              </AppAlert>
            ) : (
              <>
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <MVP
                      matches={allMatches}
                      players={eloPlayers}
                      mode="evening"
                      title="Kvällens MVP"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <MVP
                      matches={allMatches}
                      players={eloPlayers}
                      mode="30days"
                      title="Månadens MVP"
                    />
                  </Grid>
                </Grid>
                <EloLeaderboard players={eloPlayers} matches={filteredMatches} profiles={profiles} />
                {!isGuest && (
                  <Box id="head-to-head" component="section" sx={{ mt: 4 }}>
                    {/* Note for non-coders: guests can browse stats but don't see head-to-head comparisons. */}
                    <HeadToHeadSection
                      user={user}
                      profiles={profiles}
                      matches={filteredMatches}
                      allEloPlayers={eloPlayers}
                      tournamentResults={tournamentResults}
                    />
                  </Box>
                )}
              </>
            )}
          </>
        )}
      </Box>
    </Container>
    </PullToRefresh>
  );
}
