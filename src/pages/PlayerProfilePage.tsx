import React, { useMemo, useState } from "react";
import PlayerSection from "../Components/PlayerSection/PlayerSection";
import MeritsSection from "../Components/MeritsSection";
import FilterBar from "../Components/FilterBar";
import { useStore } from "../store/useStore";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TournamentResult } from "../types";
import { useScrollToFragment } from "../hooks/useScrollToFragment";
import { Box, Skeleton, Stack, Typography, Alert, Button, Tabs, Tab, Grid } from "@mui/material";
import PullToRefresh from "react-simple-pull-to-refresh";
import { PullingContent, RefreshingContent, getPullToRefreshTuning } from "../Components/Shared/PullToRefreshContent";
import PageShell from "../Components/Shared/PageShell";
import PageHeader from "../Components/Shared/PageHeader";
import { useRefreshInvalidations } from "../hooks/useRefreshInvalidations";
import { queryKeys } from "../utils/queryKeys";
import { invalidateMatchData, invalidateProfileData, invalidateTournamentData } from "../data/queryInvalidation";
import { useEloStats } from "../hooks/useEloStats";
import { filterMatches } from "../utils/filters";
import { padelData } from "../data/padelData";

export default function PlayerProfilePage() {
  const queryClient = useQueryClient();
  const { matchFilter, setMatchFilter, user, isGuest, setIsGuest } = useStore();

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
    error: tournamentResultsError
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
  ]);
  const pullToRefreshTuning = getPullToRefreshTuning();

  // Note for non-coders: leaving guest mode triggers the login screen in the app shell.
  const handleGuestLogin = () => {
    setIsGuest(false);
  };

  const isLoading = isLoadingElo || isLoadingTournamentResults;
  const hasError = isTournamentResultsError || isEloError;
  const errorMessage =
    (tournamentResultsError as Error | undefined)?.message ||
    eloError?.message ||
    "Något gick fel när profilen laddades.";

  if (isGuest) {
    return (
      <PageShell sectionId="profile-guest">
        <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2 }}>
          <PageHeader
            title="Spelarprofil"
            subtitle="Logga in för att se din spelprofil, meriter och statistik."
          />
          <Box sx={{ mt: 2 }}>
            {/* Note for non-coders: this sends you to the same login flow as the guest banner. */}
            <Button variant="contained" onClick={handleGuestLogin}>
              Logga in
            </Button>
          </Box>
        </Box>
      </PageShell>
    );
  }

  return (
    <PullToRefresh
      // Note for non-coders: this class lets us apply iOS-specific CSS so only our custom refresh animation is shown.
      className="app-pull-to-refresh"
      onRefresh={handleRefresh}
      pullingContent={<PullingContent />}
      refreshingContent={<RefreshingContent />}
      {...pullToRefreshTuning}
    >
      <PageShell sectionId="profile">
      <PageHeader
        title="Spelarprofil"
        subtitle="Följ din form, ELO-utveckling och meriter över tid."
      />
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
            <Stack spacing={3} sx={{ mb: 2 }}>
              {/* Profile Header Skeleton */}
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
                 <Skeleton variant="circular" width={100} height={100} sx={{ mb: 2 }} />
                 <Skeleton variant="text" width={180} height={32} sx={{ mb: 1 }} />
                 <Skeleton variant="text" width={120} height={20} />
              </Box>

              <Skeleton variant="rounded" width="100%" height={48} sx={{ borderRadius: "12px" }} />

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Skeleton variant="rectangular" height={200} sx={{ borderRadius: "16px" }} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Skeleton variant="rectangular" height={200} sx={{ borderRadius: "16px" }} />
                </Grid>
              </Grid>
              <Skeleton variant="rectangular" height={240} sx={{ borderRadius: "16px" }} />
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
                    readOnly={true}
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
      </PageShell>
    </PullToRefresh>
  );
}
