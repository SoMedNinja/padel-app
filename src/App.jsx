import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import MatchForm from './MatchForm'
import Leaderboard from './Leaderboard'
import History from './History'
import Heatmap from "./Heatmap"
import Streaks from "./Streaks"
import './index.css'

export default function App() {
  const [matches, setMatches] = useState([])

  const fetchMatches = async () => {
    const { data } = await supabase
      .from('matches')
      .select('*')
      .order('created_at', { ascending: true })
    setMatches(data || [])
  }

  useEffect(() => {
    fetchMatches()
  }, [])

  const addMatch = async (match) => {
    await supabase.from('matches').insert([match])
    fetchMatches()
  }

  const deleteMatch = async (id) => {
    await supabase.from('matches').delete().eq('id', id)
    fetchMatches()
  }

  return (
    <div className="container">
      <h1>🎾 Grabbarnas Serie 🎾</h1>
      <img className="pad-img" src="https://www.lofthousepadelcourtspecialists.co.uk/wp-content/uploads/lofthouse-padel-71.webp" alt="Padel match" />
      <MatchForm addMatch={addMatch} />
      <Leaderboard matches={matches} />
      <Heatmap matches={matches} />
      <Streaks matches={matches} />
      <History matches={matches} deleteMatch={deleteMatch} />
    </div>
  )
}
