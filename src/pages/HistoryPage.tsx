import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import History from "../Components/History";
import FilterBar from "../Components/FilterBar";
import EmptyState from "../Components/Shared/EmptyState";
import { Box, Button, Skeleton, Stack, Container, Typography, Alert, Fab } from "@mui/material";
import { KeyboardArrowUp as KeyboardArrowUpIcon } from "@mui/icons-material";
import PullToRefresh from "react-simple-pull-to-refresh";
import { PullingContent, RefreshingContent } from "../Components/Shared/PullToRefreshContent";
import { useStore } from "../store/useStore";
import { useQueryClient } from "@tanstack/react-query";
import { useEloStats } from "../hooks/useEloStats";
import { useRefreshInvalidations } from "../hooks/useRefreshInvalidations";
import { filterMatches } from "../utils/filters";
import { invalidateMatchData, invalidateProfileData } from "../data/queryInvalidation";

export default function HistoryPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { matchFilter, setMatchFilter, user, isGuest } = useStore();
  const [showScrollTop, setShowScrollTop] = useState(false);

  const {
    allMatches,
    profiles,
    isLoading,
    isError,
    error,
    eloDeltaByMatch,
    eloRatingByMatch,
    eloPlayers
  } = useEloStats();

  const filteredMatches = useMemo(
    () => filterMatches(allMatches, matchFilter),
    [allMatches, matchFilter]
  );

  useEffect(() => {
    // Note for non-coders: we watch how far the page is scrolled to show a "back to top" button.
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Note for non-coders: the helper makes one refresh callback that reloads all needed data.
  const handleRefresh = useRefreshInvalidations([
    () => invalidateProfileData(queryClient),
    () => invalidateMatchData(queryClient),
  ]);

  return (
    <PullToRefresh
      onRefresh={handleRefresh}
      pullingContent={<PullingContent />}
      refreshingContent={<RefreshingContent />}
    >
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Box id="history" component="section">
          <Typography variant="h4" sx={{ mb: 3, fontWeight: 800 }}>Matchhistorik</Typography>

          <FilterBar filter={matchFilter} setFilter={setMatchFilter} />

          {isError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {/* Note for non-coders: this message appears if we cannot load match data. */}
              {error?.message || "Kunde inte hämta matchhistoriken."}
            </Alert>
          )}
          {isLoading ? (
            <Stack spacing={2}>
              <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 3 }} />
              <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 3 }} />
              <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 3 }} />
            </Stack>
          ) : !filteredMatches.length ? (
            <EmptyState
              title="Ingen historik"
              description="Inga matcher matchar ditt nuvarande filter. Prova att ändra filtret eller registrera en ny match."
              actionLabel="Registrera match"
              onAction={() => navigate("/single-game")}
            />
          ) : (
            <History
              matches={filteredMatches}
              eloDeltaByMatch={eloDeltaByMatch}
              eloRatingByMatch={eloRatingByMatch}
              profiles={profiles}
              user={isGuest ? null : user}
              allEloPlayers={eloPlayers}
            />
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
