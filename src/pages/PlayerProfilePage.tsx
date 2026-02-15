import React, { useEffect, useMemo, useState } from "react";
import PlayerSection from "../Components/PlayerSection";
import MeritsSection from "../Components/MeritsSection";
import FilterBar from "../Components/FilterBar";
import { useStore } from "../store/useStore";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TournamentResult } from "../types";
import { useScrollToFragment } from "../hooks/useScrollToFragment";
import { Box, Skeleton, Stack, Container, Typography, Alert, Button, Tabs, Tab, Grid, FormControlLabel, Switch, Divider, MenuItem, TextField } from "@mui/material";
import PullToRefresh from "react-simple-pull-to-refresh";
import { PullingContent, RefreshingContent, getPullToRefreshTuning } from "../Components/Shared/PullToRefreshContent";
import { useRefreshInvalidations } from "../hooks/useRefreshInvalidations";
import { queryKeys } from "../utils/queryKeys";
import { invalidateMatchData, invalidateProfileData, invalidateTournamentData } from "../data/queryInvalidation";
import { useEloStats } from "../hooks/useEloStats";
import { filterMatches } from "../utils/filters";
import { padelData } from "../data/padelData";
import { NotificationEventType, NotificationPreferences } from "../types/notifications";
import {
  ensureNotificationPermission,
  loadNotificationPreferences,
  loadNotificationPreferencesWithSync,
  saveNotificationPreferencesWithSync,
  syncPreferencesToServiceWorker,
} from "../services/webNotificationService";
import WebPermissionsPanel from "../Components/Permissions/WebPermissionsPanel";
import { requestOpenPermissionGuide } from "../services/permissionGuidanceService";

const EVENT_LABELS: Record<NotificationEventType, string> = {
  scheduled_match_new: "Ny schemalagd match",
  availability_poll_reminder: "Påminnelse om tillgänglighetspoll",
  admin_announcement: "Admin-meddelanden",
};

// Note for non-coders: keeping this text in one constant ensures the PWA tab title and section heading always use the same Swedish translation.
const NOTIFICATION_SETTINGS_LABEL = "Notifieringsinställningar";

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
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>(() => loadNotificationPreferences());

  useEffect(() => {
    let isMounted = true;

    // Note for non-coders:
    // After sign-in, we fetch backend preferences and merge them into this screen.
    void loadNotificationPreferencesWithSync().then((preferences) => {
      if (isMounted) {
        setNotificationPrefs(preferences);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

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

  const updateNotificationPrefs = async (nextPrefs: NotificationPreferences) => {
    setNotificationPrefs(nextPrefs);
    await saveNotificationPreferencesWithSync(nextPrefs);
  };

  const handleMasterNotificationsToggle = async (enabled: boolean) => {
    if (enabled) {
      const permission = await ensureNotificationPermission();
      if (permission !== "granted") {
        return;
      }
    }

    await updateNotificationPrefs({
      ...notificationPrefs,
      enabled,
    });
  };

  if (isGuest) {
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Box component="section" sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2 }}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 800 }}>Spelarprofil</Typography>
          <Typography color="text.secondary">Logga in för att se din spelprofil, meriter och statistik.</Typography>
          <Box sx={{ mt: 2 }}>
            {/* Note for non-coders: this sends you to the same login flow as the guest banner. */}
            <Button variant="contained" onClick={handleGuestLogin}>
              Logga in
            </Button>
          </Box>
        </Box>
      </Container>
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
                <Tab label="Meriter" />
                <Tab label={NOTIFICATION_SETTINGS_LABEL} />
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

              {activeTab === 3 && (
                <Box id="notifications" component="section" sx={{ p: 2, bgcolor: "background.paper", borderRadius: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>{NOTIFICATION_SETTINGS_LABEL}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {/* Note for non-coders: this is where users decide which alerts they want to receive on web and in the service worker push channel. */}
                    Slå av/på notiser per händelsetyp och välj tysta timmar för när mobilen inte ska plinga.
                  </Typography>

                  <Button size="small" sx={{ mb: 2 }} onClick={() => requestOpenPermissionGuide("settings")}>
                    Steg-för-steg: behörighetshjälp
                  </Button>

                  <WebPermissionsPanel onNotificationPermissionChanged={async () => {
                    await syncPreferencesToServiceWorker(notificationPrefs);
                  }} />

                  <FormControlLabel
                    control={<Switch checked={notificationPrefs.enabled} onChange={(_, checked) => void handleMasterNotificationsToggle(checked)} />}
                    label="Tillåt notiser på webben"
                  />

                  <Divider sx={{ my: 2 }} />

                  {Object.entries(EVENT_LABELS).map(([eventType, label]) => (
                    <FormControlLabel
                      key={eventType}
                      control={
                        <Switch
                          checked={notificationPrefs.eventToggles[eventType as NotificationEventType]}
                          onChange={(_, checked) => {
                            const nextPrefs: NotificationPreferences = {
                              ...notificationPrefs,
                              eventToggles: {
                                ...notificationPrefs.eventToggles,
                                [eventType]: checked,
                              },
                            };
                            void updateNotificationPrefs(nextPrefs);
                          }}
                          disabled={!notificationPrefs.enabled}
                        />
                      }
                      label={label}
                    />
                  ))}

                  <Divider sx={{ my: 2 }} />

                  <FormControlLabel
                    control={
                      <Switch
                        checked={notificationPrefs.quietHours.enabled}
                        onChange={(_, checked) => {
                          void updateNotificationPrefs({
                            ...notificationPrefs,
                            quietHours: {
                              ...notificationPrefs.quietHours,
                              enabled: checked,
                            },
                          });
                        }}
                        disabled={!notificationPrefs.enabled}
                      />
                    }
                    label="Aktivera tysta timmar"
                  />

                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mt: 1 }}>
                    <TextField
                      select
                      size="small"
                      label="Start"
                      value={notificationPrefs.quietHours.startHour}
                      onChange={(event) => {
                        void updateNotificationPrefs({
                          ...notificationPrefs,
                          quietHours: {
                            ...notificationPrefs.quietHours,
                            startHour: Number(event.target.value),
                          },
                        });
                      }}
                      disabled={!notificationPrefs.enabled || !notificationPrefs.quietHours.enabled}
                    >
                      {Array.from({ length: 24 }).map((_, hour) => <MenuItem key={`start-${hour}`} value={hour}>{`${hour.toString().padStart(2, "0")}:00`}</MenuItem>)}
                    </TextField>
                    <TextField
                      select
                      size="small"
                      label="Slut"
                      value={notificationPrefs.quietHours.endHour}
                      onChange={(event) => {
                        void updateNotificationPrefs({
                          ...notificationPrefs,
                          quietHours: {
                            ...notificationPrefs.quietHours,
                            endHour: Number(event.target.value),
                          },
                        });
                      }}
                      disabled={!notificationPrefs.enabled || !notificationPrefs.quietHours.enabled}
                    >
                      {Array.from({ length: 24 }).map((_, hour) => <MenuItem key={`end-${hour}`} value={hour}>{`${hour.toString().padStart(2, "0")}:00`}</MenuItem>)}
                    </TextField>
                  </Stack>

                  {!notificationPrefs.enabled && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      Alla web-notiser är avstängda. Du kan fortfarande slå på dem igen här.
                    </Alert>
                  )}
                </Box>
              )}
            </>
          )}
        </Box>
      </Container>
    </PullToRefresh>
  );
}
