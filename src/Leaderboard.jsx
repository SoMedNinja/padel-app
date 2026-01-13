export default function Leaderboard({ matches }) {
  const scores = {}

  // Räkna poäng
  matches.forEach(m=>{
    const { team_a, team_b, sets_a, sets_b } = m
    const winner = sets_a > sets_b ? team_a : sets_b > sets_a ? team_b : null
    if(!winner) return
    winner.forEach(p=>{
      if(!scores[p]) scores[p]=0
      scores[p] += 1
    })
  })

  const sorted = Object.entries(scores).sort((a,b)=>b[1]-a[1])

  return (
    <div style={{ marginBottom:20 }}>
      <h2>Leaderboard</h2>
      <table>
        <thead>
          <tr><th>Spelare</th><th>Vinster</th></tr>
        </thead>
        <tbody>
          {sorted.map(([p,v])=><tr key={p}><td>{p}</td><td>{v}</td></tr>)}
        </tbody>
      </table>
    </div>
  )
}
