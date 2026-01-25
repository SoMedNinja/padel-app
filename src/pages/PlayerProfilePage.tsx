import React from "react";
import PlayerSection, { HeadToHeadSection } from "../Components/PlayerSection";
import MeritsSection from "../Components/MeritsSection";
import { useStore } from "../store/useStore";
import { useMatches } from "../hooks/useMatches";
import { useProfiles } from "../hooks/useProfiles";
import { usePadelData } from "../hooks/usePadelData";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../supabaseClient";
import { Match, Profile, TournamentResult } from "../types";
import { useScrollToFragment } from "../hooks/useScrollToFragment";
import { Box, Skeleton, Stack } from "@mui/material";
import PullToRefresh from "react-simple-pull-to-refresh";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
import { PostgrestError } from "@supabase/supabase-js";
import { queryKeys } from "../utils/queryKeys";

type TournamentResultRow = TournamentResult & {
  mexicana_tournaments?: { tournament_type?: string | null } | null;
};

export default function PlayerProfilePage() {
  const { matchFilter, user, isGuest } = useStore();
  const {
    data: profiles = [] as Profile[],
    isLoading: isLoadingProfiles,
    isError: isProfilesError,
    error: profilesError,
    refetch: refetchProfiles,
  } = useProfiles();
  const {
    data: matches = [] as Match[],
    isLoading: isLoadingMatches,
    isError: isMatchesError,
    error: matchesError,
    refetch: refetchMatches,
  } = useMatches(matchFilter);

  useScrollToFragment();

  const {
    data: tournamentResults = [] as TournamentResult[],
    isLoading: isLoadingTournamentResults,
    isError: isTournamentResultsError,
    error: tournamentResultsError,
    refetch: refetchTournamentResults,
  } = useQuery({
    queryKey: queryKeys.tournamentResults(),
    queryFn: async () => {
      const { data, error } = (await supabase
        .from("mexicana_results")
        .select("*, mexicana_tournaments(tournament_type)")) as {
        data: TournamentResultRow[] | null;
        error: PostgrestError | null;
      };
      if (error) throw error;
      return (data || []).map((row) => ({
        ...row,
        tournament_type: row.mexicana_tournaments?.tournament_type || "mexicano",
      })) as TournamentResult[];
    },
  });

  const { filteredMatches } = usePadelData(matches, matchFilter, profiles);

  // Simplified handling for admin and approval state for now
  const userWithAdmin = user ? { ...user, is_admin: user.is_admin } : null;

  const handleProfileUpdate = () => {
    // In a real refactor, TanStack Query would handle invalidation
  };

  const handleRefresh = usePullToRefresh([
    refetchProfiles,
    refetchMatches,
    refetchTournamentResults,
  ]);

  const isLoading = isLoadingProfiles || isLoadingMatches || isLoadingTournamentResults;
  const hasError = isProfilesError || isMatchesError || isTournamentResultsError;
  const errorMessage =
    (profilesError as Error | undefined)?.message ||
    (matchesError as Error | undefined)?.message ||
    (tournamentResultsError as Error | undefined)?.message ||
    "Något gick fel när profilen laddades.";

  if (isGuest) {
    return (
      <div className="container">
        <section className="player-section">
          <h2>Spelarprofil</h2>
          <p className="muted">Logga in för att se din spelprofil, meriter och statistik.</p>
        </section>
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="page-section">
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
            {/* Note for non-coders: these placeholders show the page structure while data loads. */}
            <Skeleton variant="rectangular" height={160} sx={{ borderRadius: "14px" }} />
            <Box className="mvp-grid">
              <Skeleton variant="rectangular" height={160} sx={{ borderRadius: "14px" }} />
              <Skeleton variant="rectangular" height={160} sx={{ borderRadius: "14px" }} />
            </Box>
            <Skeleton variant="rectangular" height={240} sx={{ borderRadius: "14px" }} />
          </Stack>
        ) : (
          <>
            <section id="profile" className="page-section">
              <PlayerSection
                user={userWithAdmin}
                profiles={profiles}
                matches={filteredMatches}
                tournamentResults={tournamentResults}
                onProfileUpdate={handleProfileUpdate}
              />
            </section>

            <section id="head-to-head" className="page-section">
              <HeadToHeadSection
                user={userWithAdmin}
                profiles={profiles}
                matches={filteredMatches}
                tournamentResults={tournamentResults}
              />
            </section>

            <section id="meriter" className="page-section">
              <MeritsSection
                user={userWithAdmin}
                profiles={profiles}
                matches={filteredMatches}
                tournamentResults={tournamentResults}
                onProfileUpdate={handleProfileUpdate}
              />
            </section>
          </>
        )}
      </div>
    </PullToRefresh>
  );
}
