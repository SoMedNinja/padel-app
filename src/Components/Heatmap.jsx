import { useMemo, useState } from "react";
import { getProfileDisplayName, idsToNames, makeProfileMap } from "../utils/profileMap";

export default function Heatmap({ matches = [], profiles = [] }) {
  const [sortKey, setSortKey] = useState("games");
  const [asc, setAsc] = useState(false);

  if (!matches.length) return null;

  const profileMap = useMemo(() => makeProfileMap(profiles), [profiles]);
  const allowedNames = useMemo(
    () => new Set(profiles.map(profile => getProfileDisplayName(profile)).filter(Boolean)),
    [profiles]
  );

  const combos = {};
  matches.forEach((m) => {
    const team1 = Array.isArray(m.team1) ? m.team1 : idsToNames(m.team1_ids || [], profileMap);
    const team2 = Array.isArray(m.team2) ? m.team2 : idsToNames(m.team2_ids || [], profileMap);
    const teams = [
      { players: team1, won: m.team1_sets > m.team2_sets },
      { players: team2, won: m.team2_sets > m.team1_sets },
    ];

    teams.forEach(({ players, won }) => {
      if (!Array.isArray(players) || !players.length) return;
      if (players.includes("Gäst")) return;
      if (allowedNames.size && players.some(player => !allowedNames.has(player))) return;
      const key = [...players].sort().join(" + ");
      if (!combos[key]) combos[key] = { players: [...players].sort(), games: 0, wins: 0 };
      combos[key].games++;
      if (won) combos[key].wins++;
    });
  });

  let rows = Object.values(combos).map((c) => ({ ...c, winPct: Math.round((c.wins / c.games) * 100) }));

  rows.sort((a, b) => {
    let valA = a[sortKey], valB = b[sortKey];
    if (sortKey === "winPct") {
      valA = a.winPct; valB = b.winPct;
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

  return (
    <div>
      <h2>Lag-kombinationer</h2>
      <table>
        <thead>
          <tr>
            <th onClick={() => handleSort("players")}>Lag</th>
            <th onClick={() => handleSort("games")}>Matcher</th>
            <th onClick={() => handleSort("wins")}>Vinster</th>
            <th onClick={() => handleSort("winPct")}>Vinst %</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.players.join("-")}>
              <td>{r.players.join(" & ")}</td>
              <td>{r.games}</td>
              <td>{r.wins}</td>
              <td>{r.winPct}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
