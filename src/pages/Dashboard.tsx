import React, { useMemo, useEffect } from "react";
import MVP from "../Components/MVP";
import MatchHighlightCard from "../Components/MatchHighlightCard";
import EloLeaderboard from "../Components/EloLeaderboard";
import { HeadToHeadSection } from "../Components/PlayerSection";
import FilterBar from "../Components/FilterBar";
import { Box, Skeleton, Stack, Container, CircularProgress, Typography, Button, Grid } from "@mui/material";
import PullToRefresh from "react-simple-pull-to-refresh";
import { PullingContent, RefreshingContent } from "../Components/Shared/PullToRefreshContent";
import AppAlert from "../Components/Shared/AppAlert";
import EmptyState from "../Components/Shared/EmptyState";
import { useStore } from "../store/useStore";

import { useEloStats } from "../hooks/useEloStats";
import { TournamentResult } from "../types";
import { useScrollToFragment } from "../hooks/useScrollToFragment";
import { useRefreshInvalidations } from "../hooks/useRefreshInvalidations";
import { findMatchHighlight } from "../utils/highlights";
import { useTournaments } from "../hooks/useTournamentData";
import { useNavigate } from "react-router-dom";
import { PlayArrow as PlayIcon } from "@mui/icons-material";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../utils/queryKeys";
import { invalidateMatchData, invalidateProfileData, invalidateTournamentData } from "../data/queryInvalidation";
import { filterMatches } from "../utils/filters";
import { padelData } from "../data/padelData";

type TournamentResultRow = TournamentResult & {
  mexicana_tournaments?: { tournament_type?: string | null } | null;
};

export default function Dashboard() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const {
    matchFilter,
    setMatchFilter,
    user,
    isGuest,
    dismissedMatchId,
    dismissMatch,
    checkAndResetDismissed
  } = useStore();

  const {
    eloPlayers,
    allMatches,
    profiles,
    isLoading: isLoadingElo,
    isError: isEloError,
    error: eloError,
    eloDeltaByMatch,
    eloRatingByMatch
  } = useEloStats();

  const {
    data: tournamentResults = [] as TournamentResult[],
    isLoading: isLoadingTournamentResults,
    isError: isTournamentResultsError,
    error: tournamentResultsError,
    refetch: refetchTournamentResults,
  } = useQuery({
    queryKey: queryKeys.tournamentResults(),
    queryFn: () => padelData.tournaments.resultsWithTypes(),
  });

  const { data: tournaments = [] } = useTournaments();

  const activeTournament = useMemo(
    () => tournaments.find(t => t.status === "in_progress"),
    [tournaments]
  );

  useScrollToFragment();

  const refreshInvalidations = [
    () => invalidateProfileData(queryClient),
    () => invalidateMatchData(queryClient),
    () => invalidateTournamentData(queryClient),
    refetchTournamentResults,
  ];
  // Note for non-coders: this collects all the data refresh tasks into one pull-to-refresh handler.
  const handleRefresh = useRefreshInvalidations(refreshInvalidations);

  const filteredMatches = useMemo(
    () => filterMatches(allMatches, matchFilter),
    [allMatches, matchFilter]
  );

  const highlight = useMemo(() => {
    if (!allMatches.length || !eloPlayers.length) return null;
    return findMatchHighlight(allMatches, eloPlayers, eloDeltaByMatch, eloRatingByMatch);
  }, [allMatches, eloPlayers, eloDeltaByMatch, eloRatingByMatch]);

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

  const hasError = isTournamentResultsError || isEloError;
  const errorMessage =
    (tournamentResultsError as Error | undefined)?.message ||
    eloError?.message ||
    "Något gick fel när data hämtades.";

  const isLoading = isLoadingElo || isLoadingTournamentResults;

  return (
    <PullToRefresh
      onRefresh={handleRefresh}
      pullingContent={<PullingContent />}
      refreshingContent={<RefreshingContent />}
    >
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box id="dashboard" component="section">
        {activeTournament && (
          <AppAlert
            severity="info"
            icon={<PlayIcon />}
            sx={{
              mb: 3,
              cursor: 'pointer',
              '&:hover': { bgcolor: 'info.light', color: 'info.contrastText' },
              transition: 'all 0.2s',
              border: 1,
              borderColor: 'info.main',
              boxShadow: '0 4px 12px rgba(2, 136, 209, 0.15)'
            }}
            onClick={() => navigate("/tournaments")}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Turnering pågår!</Typography>
                <Typography variant="caption">"{activeTournament.name}" är live nu. Klicka för att se ställningen.</Typography>
              </Box>
              <Button size="small" variant="contained" color="info" sx={{ ml: 2, fontWeight: 700 }}>
                Visa
              </Button>
            </Box>
          </AppAlert>
        )}

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
                deltas={eloDeltaByMatch[highlightMatch.id]}
              />
            )}
            {!filteredMatches.length ? (
              <EmptyState
                title="Inga matcher ännu"
                description="Lägg in din första match för att börja se statistik och klättra på rankingen!"
                actionLabel="Registrera match"
                onAction={() => window.location.hash = "#match-form"} // Simple jump
              />
            ) : (
              <>
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <MVP
                      matches={allMatches}
                      players={eloPlayers}
                      mode="evening"
                      title="Kvällens MVP"
                      eloDeltaByMatch={eloDeltaByMatch}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <MVP
                      matches={allMatches}
                      players={eloPlayers}
                      mode="30days"
                      title="Månadens MVP"
                      eloDeltaByMatch={eloDeltaByMatch}
                    />
                  </Grid>
                </Grid>
                <EloLeaderboard
                  players={eloPlayers}
                  matches={filteredMatches}
                  profiles={profiles}
                  isFiltered={matchFilter.type !== "all"}
                />
                {!isGuest && (
                  <Box id="head-to-head" component="section" sx={{ mt: 4 }}>
                    {/* Note for non-coders: guests can browse stats but don't see head-to-head comparisons. */}
                    <HeadToHeadSection
                      user={user}
                      profiles={profiles}
                      matches={filteredMatches}
                      allEloPlayers={eloPlayers}
                      tournamentResults={tournamentResults}
                      eloDeltaByMatch={eloDeltaByMatch}
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
