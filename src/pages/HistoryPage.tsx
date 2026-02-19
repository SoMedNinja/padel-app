import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import History from "../Components/History";
import FilterBar from "../Components/FilterBar";
import EmptyState from "../Components/Shared/EmptyState";
import { Box, Button, Skeleton, Stack, Container, Typography, Alert, Fab } from "@mui/material";
import DataFreshnessStatus from "../Components/Shared/DataFreshnessStatus";
import SectionCard from "../Components/Shared/SectionCard";
import { KeyboardArrowUp as KeyboardArrowUpIcon } from "@mui/icons-material";
import PullToRefresh from "react-simple-pull-to-refresh";
import { PullingContent, RefreshingContent, getPullToRefreshTuning } from "../Components/Shared/PullToRefreshContent";
import { useStore } from "../store/useStore";
import { useQueryClient } from "@tanstack/react-query";
import { useEloStats } from "../hooks/useEloStats";
import { useRefreshInvalidations } from "../hooks/useRefreshInvalidations";
import { filterMatches } from "../utils/filters";
import { invalidateMatchData, invalidateProfileData } from "../data/queryInvalidation";

export default function HistoryPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const { matchFilter, setMatchFilter, user, isGuest } = useStore();
  const [showScrollTop, setShowScrollTop] = useState(false);
  const highlightMatchId = searchParams.get("match");

  const {
    allMatches,
    profiles,
    isLoading,
    isError,
    error,
    eloDeltaByMatch,
    isFetching,
    lastUpdatedAt,
    hasCachedData,
  } = useEloStats();

  const filteredMatches = useMemo(
    () => filterMatches(allMatches, matchFilter),
    [allMatches, matchFilter]
  );

  useEffect(() => {
    if (!highlightMatchId) return;

    // Note for non-coders: shared links should ignore any old saved filters,
    // otherwise a recipient could miss the target match by accident.
    if (matchFilter.type !== "all") {
      setMatchFilter({ type: "all" });
    }
  }, [highlightMatchId, matchFilter.type, setMatchFilter]);

  useEffect(() => {
    if (!highlightMatchId || filteredMatches.length === 0) return;

    // Note for non-coders: if someone opened a shared /match/<id> link, we jump to
    // that specific card so the browser fallback feels like a direct deep link.
    const element = document.getElementById(`match-${highlightMatchId}`);
    if (!element) return;

    element.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [filteredMatches.length, highlightMatchId]);

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
  const pullToRefreshTuning = getPullToRefreshTuning();


  useEffect(() => {
    if (!highlightMatchId) return;
    const hasHighlightedMatch = allMatches.some((match) => match.id === highlightMatchId);
    if (isLoading || hasHighlightedMatch) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      // Note for non-coders: when a shared match link is opened offline and that match is not cached locally,
      // we move to a dedicated fallback page with reconnect guidance.
      const offlineTarget = `/offline?from=${encodeURIComponent(`/history?match=${highlightMatchId}`)}`;
      navigate(offlineTarget, { replace: true });
    }
  }, [allMatches, highlightMatchId, isLoading, navigate]);

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
        <Box id="history" component="section">
          <Typography variant="h4" sx={{ mb: 3, fontWeight: 800 }}>Matchhistorik</Typography>

          <SectionCard title="Globalt filter">
            <FilterBar filter={matchFilter} setFilter={setMatchFilter} />
          </SectionCard>

          <SectionCard title="Status">
            <DataFreshnessStatus
              isFetching={isFetching}
              hasCachedData={hasCachedData}
              hasError={isError}
              lastUpdatedAt={lastUpdatedAt}
            />

            {isError && (
              <Alert severity="error" sx={{ mt: 1.5 }}>
                {/* Note for non-coders: this message appears if we cannot load match data. */}
                {error?.message || "Kunde inte hämta matchhistoriken."}
              </Alert>
            )}
          </SectionCard>

          <SectionCard title="Matchhistorik">
            {isLoading ? (
              <Stack spacing={2}>
                <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 3 }} />
                <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 3 }} />
                <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 3 }} />
              </Stack>
            ) : !filteredMatches.length ? (
              <EmptyState
                title="Inga matcher spelade ännu"
                description="Inga matcher matchar ditt nuvarande filter. Prova att ändra filtret eller registrera en ny match."
                actionLabel="Registrera match"
                onAction={() => navigate("/single-game")}
              />
            ) : (
              <History
                matches={filteredMatches}
                eloDeltaByMatch={eloDeltaByMatch}
                profiles={profiles}
                user={isGuest ? null : user}
                highlightedMatchId={highlightMatchId}
              />
            )}
          </SectionCard>
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
