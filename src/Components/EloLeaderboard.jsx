import { useState } from "react";
import Avatar from "./Avatar";
import { getStoredAvatar } from "../utils/avatar";

// Enkel hjälpfunktion för vinstprocent
const winPct = (wins, losses) =>
  wins + losses === 0 ? 0 : Math.round((wins / (wins + losses)) * 100);

export default function EloLeaderboard({ players = [] }) {
  const [sortKey, setSortKey] = useState("elo");
  const [asc, setAsc] = useState(false);

  // Ta bort Gäst tidigt
  const visiblePlayers = players.filter(p => p.name !== "Gäst");

  const sortedPlayers = [...visiblePlayers].sort((a, b) => {
    let aVal, bVal;

    switch (sortKey) {
      case "name":
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
        return asc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      case "games":
        aVal = a.wins + a.losses;
        bVal = b.wins + b.losses;
        break;
      case "winPct":
        aVal = a.wins / (a.wins + a.losses || 1);
        bVal = b.wins / (b.wins + b.losses || 1);
        break;
      default:
        aVal = a[sortKey];
        bVal = b[sortKey];
    }

    return asc ? aVal - bVal : bVal - aVal;
  });

  const toggleSort = (key) => {
    if (key === sortKey) setAsc(!asc);
    else {
      setSortKey(key);
      setAsc(false);
    }
  };

  // Trend baserat på senaste 5 matcher
  const getTrend = (player) => {
    const last5 = player.recentResults?.slice(-5) || [];
    if (last5.length < 3) return "N/A";
    const wins = last5.filter(r => r === "W").length;
    const total = last5.length || 1;
    const winRate = wins / total;

    if (winRate >= 0.8) return "⬆️";
    if (winRate <= 0.2) return "⬇️";
    return "➖";
  };

  return (
    <div>
      <h2>ELO Leaderboard</h2>
      <table>
        <thead>
          <tr>
            <th onClick={() => toggleSort("name")}>Spelare</th>
            <th onClick={() => toggleSort("elo")}>ELO</th>
            <th onClick={() => toggleSort("games")}>Matcher</th>
            <th onClick={() => toggleSort("wins")}>Vinster</th>
            <th>Trend</th>
            <th onClick={() => toggleSort("winPct")}>Vinst %</th>
          </tr>
        </thead>
        <tbody>
          {sortedPlayers.map(p => (
            <tr key={p.name}>
              <td>
                <div className="leaderboard-name">
                  <Avatar
                    className="leaderboard-avatar"
                    src={getStoredAvatar(p.id)}
                    name={p.name}
                    alt={`Profilbild för ${p.name}`}
                  />
                  <span>{p.name}</span>
                </div>
              </td>
              <td>{Math.round(p.elo)}</td>
              <td>{p.wins + p.losses}</td>
              <td>{p.wins}</td>
              <td>{getTrend(p)}</td>
              <td>{winPct(p.wins, p.losses)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
