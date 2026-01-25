import React from "react";
import MexicanaTournament from "../Components/MexicanaTournament";
import { useStore } from "../store/useStore";
import { useProfiles } from "../hooks/useProfiles";
import { useMatches } from "../hooks/useMatches";
import { calculateElo } from "../utils/elo";
import { useQueryClient } from "@tanstack/react-query";
import PullToRefresh from "react-simple-pull-to-refresh";
import { Match, Profile } from "../types";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
import { Box, Skeleton, Stack } from "@mui/material";
import { queryKeys } from "../utils/queryKeys";

export default function TournamentPage() {
  const { user, isGuest } = useStore();
  const {
    data: profiles = [] as Profile[],
    refetch: refetchProfiles,
    isLoading: isLoadingProfiles,
    isError: isProfilesError,
    error: profilesError,
  } = useProfiles();
  const {
    data: matches = [] as Match[],
    refetch: refetchMatches,
    isLoading: isLoadingMatches,
    isError: isMatchesError,
    error: matchesError,
  } = useMatches({ type: "all" });
  const queryClient = useQueryClient();

  const allEloPlayers = calculateElo(matches, profiles);

  const handleTournamentSync = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.tournamentResults() });
  };

  const handleRefresh = usePullToRefresh([
    refetchProfiles,
    refetchMatches,
    () => queryClient.invalidateQueries({ queryKey: queryKeys.tournaments() }),
    () => queryClient.invalidateQueries({ queryKey: queryKeys.tournamentDetails() }),
    () => queryClient.invalidateQueries({ queryKey: queryKeys.tournamentResults() }),
  ]);

  const isLoading = isLoadingProfiles || isLoadingMatches;
  const hasError = isProfilesError || isMatchesError;
  const errorMessage =
    (profilesError as Error | undefined)?.message ||
    (matchesError as Error | undefined)?.message ||
    "Något gick fel när turneringsdata hämtades.";

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <section id="mexicana" className="page-section">
        {hasError && (
          <div className="notice-banner error" role="alert">
            <span>{errorMessage}</span>
            <button type="button" className="ghost-button" onClick={handleRefresh}>
              Försök igen
            </button>
          </div>
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
            eloPlayers={allEloPlayers}
            isGuest={isGuest}
            onTournamentSync={handleTournamentSync}
          />
        )}
      </section>
    </PullToRefresh>
  );
}
