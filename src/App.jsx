import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

import MatchForm from "./components/MatchForm";
import FilterBar from "./components/FilterBar";
import EloLeaderboard from "./components/EloLeaderboard";
import Heatmap from "./components/Heatmap";
import Streaks from "./components/Streaks";
import MVP from "./components/MVP";

import { filterMatches } from "./utils/filters";
import { calculateElo } from "./utils/elo";

import "./App.css";

export default function App() {
  const [matches, setMatches] = useState([]);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    supabase
      .from("matches")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setMatches(data || []);
      });
  }, []);

  const filteredMatches = filterMatches(matches, filter);
  const eloData = calculateElo(filteredMatches);

  return (
    <div className="container">
      <h1>🎾 Padel Tracker</h1>

      <MatchForm onAdd={m => setMatches(prev => [m, ...prev])} />
      <MVP matches={matches} />

      <FilterBar filter={filter} setFilter={setFilter} />

      <EloLeaderboard data={eloData} />
      <Heatmap matches={filteredMatches} />
      <Streaks matches={filteredMatches} />
    </div>
  );
}
