import { useState } from 'react'

const players = ["Daniel", "Rojan", "Parth", "Rustam", "Robert", "Gäst"]

export default function MatchForm({ addMatch }) {
  const [teamA, setTeamA] = useState(["", ""])
  const [teamB, setTeamB] = useState(["", ""])
  const [setsA, setSetsA] = useState(0)
  const [setsB, setSetsB] = useState(0)

  const handleSubmit = (e) => {
    e.preventDefault()
    // Validering
    if (
      teamA.includes("") ||
      teamB.includes("") ||
      teamA.some(p => teamB.includes(p)) ||
      (setsA < 0 || setsB < 0)
    ) {
      alert("Kontrollera spelare och set-resultat!")
      return
    }
    addMatch({ team_a: teamA, team_b: teamB, sets_a: setsA, sets_b: setsB })
    setTeamA(["",""])
    setTeamB(["",""])
    setSetsA(0)
    setSetsB(0)
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: 20 }}>
      <h2>Lägg till match</h2>
      <div style={{ display:'flex', gap:10, marginBottom:10 }}>
        <div>
          <label>Team A</label>
          {teamA.map((val,i)=>(
            <select key={i} value={val} onChange={e=>{
              const newTeam = [...teamA]; newTeam[i]=e.target.value; setTeamA(newTeam)
            }}>
              <option value="">Välj spelare</option>
              {players.map(p=><option key={p} value={p}>{p}</option>)}
            </select>
          ))}
        </div>
        <div>
          <label>Team B</label>
          {teamB.map((val,i)=>(
            <select key={i} value={val} onChange={e=>{
              const newTeam = [...teamB]; newTeam[i]=e.target.value; setTeamB(newTeam)
            }}>
              <option value="">Välj spelare</option>
              {players.map(p=><option key={p} value={p}>{p}</option>)}
            </select>
          ))}
        </div>
      </div>
      <div style={{ display:'flex', gap:10, marginBottom:10 }}>
        <label>Set Team A</label>
        <input type="number" value={setsA} onChange={e=>setSetsA(Number(e.target.value))} min={0} />
        <label>Set Team B</label>
        <input type="number" value={setsB} onChange={e=>setSetsB(Number(e.target.value))} min={0} />
      </div>
      <button type="submit">Lägg till match</button>
    </form>
  )
}
