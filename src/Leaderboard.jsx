import { useState } from "react"
import { calculateElo } from "./elo"

export default function Leaderboard({ matches }) {
  const [filter, setFilter] = useState("all")

  const filtered = matches.filter(m => {
    const maxSet = Math.max(m.sets_a, m.sets_b)
    if (filter === "short") return maxSet <= 3
    if (filter === "long") return maxSet >= 6
    return true
  })

  const elo = calculateElo(filtered)

  const sorted = Object.entries(elo)
    .sort((a, b) => b[1] - a[1])

  return (
    <div>
      <h2>Leaderboard</h2>

      <select value={filter} onChange={e => setFilter(e.target.value)}>
        <option value="all">Alla matcher</option>
        <option value="short">Korta matcher</option>
        <option value="long">Långa matcher</option>
      </select>

      <table>
        <thead>
          <tr>
            <th>Spelare</th>
            <th>ELO</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(([p, r]) => (
            <tr key={p}>
              <td>{p}</td>
              <td>{Math.round(r)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
