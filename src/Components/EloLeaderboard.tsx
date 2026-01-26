import { useState } from "react";
import Avatar from "./Avatar";
import ProfileName from "./ProfileName";
import { getStoredAvatar } from "../utils/avatar";
import { PlayerStats } from "../types";
import { Tooltip, IconButton } from "@mui/material";
import { InfoOutlined } from "@mui/icons-material";

// Enkel hjälpfunktion för vinstprocent
const winPct = (wins: number, losses: number) =>
  wins + losses === 0 ? 0 : Math.round((wins / (wins + losses)) * 100);

interface EloLeaderboardProps {
  players?: PlayerStats[];
}

export default function EloLeaderboard({ players = [] }: EloLeaderboardProps) {
  const [sortKey, setSortKey] = useState<string>("elo");
  const [asc, setAsc] = useState<boolean>(false);

  const hasUnknownPlayers = players.some(player => !player.name || player.name === "Okänd");
  const showLoadingOverlay = !players.length || hasUnknownPlayers;

  // Ta bort Gäst tidigt
  const visiblePlayers = players.filter(p => p.name && p.name !== "Gäst" && p.name !== "Okänd");

  const sortedPlayers = [...visiblePlayers].sort((a, b) => {
    if (sortKey === "name") {
      const aVal = a.name.toLowerCase();
      const bVal = b.name.toLowerCase();
      return asc ? aVal.localeCompare(bVal, "sv") : bVal.localeCompare(aVal, "sv");
    }

    let valA: number, valB: number;

    switch (sortKey) {
      case "games":
        valA = a.wins + a.losses;
        valB = b.wins + b.losses;
        break;
      case "winPct":
        valA = a.wins / (a.wins + a.losses || 1);
        valB = b.wins / (b.wins + b.losses || 1);
        break;
      case "wins":
        valA = a.wins;
        valB = b.wins;
        break;
      case "elo":
      default:
        valA = a.elo;
        valB = b.elo;
        break;
    }

    return asc ? valA - valB : valB - valA;
  });

  const toggleSort = (key: string) => {
    if (key === sortKey) setAsc(!asc);
    else {
      setSortKey(key);
      setAsc(false);
    }
  };

  const getStreak = (player: PlayerStats) => {
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

  const getTrendIndicator = (player: PlayerStats) => {
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
        <h2 style={{ margin: 0 }}>ELO Leaderboard</h2>
        <Tooltip title="ELO är ett rankingsystem baserat på flertal faktorer - hur stark du är, hur stark motståndet är, hur lång matchen är, med mer." arrow>
          <IconButton size="small" sx={{ opacity: 0.6 }}>
            <InfoOutlined fontSize="small" />
          </IconButton>
        </Tooltip>
      </div>
      <div className="table-scroll">
        {showLoadingOverlay && (
          <div className="table-loading-overlay" role="status" aria-live="polite">
            laddar data…
          </div>
        )}
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
                    <ProfileName name={p.name} badgeId={p.featuredBadgeId} />
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
