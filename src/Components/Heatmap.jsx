import { useMemo, useState } from "react";
import { getProfileDisplayName, makeProfileMap, resolveTeamNames } from "../utils/profileMap";
import { GUEST_NAME } from "../utils/guest";

const ELO_BASELINE = 1000;
const normalizeProfileName = (name) => name?.trim().toLowerCase();

export default function Heatmap({ matches = [], profiles = [], eloPlayers = [] }) {
  const [sortKey, setSortKey] = useState("games");
  const [asc, setAsc] = useState(false);

  const profileMap = useMemo(() => makeProfileMap(profiles), [profiles]);
  const allowedNameMap = useMemo(() => {
    const map = new Map();
    profiles.forEach(profile => {
      const name = getProfileDisplayName(profile);
      const key = normalizeProfileName(name);
      if (key && !map.has(key)) {
        map.set(key, name);
      }
    });
    map.set(normalizeProfileName(GUEST_NAME), GUEST_NAME);
    return map;
  }, [profiles]);
  const eloMap = useMemo(() => {
    return new Map(eloPlayers.map(player => [player.name, player.elo]));
  }, [eloPlayers]);

  if (!matches.length) return null;

  const combos = {};
  const sortedMatches = [...matches].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );

  sortedMatches.forEach((m) => {
    const team1 = resolveTeamNames(m.team1_ids, m.team1, profileMap);
    const team2 = resolveTeamNames(m.team2_ids, m.team2, profileMap);
    const teams = [
      { players: team1, won: m.team1_sets > m.team2_sets },
      { players: team2, won: m.team2_sets > m.team1_sets },
    ];

    teams.forEach(({ players, won }) => {
      if (!Array.isArray(players) || !players.length) return;
      const resolvedPlayers = players
        .map(player => {
          const key = normalizeProfileName(player);
          if (!key) return null;
          return allowedNameMap.get(key) || null;
        })
        .filter(Boolean);

      if (!resolvedPlayers.length) return;
      if (resolvedPlayers.some(player => normalizeProfileName(player) === normalizeProfileName(GUEST_NAME))) {
        return;
      }
      if (allowedNameMap.size && resolvedPlayers.some(player => !allowedNameMap.has(normalizeProfileName(player)))) {
        return;
      }

      const key = [...resolvedPlayers].sort().join(" + ");
      if (!combos[key]) {
        combos[key] = {
          players: [...resolvedPlayers].sort(),
          games: 0,
          wins: 0,
          recentResults: [],
        };
      }
      combos[key].games++;
      if (won) combos[key].wins++;
      if (combos[key].recentResults.length < 5) {
        combos[key].recentResults.push(won ? "V" : "F");
      }
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
            <th>Senaste 5</th>
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
              <td>
                {r.recentResults?.length ? (
                  <span className="table-results">
                    {r.recentResults.map((result, index) => (
                      <span
                        key={`${result}-${index}`}
                        className={`result-pill ${result === "V" ? "result-win" : "result-loss"}`}
                      >
                        {result}
                      </span>
                    ))}
                  </span>
                ) : (
                  "-"
                )}
              </td>
              <td>{r.avgElo}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
