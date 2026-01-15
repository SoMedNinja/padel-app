import { useState } from "react";

export default function EloLeaderboard({ players = [] }) {
  const [sortKey, setSortKey] = useState("elo");
  const [asc, setAsc] = useState(false);

  const filteredPlayers = players.filter((p) => p.name !== "Gäst");

  // Sortering
  const sortedPlayers = [...filteredPlayers].sort((a, b) => {
    let valA, valB;
    switch (sortKey) {
      case "name":
        valA = a.name.toLowerCase();
        valB = b.name.toLowerCase();
        return asc ? (valA > valB ? 1 : -1) : valA > valB ? -1 : 1;
      case "elo":
        valA = a.elo;
        valB = b.elo;
        break;
      case "wins":
        valA = a.wins;
        valB = b.wins;
        break;
      case "games":
        valA = a.wins + a.losses;
        valB = b.wins + b.losses;
        break;
      case "winPct":
        valA = a.wins / (a.wins + a.losses || 1);
        valB = b.wins / (b.wins + b.losses || 1);
        break;
      default:
        valA = a[sortKey];
        valB = b[sortKey];
    }
    return asc ? valA - valB : valB - valA;
  });

  const handleSort = (key) => {
    if (key === sortKey) setAsc(!asc);
    else {
      setSortKey(key);
      setAsc(false);
    }
  };

  // Trend-pil (baserat på senaste 5 matcher)
  const getTrend = (p) => {
    const results = p.recentResults || [];
    if (!results.length) return "➖";

    const last5 = results.slice(-5);
    if (last5.every((r) => r === "W")) return "⬆️";
    if (last5.every((r) => r === "L")) return "⬇️";
    return "➖";
  };

  return (
    <div>
      <h2>ELO Leaderboard</h2>
      <table>
        <thead>
          <tr>
            <th onClick={() => handleSort("name")}>Spelare</th>
            <th onClick={() => handleSort("elo")}>ELO</th>
            <th onClick={() => handleSort("games")}>Matcher</th>
            <th onClick={() => handleSort("wins")}>Vinster</th>
            <th>Trend</th>
            <th onClick={() => handleSort("winPct")}>Vinst %</th>
          </tr>
        </thead>
        <tbody>
          {sortedPlayers.map((p) => {
            const games = p.wins + p.losses;
            const winPct = games === 0 ? 0 : Math.round((p.wins / games) * 100);
            return (
              <tr key={p.name}>
                <td>{p.name}</td>
                <td>{Math.round(p.elo)}</td>
                <td>{games}</td>
                <td>{p.wins}</td>
                <td>{getTrend(p)}</td>
                <td>{winPct}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
