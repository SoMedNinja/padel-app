import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import MatchForm from './MatchForm'
import Leaderboard from './Leaderboard'
import History from './History'
import WinChart from './WinChart' // ny graf-komponent
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
      <h1>🎾 Padel Serien</h1>
      <img className="pad-img" src="https://images.unsplash.com/photo-1599058917210-37e8e7a3e89e?auto=format&fit=crop&w=600&q=80" alt="Padel match" />
      <MatchForm addMatch={addMatch} />
      <Leaderboard matches={matches} />
      <WinChart matches={matches} />
      <History matches={matches} deleteMatch={deleteMatch} />
    </div>
  )
}
