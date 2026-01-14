import { useEffect,useState } from "react";
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

export default function App(){
  const [matches,setMatches]=useState([]);
  const [filter,setFilter]=useState("all");

  useEffect(()=>{fetchMatches()},[]);

  const fetchMatches=async()=>{
    const {data,error}=await supabase.from("matches").select("*").order("created_at",{ascending:false});
    if(error) console.error(error);
    else setMatches(data||[]);
  }

  const addMatch=async(newMatch)=>{
    const {data,error}=await supabase.from("matches").insert([newMatch]).select();
    if(error) console.error(error);
    else if(data?.length) setMatches([data[0],...matches]);
  }

  const deleteMatch=async(id)=>{
    const {error}=await supabase.from("matches").delete().eq("id",id);
    if(error) console.error(error);
    else setMatches(prev=>prev.filter(m=>m.id!==id));
  }

  const filteredMatches=filterMatches(matches||[],filter);
  const eloData=calculateElo(filteredMatches||[]);

  return (
    <div className="container">
      <h1>🎾 Padel Tracker</h1>
      <MatchForm addMatch={addMatch} />
      <MVP matches={matches} />
      <FilterBar filter={filter} setFilter={setFilter} />
      <EloLeaderboard data={eloData} />
      <Heatmap matches={filteredMatches} />
      <Streaks matches={filteredMatches} />
      <History matches={matches} deleteMatch={deleteMatch} />
    </div>
  );
}
