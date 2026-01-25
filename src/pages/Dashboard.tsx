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
  const { data: profiles = [] as Profile[], isLoading: isLoadingProfiles, refetch: refetchProfiles } = useProfiles();
  const { data: matches = [] as Match[], isLoading: isLoadingMatches, refetch: refetchMatches } = useMatches(matchFilter);

  useScrollToFragment();

  const handleRefresh = async () => {
    await Promise.all([refetchProfiles(), refetchMatches()]);
  };

  const { filteredMatches, playersWithTrend } = usePadelData(matches, matchFilter, profiles);

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <section id="dashboard" className="page-section">
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
    </section>
    </PullToRefresh>
  );
}
