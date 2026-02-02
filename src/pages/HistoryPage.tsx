import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import History from "../Components/History";
import FilterBar from "../Components/FilterBar";
import EmptyState from "../Components/Shared/EmptyState";
import { Box, Button, Skeleton, Stack, Container, Typography, Alert } from "@mui/material";
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
    </PullToRefresh>
  );
}
