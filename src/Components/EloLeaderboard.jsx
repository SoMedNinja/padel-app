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

  const getStreak = (player) => {
    const results = player.recentResults || [];
    if (!results.length) return "—";
    const reversed = [...results].reverse();
    const first = reversed[0];
    let count = 0;
    for (const result of reversed) {
      if (result !== first) break;
      count += 1;
    }
    return `${first}${count}`;
  };

  const getTrendIndicator = (player) => {
    const last5 = player.recentResults?.slice(-5) || [];
    if (last5.length < 3) return "—";
    const wins = last5.filter(r => r === "W").length;
    const total = last5.length || 1;
    const winRate = wins / total;

    if (winRate >= 0.8) return "⬆️";
    if (winRate <= 0.2) return "⬇️";
    return "➖";
  };

  return (
    <div className="table-card">
      <h2>ELO Leaderboard</h2>
      <div className="table-scroll">
        <div className="table-scroll-inner">
          <table className="styled-table leaderboard-table">
          <thead>
            <tr>
              <th className="sortable" onClick={() => toggleSort("name")}>Spelare</th>
              <th className="sortable" onClick={() => toggleSort("elo")}>ELO</th>
              <th className="sortable" onClick={() => toggleSort("games")}>Matcher</th>
              <th className="sortable" onClick={() => toggleSort("wins")}>Vinster</th>
              <th>Streak</th>
              <th>Trend</th>
              <th className="sortable" onClick={() => toggleSort("winPct")}>Vinst %</th>
            </tr>
          </thead>
          <tbody>
            {sortedPlayers.map(p => (
              <tr key={p.name}>
                <td>
                  <div className="leaderboard-name" tabIndex={0}>
                    <Avatar
                      className="leaderboard-avatar"
                      src={p.avatarUrl || getStoredAvatar(p.id)}
                      name={p.name}
                      alt={`Profilbild för ${p.name}`}
                    />
                    <span>{p.name}</span>
                  </div>
                </td>
                <td>{Math.round(p.elo)}</td>
                <td>{p.wins + p.losses}</td>
                <td>{p.wins}</td>
                <td>{getStreak(p)}</td>
                <td>
                  <span className="form-trend" aria-hidden="true">
                    {getTrendIndicator(p)}
                  </span>
                </td>
                <td>{winPct(p.wins, p.losses)}%</td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
