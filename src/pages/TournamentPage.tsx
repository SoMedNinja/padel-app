import React, { useEffect } from "react";
import MexicanaTournament from "../Components/MexicanaTournament";
import { useStore } from "../store/useStore";
import { useQueryClient } from "@tanstack/react-query";
import PullToRefresh from "react-simple-pull-to-refresh";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
import { useEloStats } from "../hooks/useEloStats";
import { Box, Button, Skeleton, Stack, CircularProgress, Typography } from "@mui/material";
import AppAlert from "../Components/Shared/AppAlert";
import { invalidateTournamentData } from "../data/queryInvalidation";

export default function TournamentPage() {
  const { user, isGuest } = useStore();
  const {
    eloPlayers,
    profiles,
    isLoading,
    isError,
    error
  } = useEloStats();
  const queryClient = useQueryClient();

  const handleTournamentSync = () => {
    invalidateTournamentData(queryClient);
  };

  const handleRefresh = usePullToRefresh([
    () => invalidateTournamentData(queryClient),
  ]);

  const hasError = isError;
  const errorMessage = error?.message || "Något gick fel när turneringsdata hämtades.";

  useEffect(() => {
    // Note for non-coders: we add a body class so CSS can remove the global padding only on this page.
    document.body.classList.add("tournament-page");
    return () => {
      document.body.classList.remove("tournament-page");
    };
  }, []);

  return (
    <PullToRefresh
      className="tournament-scroll"
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
      <section id="mexicana" className="page-section">
        <Box sx={{ px: { xs: 2, sm: 0 }, pb: { xs: 10, sm: 4 } }}>
          {isGuest && (
            <AppAlert severity="info" sx={{ mb: 2 }}>
              {/* Note for non-coders: guests can browse the schedule, but only signed-in users can save rounds. */}
              Logga in för att skapa eller spara turneringar. Som gäst kan du bara titta.
            </AppAlert>
          )}
          {hasError && (
            <AppAlert
              severity="error"
              sx={{ mb: 2 }}
            >
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
              {/* Note for non-coders: skeletons are gray placeholders shown while data loads. */}
              <Skeleton variant="rectangular" height={220} sx={{ borderRadius: "16px" }} />
              <Box className="mexicana-grid">
                <Skeleton variant="rectangular" height={200} sx={{ borderRadius: "16px" }} />
                <Skeleton variant="rectangular" height={200} sx={{ borderRadius: "16px" }} />
              </Box>
            </Stack>
          ) : (
            <MexicanaTournament
              user={isGuest ? null : user}
              profiles={profiles}
              eloPlayers={eloPlayers}
              isGuest={isGuest}
              onTournamentSync={handleTournamentSync}
            />
          )}
        </Box>
      </section>
    </PullToRefresh>
  );
}
