import React, { useMemo, useEffect, useState } from "react";
import MVP from "../Components/MVP";
import MatchHighlightCard from "../Components/MatchHighlightCard";
import EloLeaderboard from "../Components/EloLeaderboard";
import Heatmap from "../Components/Heatmap";
import { HeadToHeadSection } from "../Components/PlayerSection";
import FilterBar from "../Components/FilterBar";
import { Box, Skeleton, Stack, Container, Typography, Button, Grid, Fab } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { KeyboardArrowUp as KeyboardArrowUpIcon } from "@mui/icons-material";
import PullToRefresh from "react-simple-pull-to-refresh";
import { PullingContent, RefreshingContent, getPullToRefreshTuning } from "../Components/Shared/PullToRefreshContent";
import AppAlert from "../Components/Shared/AppAlert";
import EmptyState from "../Components/Shared/EmptyState";
import DataFreshnessStatus from "../Components/Shared/DataFreshnessStatus";
import { useStore } from "../store/useStore";

import { useEloStats } from "../hooks/useEloStats";
import { TournamentResult } from "../types";
import { useScrollToFragment } from "../hooks/useScrollToFragment";
import { useRefreshInvalidations } from "../hooks/useRefreshInvalidations";
import { findMatchHighlight } from "../utils/highlights";
import { useTournaments } from "../hooks/useTournamentData";
import { useNavigate } from "react-router-dom";
import { PlayArrow as PlayIcon, Timer as TimerIcon, Close as CloseIcon } from "@mui/icons-material";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../utils/queryKeys";
import { invalidateAvailabilityData, invalidateMatchData, invalidateProfileData, invalidateTournamentData } from "../data/queryInvalidation";
import { filterMatches } from "../utils/filters";
import { padelData } from "../data/padelData";
import { useScheduledGames } from "../hooks/useScheduledGames";
import { formatFullDate } from "../utils/format";

type TournamentResultRow = TournamentResult & {
  mexicana_tournaments?: { tournament_type?: string | null } | null;
};

export default function Dashboard() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [now] = useState(() => Date.now());
  const [isTournamentNoticeDismissed, setIsTournamentNoticeDismissed] = useState(false);
  const {
    matchFilter,
    setMatchFilter,
    user,
    isGuest,
    dismissedMatchId,
    dismissedRecentMatchId,
    dismissedScheduledGameId,
    dismissMatch,
    dismissRecentMatch,
    dismissScheduledGame,
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
    eloRatingByMatch,
    isFetching: isFetchingElo,
    lastUpdatedAt: eloLastUpdatedAt,
    hasCachedData: hasCachedEloData,
  } = useEloStats();

  const {
    data: tournamentResults = [] as TournamentResult[],
    isLoading: isLoadingTournamentResults,
    isError: isTournamentResultsError,
    error: tournamentResultsError
  } = useQuery({
    queryKey: queryKeys.tournamentResults(),
    queryFn: () => padelData.tournaments.resultsWithTypes(),
  });

  const { data: tournaments = [] } = useTournaments();
  const { data: scheduledGames = [] } = useScheduledGames();

  const activeTournament = useMemo(
    () => tournaments.find(t => t.status === "in_progress"),
    [tournaments]
  );

  useEffect(() => {
    // Note for non-coders: when a new tournament becomes active, we show the notification again.
    setIsTournamentNoticeDismissed(false);
  }, [activeTournament?.id]);

  useScrollToFragment();

  useEffect(() => {
    // Note for non-coders: this checks the scroll position so we know when to show the "back to top" button.
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Note for non-coders: this collects all the data refresh tasks into one pull-to-refresh handler.
  const refreshActions = useMemo(
    () => [
      () => invalidateProfileData(queryClient),
      () => invalidateMatchData(queryClient),
      () => invalidateTournamentData(queryClient),
      () => invalidateAvailabilityData(queryClient),
    ],
    [queryClient]
  );
  const handleRefresh = useRefreshInvalidations(refreshActions);
  // Note for non-coders: this adjusts pull distances on iOS so the full custom animation is visible before refresh starts.
  const pullToRefreshTuning = getPullToRefreshTuning();

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

  const recentMatchHighlight = useMemo(() => {
    if (!allMatches.length) return null;
    const latest = allMatches[0];
    const matchTime = new Date(latest.created_at).getTime();
    const twoHoursInMs = 2 * 60 * 60 * 1000;

    if (now - matchTime <= twoHoursInMs && dismissedRecentMatchId !== latest.id) {
      return latest;
    }
    return null;
  }, [allMatches, dismissedRecentMatchId, now]);

  const upcomingScheduledGame = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    // Note for non-coders: this finds the soonest upcoming booking to show as a notification.
    return [...scheduledGames]
      .filter((game) => (game.status || "scheduled") !== "cancelled")
      .filter((game) => game.date >= today)
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.start_time.localeCompare(b.start_time);
      })[0] || null;
  }, [scheduledGames]);

  const shouldShowScheduledGameNotice = useMemo(() => {
    if (!upcomingScheduledGame) return false;
    return dismissedScheduledGameId !== upcomingScheduledGame.id;
  }, [dismissedScheduledGameId, upcomingScheduledGame]);

  const formatTime = (time: string) => time.slice(0, 5);

  const hasError = isTournamentResultsError || isEloError;
  const errorMessage =
    (tournamentResultsError as Error | undefined)?.message ||
    eloError?.message ||
    "Något gick fel när data hämtades.";

  const isLoading = isLoadingElo || isLoadingTournamentResults;

  return (
    <PullToRefresh
      // Note for non-coders: this class lets us apply iOS-specific CSS so only our custom refresh animation is shown.
      className="app-pull-to-refresh"
      onRefresh={handleRefresh}
      pullingContent={<PullingContent />}
      refreshingContent={<RefreshingContent />}
      {...pullToRefreshTuning}
    >
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box id="dashboard" component="section">
        <DataFreshnessStatus
          isFetching={isFetchingElo || isLoadingTournamentResults}
          hasCachedData={hasCachedEloData || tournamentResults.length > 0}
          hasError={hasError}
          lastUpdatedAt={Math.max(eloLastUpdatedAt, 0)}
        />
        {shouldShowScheduledGameNotice && upcomingScheduledGame && (
          <AppAlert
            severity="info"
            icon={<TimerIcon />}
            sx={{
              mb: 3,
              bgcolor: (theme) => alpha(theme.palette.info.light, 0.1),
              border: 1,
              borderColor: "info.main",
              "& .MuiAlert-message": { width: "100%" },
            }}
            // Note for non-coders: closing the alert stores the dismissal locally so it stays hidden for this device.
            onClose={() => dismissScheduledGame(upcomingScheduledGame.id)}
          >
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  Uppkommande bokning
                </Typography>
                <Typography variant="caption" sx={{ display: "block" }}>
                  {upcomingScheduledGame.title || "Padelpass"} • {formatFullDate(upcomingScheduledGame.date)} •{" "}
                  {formatTime(upcomingScheduledGame.start_time)}–{formatTime(upcomingScheduledGame.end_time)}
                </Typography>
              </Box>
              <Button
                size="small"
                variant="outlined"
                color="info"
                onClick={() => navigate("/schema")}
                sx={{ ml: 2, fontWeight: 700, whiteSpace: "nowrap" }}
              >
                Se schema
              </Button>
            </Box>
          </AppAlert>
        )}
        {recentMatchHighlight && (
          <AppAlert
            severity="success"
            icon={<TimerIcon />}
            sx={{
              mb: 3,
              bgcolor: (theme) => alpha(theme.palette.success.light, 0.1),
              border: 1,
              borderColor: 'success.main',
              '& .MuiAlert-message': { width: '100%' }
            }}
            onClose={() => dismissRecentMatch(recentMatchHighlight.id)}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Nytt resultat!</Typography>
                <Typography variant="caption" sx={{ display: 'block' }}>
                  {Array.isArray(recentMatchHighlight.team1) ? recentMatchHighlight.team1.join(" & ") : recentMatchHighlight.team1} vs {Array.isArray(recentMatchHighlight.team2) ? recentMatchHighlight.team2.join(" & ") : recentMatchHighlight.team2}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.5 }}>
                  Resultat: {recentMatchHighlight.team1_sets}–{recentMatchHighlight.team2_sets}
                </Typography>
              </Box>
              <Button
                size="small"
                variant="outlined"
                color="success"
                onClick={() => navigate("/history")}
                sx={{ ml: 2, fontWeight: 700, whiteSpace: 'nowrap' }}
              >
                Se alla
              </Button>
            </Box>
          </AppAlert>
        )}

        {activeTournament && !isTournamentNoticeDismissed && (
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
            // Note for non-coders: clicking the banner takes you to the tournament page.
            onClick={() => navigate("/tournament")}
            onClose={(event) => {
              // Note for non-coders: the X button only hides this notice, it does not affect tournament data.
              event.stopPropagation();
              setIsTournamentNoticeDismissed(true);
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Turnering pågår!</Typography>
                <Typography variant="caption">"{activeTournament.name}" är live nu. Klicka för att se ställningen.</Typography>
              </Box>
              <Button
                size="small"
                variant="contained"
                color="info"
                sx={{ ml: 2, fontWeight: 700 }}
                onClick={(event) => {
                  // Note for non-coders: the button does the same navigation as the banner itself.
                  event.stopPropagation();
                  navigate("/tournament");
                }}
              >
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
                // Note for non-coders: keeping the description identical to the iOS Swedish Localizable.strings.
                description="Lägg till din första match för att låsa upp trender, highlights och MVP-kort."
                actionLabel="Registrera första matchen"
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

                <Box sx={{ mt: 4 }}>
                  <Heatmap
                    matches={filteredMatches}
                    profiles={profiles}
                    allEloPlayers={eloPlayers}
                    // Note for non-coders: this keeps the heatmap focused on your own teammate combinations,
                    // matching how the native iOS app behaves.
                    currentUserOnly={user?.id}
                  />
                </Box>

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
    <Fab
      size="small"
      color="inherit"
      aria-label="Till toppen"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      sx={{
        position: "fixed",
        bottom: { xs: 88, sm: 24 },
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: theme => theme.zIndex.modal + 1,
        bgcolor: "background.paper",
        color: "text.secondary",
        boxShadow: 2,
        opacity: showScrollTop ? 1 : 0,
        pointerEvents: showScrollTop ? "auto" : "none",
        transition: "opacity 0.2s ease-in-out",
      }}
    >
      {/* Note for non-coders: this smaller arrow button stays above the bottom menu and scrolls to the top. */}
      <KeyboardArrowUpIcon fontSize="small" />
    </Fab>
    </PullToRefresh>
  );
}
