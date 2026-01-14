export default function Streaks({ matches }) {
  const streaks = {}
  const longest = {}

  matches.forEach(m => {
    const winner =
      m.sets_a > m.sets_b ? m.team_a :
      m.sets_b > m.sets_a ? m.team_b :
      null

    const losers =
      winner === m.team_a ? m.team_b :
      winner === m.team_b ? m.team_a :
      []

    winner?.forEach(p => {
      streaks[p] = (streaks[p] || 0) + 1
      longest[p] = Math.max(longest[p] || 0, streaks[p])
    })

    losers.forEach(p => streaks[p] = 0)
  })

  return (
    <div>
      <h2>Streaks</h2>
      <table>
        <thead>
          <tr>
            <th>Spelare</th>
            <th>Nuvarande</th>
            <th>Längsta</th>
          </tr>
        </thead>
        <tbody>
          {Object.keys(longest).map(p => (
            <tr key={p}>
              <td>{p}</td>
              <td>{streaks[p] || 0}</td>
              <td>{longest[p]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
