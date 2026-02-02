import React, { useMemo, useState } from "react";
import PlayerSection from "../Components/PlayerSection";
import MeritsSection from "../Components/MeritsSection";
import Heatmap from "../Components/Heatmap";
import FilterBar from "../Components/FilterBar";
import { useStore } from "../store/useStore";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TournamentResult } from "../types";
import { useScrollToFragment } from "../hooks/useScrollToFragment";
import { Box, Skeleton, Stack, Container, Typography, Alert, Button, Tabs, Tab, Grid } from "@mui/material";
import PullToRefresh from "react-simple-pull-to-refresh";
import { PullingContent, RefreshingContent } from "../Components/Shared/PullToRefreshContent";
import { useRefreshInvalidations } from "../hooks/useRefreshInvalidations";
import { queryKeys } from "../utils/queryKeys";
import { invalidateMatchData, invalidateProfileData, invalidateTournamentData } from "../data/queryInvalidation";
import { useEloStats } from "../hooks/useEloStats";
import { filterMatches } from "../utils/filters";
import { padelData } from "../data/padelData";

export default function PlayerProfilePage() {
  const queryClient = useQueryClient();
  const { matchFilter, setMatchFilter, user, isGuest } = useStore();

  const {
    eloPlayers,
    allMatches,
    profiles,
    isLoading: isLoadingElo,
    isError: isEloError,
    error: eloError,
    eloDeltaByMatch,
  } = useEloStats();

  useScrollToFragment();

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

  const filteredMatches = useMemo(
    () => filterMatches(allMatches, matchFilter),
    [allMatches, matchFilter]
  );

  const [activeTab, setActiveTab] = useState(0);

  // Simplified handling for admin and approval state for now
  const userWithAdmin = user ? { ...user, is_admin: user.is_admin } : null;

  // Note for non-coders: this creates one refresh action that updates every profile-related dataset.
  const handleRefresh = useRefreshInvalidations([
    () => invalidateProfileData(queryClient),
    () => invalidateMatchData(queryClient),
    () => invalidateTournamentData(queryClient),
    refetchTournamentResults,
  ]);

  const isLoading = isLoadingElo || isLoadingTournamentResults;
  const hasError = isTournamentResultsError || isEloError;
  const errorMessage =
    (tournamentResultsError as Error | undefined)?.message ||
    eloError?.message ||
    "Något gick fel när profilen laddades.";

  if (isGuest) {
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Box component="section" sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2 }}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 800 }}>Spelarprofil</Typography>
          <Typography color="text.secondary">Logga in för att se din spelprofil, meriter och statistik.</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <PullToRefresh
      onRefresh={handleRefresh}
      pullingContent={<PullingContent />}
      refreshingContent={<RefreshingContent />}
    >
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Box component="section">
          {/* Note for non-coders: this filter controls which matches feed the profile stats. */}
          <FilterBar filter={matchFilter} setFilter={setMatchFilter} />
          {hasError && (
            <Alert severity="error" sx={{ mb: 2 }} action={
              <Button color="inherit" size="small" onClick={handleRefresh}>
                Försök igen
              </Button>
            }>
              {errorMessage}
            </Alert>
          )}
          {isLoading ? (
            <Stack spacing={2} sx={{ mb: 2 }}>
              <Skeleton variant="rectangular" height={160} sx={{ borderRadius: "14px" }} />
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Skeleton variant="rectangular" height={160} sx={{ borderRadius: "14px" }} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Skeleton variant="rectangular" height={160} sx={{ borderRadius: "14px" }} />
                </Grid>
              </Grid>
              <Skeleton variant="rectangular" height={240} sx={{ borderRadius: "14px" }} />
            </Stack>
          ) : (
            <>
              <Tabs
                value={activeTab}
                onChange={(_, newValue) => setActiveTab(newValue)}
                variant="scrollable"
                scrollButtons="auto"
                allowScrollButtonsMobile
                aria-label="Profilflikar"
                sx={{
                  mb: 3,
                  borderBottom: 1,
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  borderRadius: '12px 12px 0 0',
                  px: 1,
                  '& .MuiTab-root': {
                    minWidth: 120,
                    fontWeight: 600,
                    transition: 'all 0.2s',
                    '&:hover': {
                      color: 'primary.main',
                      bgcolor: 'rgba(211, 47, 47, 0.04)',
                    },
                  },
                  '& .MuiTabs-indicator': {
                    height: 3,
                    borderRadius: '3px 3px 0 0',
                  },
                }}
              >
                <Tab label="Översikt" />
                <Tab label="ELO-Trend" />
                <Tab label="Lagkamrater" />
                <Tab label="Meriter" />
              </Tabs>

              {activeTab === 0 && (
                <Box id="profile" component="section">
                  <PlayerSection
                    user={userWithAdmin}
                    profiles={profiles}
                    matches={filteredMatches}
                    allEloPlayers={eloPlayers}
                    tournamentResults={tournamentResults}
                    onProfileUpdate={() => queryClient.invalidateQueries({ queryKey: queryKeys.profiles() })}
                    mode="overview"
                    eloDeltaByMatch={eloDeltaByMatch}
                  />
                </Box>
              )}

              {activeTab === 1 && (
                <Box id="elo-history" component="section">
                  <PlayerSection
                    user={userWithAdmin}
                    profiles={profiles}
                    matches={filteredMatches}
                    allEloPlayers={eloPlayers}
                    tournamentResults={tournamentResults}
                    onProfileUpdate={() => queryClient.invalidateQueries({ queryKey: queryKeys.profiles() })}
                    mode="chart"
                    eloDeltaByMatch={eloDeltaByMatch}
                  />
                </Box>
              )}

              {activeTab === 2 && (
                <Box id="team-combos" component="section">
                  {/* Note for non-coders: the global filter updates match stats, but we keep all-time ELO for Snitt-ELO. */}
                  <Heatmap
                    matches={filteredMatches}
                    profiles={profiles}
                    allEloPlayers={eloPlayers}
                    currentUserOnly={user?.id}
                  />
                </Box>
              )}

              {activeTab === 3 && (
                <Box id="meriter" component="section">
                  <MeritsSection
                    user={userWithAdmin}
                    profiles={profiles}
                    matches={allMatches}
                    tournamentResults={tournamentResults}
                    onProfileUpdate={() => queryClient.invalidateQueries({ queryKey: queryKeys.profiles() })}
                  />
                </Box>
              )}
            </>
          )}
        </Box>
      </Container>
    </PullToRefresh>
  );
}
