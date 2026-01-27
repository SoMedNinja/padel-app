import React, { useMemo } from "react";
import History from "../Components/History";
import FilterBar from "../Components/FilterBar";
import EmptyState from "../Components/Shared/EmptyState";
import { Box, Button, Skeleton, Stack, Container, Typography, Alert } from "@mui/material";
import PullToRefresh from "react-simple-pull-to-refresh";
import { useStore } from "../store/useStore";
import { useQueryClient } from "@tanstack/react-query";
import { useEloStats } from "../hooks/useEloStats";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
import { filterMatches } from "../utils/filters";
import { queryKeys } from "../utils/queryKeys";

export default function HistoryPage() {
  const queryClient = useQueryClient();
  const { matchFilter, setMatchFilter, user, isGuest } = useStore();

  const { allMatches, profiles, isLoading, eloDeltaByMatch, eloRatingByMatch, eloPlayers } = useEloStats();

  const filteredMatches = useMemo(
    () => filterMatches(allMatches, matchFilter),
    [allMatches, matchFilter]
  );

  const handleRefresh = usePullToRefresh([
    () => queryClient.invalidateQueries({ queryKey: queryKeys.profiles() }),
    () => queryClient.invalidateQueries({ queryKey: queryKeys.matches({ type: "all" }) }),
  ]);

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Box id="history" component="section">
          <Typography variant="h4" sx={{ mb: 3, fontWeight: 800 }}>Matchhistorik</Typography>

          <FilterBar filter={matchFilter} setFilter={setMatchFilter} />

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
