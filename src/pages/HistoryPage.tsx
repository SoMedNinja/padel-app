import React from "react";
import History from "../Components/History";
import FilterBar from "../Components/FilterBar";
import { Skeleton } from "@mui/material";
import PTR from "react-simple-pull-to-refresh";
import { useStore } from "../store/useStore";

const PullToRefresh = (PTR as any).default || PTR;
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
    isError,
    error,
    refetch: refetchMatches
  } = useInfiniteMatches(matchFilter);
  const {
    data: profiles = [] as Profile[],
    isError: isProfilesError,
    error: profilesError,
    refetch: refetchProfiles
  } = useProfiles();

  const allMatches = data?.pages.flat() || [];

  const handleRefresh = async () => {
    await Promise.all([refetchMatches(), refetchProfiles()]);
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <section id="history" className="page-section">
      <h2>Match-historik</h2>
      {(isError || isProfilesError) && (
        <div className="notice-banner error" role="alert">
          <span>
            {(error as Error | undefined)?.message ||
              (profilesError as Error | undefined)?.message ||
              "Något gick fel när historiken laddades."}
          </span>
          <button type="button" className="ghost-button" onClick={handleRefresh}>
            Försök igen
          </button>
        </div>
      )}
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
