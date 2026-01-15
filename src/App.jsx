import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

import MatchForm from "./Components/MatchForm";
import FilterBar from "./Components/FilterBar";
import EloLeaderboard from "./Components/EloLeaderboard";
import EloTrend from "./Components/EloTrend";
import EveningMVP from "./Components/EveningMVP";
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

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    const { data, error } = await supabase
      .from("matches")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) console.error(error);
    else setMatches(data || []);
  };

  const addMatch = async (newMatch) => {
    const { data, error } = await supabase
      .from("matches")
      .insert([newMatch])
      .select();

    if (error) console.error(error);
    else if (data?.length) setMatches((prev) => [data[0], ...prev]);
  };

  const deleteMatch = async (id) => {
    const { error } = await supabase
      .from("matches")
      .delete()
      .eq("id", id);

    if (error) console.error(error);
    else setMatches((prev) => prev.filter((m) => m.id !== id));
  };

  const filteredMatches = filterMatches(matches || [], filter);
  const eloData = calculateElo(filteredMatches || []);

  // ✅ Lägg till recentResults för trendpilar
  const eloDataWithTrend = eloData.map((player) => {
    const recentResults = filteredMatches
      .filter(
        (m) =>
          (m.team1.includes(player.name) || m.team2.includes(player.name)) &&
          player.name !== "Gäst"
      )
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .slice(-5) // senaste 5 matcher
      .map((m) => {
        const won =
          (m.team1.includes(player.name) && m.team1_sets > m.team2_sets) ||
          (m.team2.includes(player.name) && m.team2_sets > m.team1_sets);
        return won ? "W" : "L";
      });

    return { ...player, recentResults };
  });

  return (
    <div className="container">
      <h1>🎾 Grabbarna Padel serie 🎾</h1>

      <img
        src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTDZWbUaweXM_U65wOYjii388InjcWi8d2Emg&s"
        alt="Padel"
        style={{
          width: "100%",
          maxHeight: 300,
          objectFit: "cover",
          borderRadius: 8,
          marginBottom: 20,
        }}
      />

      <MatchForm addMatch={addMatch} />
      <MVP matches={filteredMatches || []} players={eloDataWithTrend || []} />
      <EveningMVP matches={filteredMatches || []} players={eloDataWithTrend || []} />
      <FilterBar filter={filter} setFilter={setFilter} />
      <EloLeaderboard players={eloDataWithTrend || []} />
      <Heatmap matches={filteredMatches || []} />
      <Streaks matches={filteredMatches || []} />
      <EloTrend players={eloData || []} />
      <History matches={matches || []} deleteMatch={deleteMatch} />
    </div>
  );
}
