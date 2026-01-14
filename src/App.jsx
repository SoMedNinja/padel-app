import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

import MatchForm from "./Components/MatchForm";
import FilterBar from "./Components/FilterBar";
import EloLeaderboard from "./Components/EloLeaderboard";
import Heatmap from "./Components/Heatmap";
import Streaks from "./Components/Streaks";
import MVP from "./Components/MVP";
import History from "./Components/History";

import { filterMatches } from "./utils/filters";
import { calculateElo } from "./utils/elo";

import "./App.css";

export default function App() {
  const [matches, setMatches] = useState([]);
  const [filter, setFilter] = useState("all");

  // Hämta matcher
  useEffect(() => {
    supabase
      .from("matches")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error("Supabase error:", error);
          setMatches([]);
        } else {
          console.log("Matches from Supabase:", data);
          setMatches(data || []);
        }
      });
  }, []);

  const filteredMatches = filterMatches(matches || [], filter) || [];
  const eloData = calculateElo(filteredMatches || []);

  const deleteMatch = (id) => {
    setMatches(prev => prev.filter(m => m.id !== id));
    supabase.from("matches").delete().eq("id", id).then(({error})=>{
      if(error) console.error("Error deleting match:", error)
    });
  };

  return (
    <div className="container">
      <h1>🎾 Padel Tracker</h1>

      <MatchForm addMatch={(newMatch) => setMatches([newMatch, ...matches])} />

      <MVP matches={matches || []} />

      <FilterBar filter={filter} setFilter={setFilter} />

      <EloLeaderboard data={eloData} />

      <Heatmap matches={filteredMatches || []} />

      <Streaks matches={filteredMatches || []} />

      <History matches={matches || []} deleteMatch={deleteMatch} />
    </div>
  );
}
