import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import MatchForm from './MatchForm'
import Leaderboard from './Leaderboard'
import History from './History'

export default function App() {
  const [matches, setMatches] = useState([])

  // Hämta matcher från Supabase
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
    <div style={{ maxWidth: 600, margin: 'auto', padding: 20, fontFamily: 'sans-serif' }}>
      <h1>Padel Serien</h1>
      <MatchForm addMatch={addMatch} />
      <Leaderboard matches={matches} />
      <History matches={matches} deleteMatch={deleteMatch} />
    </div>
  )
}
