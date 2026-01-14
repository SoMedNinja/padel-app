import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

import MatchForm from "./Components/MatchForm";
import FilterBar from "./Components/FilterBar";
import EloLeaderboard from "./Components/EloLeaderboard";
import Heatmap from "./Components/Heatmap";
import Streaks from "./Components/Streaks";
import MVP from "./Components/MVP";

import { filterMatches } from "./Utils/filters";
import { calculateElo } from "./Utils/elo";

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
