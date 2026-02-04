import React, { useEffect, useState } from "react";
import MexicanaTournament from "../Components/MexicanaTournament";
import { useStore } from "../store/useStore";
import { useQueryClient } from "@tanstack/react-query";
import PullToRefresh from "react-simple-pull-to-refresh";
import { PullingContent, RefreshingContent } from "../Components/Shared/PullToRefreshContent";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
import { useEloStats } from "../hooks/useEloStats";
import { Box, Button, Skeleton, Stack, Typography, Fab } from "@mui/material";
import { KeyboardArrowUp as KeyboardArrowUpIcon } from "@mui/icons-material";
import AppAlert from "../Components/Shared/AppAlert";
import { invalidateTournamentData } from "../data/queryInvalidation";

export default function TournamentPage() {
  const { user, isGuest } = useStore();
  const [showScrollTop, setShowScrollTop] = useState(false);
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

  useEffect(() => {
    // Note for non-coders: this checks the scroll position so we know when to show the "back to top" button.
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <PullToRefresh
      className="tournament-scroll"
      onRefresh={handleRefresh}
      pullingContent={<PullingContent />}
      refreshingContent={<RefreshingContent />}
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
