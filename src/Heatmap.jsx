export default function Heatmap({ matches }) {
  const pairs = {}

  matches.forEach(m => {
    const teams = [m.team_a, m.team_b]
    const winner =
      m.sets_a > m.sets_b ? m.team_a :
      m.sets_b > m.sets_a ? m.team_b :
      null

    teams.forEach(team => {
      const key = team.slice().sort().join(" + ")
      if (!pairs[key]) {
        pairs[key] = { wins: 0, games: 0 }
      }
      pairs[key].games += 1
      if (winner === team) pairs[key].wins += 1
    })
  })

  return (
    <div>
      <h2>Lag-kombinationer</h2>
      <table>
        <thead>
          <tr>
            <th>Lag</th>
            <th>Vinster</th>
            <th>Matcher</th>
            <th>Win %</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(pairs).map(([k, v]) => (
            <tr key={k}>
              <td>{k}</td>
              <td>{v.wins}</td>
              <td>{v.games}</td>
              <td>{Math.round((v.wins / v.games) * 100)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
