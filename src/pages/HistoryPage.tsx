import React from "react";
import History from "../Components/History";
import FilterBar from "../Components/FilterBar";
import { Skeleton } from "@mui/material";
import PullToRefresh from "react-simple-pull-to-refresh";
import { useStore } from "../store/useStore";
import { useInfiniteMatches } from "../hooks/useInfiniteMatches";
import { useProfiles } from "../hooks/useProfiles";
import { Match, Profile } from "../types";

export default function HistoryPage() {
  const { matchFilter, setMatchFilter, user, isGuest } = useStore();
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch: refetchMatches
  } = useInfiniteMatches(matchFilter);
  const { data: profiles = [] as Profile[], refetch: refetchProfiles } = useProfiles();

  const allMatches = data?.pages.flat() || [];

  const handleRefresh = async () => {
    await Promise.all([refetchMatches(), refetchProfiles()]);
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <section id="history" className="page-section">
      <h2>Match-historik</h2>
      <FilterBar filter={matchFilter} setFilter={setMatchFilter} />
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Skeleton variant="rectangular" height={400} sx={{ borderRadius: '14px' }} />
        </div>
      ) : (
        <>
          <History
            matches={allMatches}
            profiles={profiles}
            user={isGuest ? null : user}
          />
          {hasNextPage && (
            <div className="load-more">
              <button
                type="button"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? <Skeleton width={100} height={24} sx={{ display: 'inline-block' }} /> : "Visa fler matcher"}
              </button>
            </div>
          )}
        </>
      )}
    </section>
    </PullToRefresh>
  );
}
