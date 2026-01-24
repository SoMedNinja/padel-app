import React from "react";
import History from "../Components/History";
import FilterBar from "../Components/FilterBar";
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
    isLoading
  } = useInfiniteMatches(matchFilter);
  const { data: profiles = [] as Profile[] } = useProfiles();

  const allMatches = data?.pages.flat() || [];

  return (
    <section id="history" className="page-section">
      <h2>Match-historik</h2>
      <FilterBar filter={matchFilter} setFilter={setMatchFilter} />
      {isLoading ? (
        <p className="muted">Laddar matcher...</p>
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
                {isFetchingNextPage ? "Laddar..." : "Visa fler matcher"}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
