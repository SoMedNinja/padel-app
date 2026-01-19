import { useMemo, useState } from "react";
import { getProfileDisplayName, makeProfileMap, resolveTeamNames } from "../utils/profileMap";

const ELO_BASELINE = 1000;

export default function Heatmap({ matches = [], profiles = [], eloPlayers = [] }) {
  const [sortKey, setSortKey] = useState("games");
  const [asc, setAsc] = useState(false);

  const profileMap = useMemo(() => makeProfileMap(profiles), [profiles]);
  const allowedNames = useMemo(
    () => new Set(profiles.map(profile => getProfileDisplayName(profile)).filter(Boolean)),
    [profiles]
  );
  const eloMap = useMemo(() => {
    return new Map(eloPlayers.map(player => [player.name, player.elo]));
  }, [eloPlayers]);

  if (!matches.length) return null;

  const combos = {};
  matches.forEach((m) => {
    const team1 = resolveTeamNames(m.team1_ids, m.team1, profileMap);
    const team2 = resolveTeamNames(m.team2_ids, m.team2, profileMap);
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

  let rows = Object.values(combos).map((c) => {
    const avgElo = c.players.length
      ? Math.round(
        c.players.reduce((sum, name) => sum + (eloMap.get(name) ?? ELO_BASELINE), 0) / c.players.length
      )
      : ELO_BASELINE;
    return { ...c, winPct: Math.round((c.wins / c.games) * 100), avgElo };
  });

  rows.sort((a, b) => {
    let valA = a[sortKey], valB = b[sortKey];
    if (sortKey === "winPct") {
      valA = a.winPct; valB = b.winPct;
    }
    if (sortKey === "avgElo") {
      valA = a.avgElo; valB = b.avgElo;
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
    <div className="table-card">
      <h2>Lag-kombinationer</h2>
      <table className="styled-table">
        <thead>
          <tr>
            <th className="sortable" onClick={() => handleSort("players")}>Lag</th>
            <th className="sortable" onClick={() => handleSort("games")}>Matcher</th>
            <th className="sortable" onClick={() => handleSort("wins")}>Vinster</th>
            <th className="sortable" onClick={() => handleSort("winPct")}>Vinst %</th>
            <th className="sortable" onClick={() => handleSort("avgElo")}>Nuvarande snitt-ELO</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.players.join("-")}>
              <td>{r.players.join(" & ")}</td>
              <td>{r.games}</td>
              <td>{r.wins}</td>
              <td>{r.winPct}%</td>
              <td>{r.avgElo}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
