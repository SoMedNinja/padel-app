import React from "react";
import MVP from "../Components/MVP";
import EloLeaderboard from "../Components/EloLeaderboard";
import Heatmap from "../Components/Heatmap";
import FilterBar from "../Components/FilterBar";
import { useStore } from "../store/useStore";
import { useMatches } from "../hooks/useMatches";
import { useProfiles } from "../hooks/useProfiles";
import { usePadelData } from "../hooks/usePadelData";
import { Match, Profile } from "../types";
import { useScrollToFragment } from "../hooks/useScrollToFragment";

export default function Dashboard() {
  const { matchFilter, setMatchFilter } = useStore();
  const { data: profiles = [] as Profile[] } = useProfiles();
  const { data: matches = [] as Match[] } = useMatches(matchFilter);

  useScrollToFragment();

  const { filteredMatches, playersWithTrend } = usePadelData(matches, matchFilter, profiles);

  return (
    <section id="dashboard" className="page-section">
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
    </section>
  );
}
