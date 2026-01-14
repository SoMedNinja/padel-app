import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

import MatchForm from "./Components/MatchForm";
import FilterBar from "./Components/FilterBar";
import EloLeaderboard from "./Components/EloLeaderboard";
import Heatmap from "./Components/Heatmap";
import Streaks from "./Components/Streaks";
import MVP from "./Components/MVP";

import { filterMatches } from "./utils/filters"; // små bokstäver
import { calculateElo } from "./utils/elo";      // små bokstäver

import "./App.css";

export default function App() {
  const [matches, setMatches] = useState([]);
  const [filter, setFilter] = useState("all");

  // Hämta matcher från Supabase
  useEffect(() => {
    supabase
      .from("matches")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setMatches(data || []);
      });
  }, []);

  // Filtrera matcher baserat på filterval
  const filteredMatches = filterMatches(matches, filter);

  // Beräkna ELO för filtrerade matcher
  const eloData = calculateElo(filteredMatches);

  return (
    <div className="container">
      <h1>🎾 Padel Tracker</h1>

      {/* Lägg till match */}
      <MatchForm onAdd={(newMatch) => setMatches((prev) => [newMatch, ...prev])} />

      {/* MVP från senaste 30 dagarna */}
      <MVP matches={matches} />

      {/* Filter */}
      <FilterBar filter={filter} setFilter={setFilter} />

      {/* Leaderboard */}
      <EloLeaderboard data={eloData} />

      {/* Lag-kombinationer */}
      <Heatmap matches={filteredMatches} />

      {/* Streaks */}
      <Streaks matches={filteredMatches} />
    </div>
  );
}
