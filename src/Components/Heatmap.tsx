import { useMemo, useState } from "react";
import { getProfileDisplayName, makeProfileMap, resolveTeamNames } from "../utils/profileMap";
import ProfileName from "./ProfileName";
import { GUEST_NAME } from "../utils/guest";
import { Match, Profile, PlayerStats } from "../types";

const ELO_BASELINE = 1000;
const normalizeProfileName = (name: string) => name?.trim().toLowerCase();
const normalizeServeFlag = (value: any) => {
  if (value === true || value === 1 || value === "1" || value === "true") return true;
  if (value === false || value === 0 || value === "0" || value === "false") return false;
  return null;
};

interface HeatmapProps {
  matches?: Match[];
  profiles?: Profile[];
  eloPlayers?: PlayerStats[];
  currentUserOnly?: string;
}

interface Combo {
  players: string[];
  games: number;
  wins: number;
  serveFirstGames: number;
  serveFirstWins: number;
  serveSecondGames: number;
  serveSecondWins: number;
  recentResults: string[];
}

export default function Heatmap({
  matches = [],
  profiles = [],
  eloPlayers = [],
  currentUserOnly
}: HeatmapProps) {
  const [sortKey, setSortKey] = useState<string>("games");
  const [asc, setAsc] = useState<boolean>(false);
  const [playerFilter, setPlayerFilter] = useState<string>("all");

  const profileMap = useMemo(() => makeProfileMap(profiles), [profiles]);
  const allowedNameMap = useMemo(() => {
    const map = new Map<string, string>();
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
  const badgeNameMap = useMemo(() => {
    const map = new Map<string, string | null>();
    profiles.forEach(profile => {
      const name = getProfileDisplayName(profile);
      map.set(name, profile.featured_badge_id || null);
    });
    return map;
  }, [profiles]);
  const eloMap = useMemo(() => {
    return new Map<string, number>(eloPlayers.map(player => [player.name, player.elo]));
  }, [eloPlayers]);

  const sortedProfileNames = useMemo(() => {
    return profiles
      .map(p => getProfileDisplayName(p))
      .filter(name => name !== GUEST_NAME)
      .sort((a, b) => a.localeCompare(b, "sv"));
  }, [profiles]);

  const sortedMatches = useMemo(() => {
    return [...matches].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [matches]);

  const combos = useMemo(() => {
    const comboMap: Record<string, Combo> = {};
    sortedMatches.forEach((m) => {
      const team1 = resolveTeamNames(m.team1_ids, m.team1, profileMap);
      const team2 = resolveTeamNames(m.team2_ids, m.team2, profileMap);
      const normalizedServeFlag = normalizeServeFlag(m.team1_serves_first);
      const team1ServedFirst = normalizedServeFlag === true;
      const team2ServedFirst = normalizedServeFlag === false;
      const teams = [
        { players: team1, won: m.team1_sets > m.team2_sets, servedFirst: team1ServedFirst },
        { players: team2, won: m.team2_sets > m.team1_sets, servedFirst: team2ServedFirst },
      ];

      teams.forEach(({ players, won, servedFirst }) => {
        if (!Array.isArray(players) || !players.length) return;
        const resolvedPlayers = players
          .map(player => {
            const key = normalizeProfileName(player);
            if (!key) return null;
            return allowedNameMap.get(key) || null;
          })
          .filter((p): p is string => Boolean(p));

        if (!resolvedPlayers.length) return;
        if (resolvedPlayers.some(player => normalizeProfileName(player) === normalizeProfileName(GUEST_NAME))) {
          return;
        }
        if (allowedNameMap.size && resolvedPlayers.some(player => !allowedNameMap.has(normalizeProfileName(player)))) {
          return;
        }

        const key = [...resolvedPlayers].sort().join(" + ");
        if (!comboMap[key]) {
          comboMap[key] = {
            players: [...resolvedPlayers].sort(),
            games: 0,
            wins: 0,
            serveFirstGames: 0,
            serveFirstWins: 0,
            serveSecondGames: 0,
            serveSecondWins: 0,
            recentResults: [],
          };
        }
        comboMap[key].games++;
        if (won) comboMap[key].wins++;
        if (servedFirst === true) {
          comboMap[key].serveFirstGames++;
          if (won) comboMap[key].serveFirstWins++;
        }
        if (servedFirst === false) {
          comboMap[key].serveSecondGames++;
          if (won) comboMap[key].serveSecondWins++;
        }
        if (comboMap[key].recentResults.length < 5) {
          comboMap[key].recentResults.push(won ? "V" : "F");
        }
      });
    });
    return comboMap;
  }, [sortedMatches, profileMap, allowedNameMap]);

  if (!matches.length) return null;

  let rows = Object.values(combos).map((c) => {
    const avgElo = c.players.length
      ? Math.round(
        c.players.reduce((sum, name) => sum + (eloMap.get(name) ?? ELO_BASELINE), 0) / c.players.length
      )
      : ELO_BASELINE;
    const serveFirstWinPct = c.serveFirstGames
      ? Math.round((c.serveFirstWins / c.serveFirstGames) * 100)
      : null;
    const serveSecondWinPct = c.serveSecondGames
      ? Math.round((c.serveSecondWins / c.serveSecondGames) * 100)
      : null;
    return {
      ...c,
      winPct: Math.round((c.wins / c.games) * 100),
      serveFirstWinPct,
      serveSecondWinPct,
      avgElo,
    };
  });

  if (currentUserOnly) {
    const currentProfile = profiles.find(p => p.id === currentUserOnly);
    const currentName = currentProfile ? getProfileDisplayName(currentProfile) : null;
    if (currentName) {
      rows = rows.filter(r => r.players.includes(currentName));
    }
  } else if (playerFilter !== "all") {
    rows = rows.filter(r => r.players.includes(playerFilter));
  }

  rows.sort((a: any, b: any) => {
    let valA = a[sortKey], valB = b[sortKey];
    if (sortKey === "winPct") {
      valA = a.winPct; valB = b.winPct;
    }
    if (sortKey === "serveFirstWinPct") {
      valA = a.serveFirstWinPct ?? -1;
      valB = b.serveFirstWinPct ?? -1;
    }
    if (sortKey === "serveSecondWinPct") {
      valA = a.serveSecondWinPct ?? -1;
      valB = b.serveSecondWinPct ?? -1;
    }
    if (sortKey === "avgElo") {
      valA = a.avgElo; valB = b.avgElo;
    }
    if (typeof valA === 'string' && typeof valB === 'string') {
      return asc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    return asc ? valA - valB : valB - valA;
  });

  const handleSort = (key: string) => {
    if (key === sortKey) setAsc(!asc);
    else {
      setSortKey(key);
      setAsc(false);
    }
  };

  return (
    <div className="table-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "12px" }}>
        <h2 style={{ margin: 0 }}>Lag-kombinationer</h2>
        {!currentUserOnly && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span className="muted">Filtrera spelare:</span>
            <select
              value={playerFilter}
              onChange={e => setPlayerFilter(e.target.value)}
              style={{ margin: 0, width: "auto", minWidth: "160px" }}
            >
              <option value="all">Alla spelare</option>
              {sortedProfileNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        )}
      </div>
      <div className="table-scroll">
        <div className="table-scroll-inner">
          <table className="styled-table">
          <thead>
            <tr>
              <th className="sortable" onClick={() => handleSort("players")}>Lag</th>
              <th className="sortable" onClick={() => handleSort("games")}>Matcher</th>
              <th className="sortable" onClick={() => handleSort("wins")}>Vinster</th>
              <th className="sortable" onClick={() => handleSort("winPct")}>Vinst %</th>
              <th className="sortable" onClick={() => handleSort("serveFirstWinPct")}>Vinst % (startade med serve)</th>
              <th className="sortable" onClick={() => handleSort("serveSecondWinPct")}>Vinst % (startade ej med serve)</th>
              <th className="recent-results-column">Senaste 5</th>
              <th className="sortable" onClick={() => handleSort("avgElo")}>Nuvarande snitt-ELO</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.players.join("-")}>
                <td>
                  <span className="team-names">
                    {r.players.map((name, index) => (
                      <span key={`${name}-${index}`} className="team-name">
                        <ProfileName name={name} badgeId={badgeNameMap.get(name) || null} />
                        {index < r.players.length - 1 && (
                          <span className="team-separator"> & </span>
                        )}
                      </span>
                    ))}
                  </span>
                </td>
                <td>{r.games}</td>
                <td>{r.wins}</td>
                <td>{r.winPct}%</td>
                <td>{r.serveFirstWinPct === null ? "-" : `${r.serveFirstWinPct}%`}</td>
                <td>{r.serveSecondWinPct === null ? "-" : `${r.serveSecondWinPct}%`}</td>
                <td className="recent-results-cell">
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
      </div>
    </div>
  );
}
