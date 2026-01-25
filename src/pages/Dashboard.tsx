import React from "react";
import MVP from "../Components/MVP";
import EloLeaderboard from "../Components/EloLeaderboard";
import Heatmap from "../Components/Heatmap";
import FilterBar from "../Components/FilterBar";
import { Skeleton } from "@mui/material";
import PTR from "react-simple-pull-to-refresh";
import { useStore } from "../store/useStore";

const PullToRefresh = (PTR as any).default || PTR;
import { useMatches } from "../hooks/useMatches";
import { useProfiles } from "../hooks/useProfiles";
import { usePadelData } from "../hooks/usePadelData";
import { Match, Profile } from "../types";
import { useScrollToFragment } from "../hooks/useScrollToFragment";

export default function Dashboard() {
  const { matchFilter, setMatchFilter } = useStore();
  const {
    data: profiles = [] as Profile[],
    isLoading: isLoadingProfiles,
    isError: isProfilesError,
    error: profilesError,
    refetch: refetchProfiles
  } = useProfiles();
  const {
    data: matches = [] as Match[],
    isLoading: isLoadingMatches,
    isError: isMatchesError,
    error: matchesError,
    refetch: refetchMatches
  } = useMatches(matchFilter);

  useScrollToFragment();

  const handleRefresh = async () => {
    await Promise.all([refetchProfiles(), refetchMatches()]);
  };

  const { filteredMatches, playersWithTrend } = usePadelData(matches, matchFilter, profiles);
  const hasError = isProfilesError || isMatchesError;
  const errorMessage =
    (profilesError as Error | undefined)?.message ||
    (matchesError as Error | undefined)?.message ||
    "Något gick fel när data hämtades.";

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <section id="dashboard" className="page-section">
      {hasError && (
        <div className="notice-banner error" role="alert">
          <span>{errorMessage}</span>
          <button type="button" className="ghost-button" onClick={handleRefresh}>
            Försök igen
          </button>
        </div>
      )}
      {(isLoadingProfiles || isLoadingMatches) ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '16px' }}>
          <Skeleton variant="rectangular" width={160} height={40} sx={{ borderRadius: '12px' }} />
          <div className="mvp-grid">
            <Skeleton variant="rectangular" height={160} sx={{ borderRadius: '14px' }} />
            <Skeleton variant="rectangular" height={160} sx={{ borderRadius: '14px' }} />
          </div>
          <Skeleton variant="rectangular" height={400} sx={{ borderRadius: '14px' }} />
        </div>
      ) : (
        <>
          <FilterBar filter={matchFilter} setFilter={setMatchFilter} />
          {!filteredMatches.length ? (
            <div className="notice-banner" role="status">
              <span>Inga matcher ännu. Lägg in din första match för att se statistik.</span>
            </div>
          ) : (
            <>
              <div className="mvp-grid">
                <MVP
                  matches={filteredMatches}
                  players={playersWithTrend}
                  mode="evening"
                  title="Kvällens MVP"
                />
                <MVP
                  matches={filteredMatches}
                  players={playersWithTrend}
                  mode="30days"
                  title="Månadens MVP"
                />
              </div>
              <EloLeaderboard players={playersWithTrend} />
              <Heatmap matches={filteredMatches} profiles={profiles} eloPlayers={playersWithTrend} />
            </>
          )}
        </>
      )}
    </section>
    </PullToRefresh>
  );
}
