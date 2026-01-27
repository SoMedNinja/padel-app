import { useState } from "react";
import Avatar from "./Avatar";
import ProfileName from "./ProfileName";
import { getStoredAvatar } from "../utils/avatar";
import { PlayerStats } from "../types";
import {
  Tooltip,
  IconButton,
  Card,
  CardContent,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
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
    const label = first === "W" ? "V" : "F";
    return `${label}${count}`;
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
    <Card variant="outlined" sx={{ borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>ELO-topplista</Typography>
          <Tooltip title="ELO är ett rankingsystem baserat på flertal faktorer - hur stark du är, hur starkt motståndet är, hur lång matchen är, med mera." arrow>
            <IconButton size="small" sx={{ opacity: 0.6 }}>
              <InfoOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3, overflow: 'auto', position: 'relative' }}>
          {showLoadingOverlay && (
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'rgba(255,255,255,0.8)',
                zIndex: 1
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600 }}>laddar data…</Typography>
            </Box>
          )}
          <Table sx={{ minWidth: 650 }}>
            <TableHead sx={{ bgcolor: 'grey.50' }}>
              <TableRow>
                <TableCell onClick={() => toggleSort("name")} sx={{ cursor: 'pointer', fontWeight: 700 }}>Spelare</TableCell>
                <TableCell onClick={() => toggleSort("elo")} sx={{ cursor: 'pointer', fontWeight: 700 }} align="center">ELO</TableCell>
                <TableCell onClick={() => toggleSort("games")} sx={{ cursor: 'pointer', fontWeight: 700 }} align="center">Matcher</TableCell>
                <TableCell onClick={() => toggleSort("wins")} sx={{ cursor: 'pointer', fontWeight: 700 }} align="center">Vinster</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Streak</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Trend</TableCell>
                <TableCell onClick={() => toggleSort("winPct")} sx={{ cursor: 'pointer', fontWeight: 700 }} align="center">Vinst %</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedPlayers.map(p => (
                <TableRow key={p.name} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar
                        sx={{ width: 32, height: 32 }}
                        src={p.avatarUrl || getStoredAvatar(p.id)}
                        name={p.name}
                      />
                      <ProfileName name={p.name} badgeId={p.featuredBadgeId} />
                    </Box>
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>{Math.round(p.elo)}</TableCell>
                  <TableCell align="center">{p.wins + p.losses}</TableCell>
                  <TableCell align="center">{p.wins}</TableCell>
                  <TableCell align="center">{getStreak(p)}</TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" component="span">{getTrendIndicator(p)}</Typography>
                  </TableCell>
                  <TableCell align="center">{winPct(p.wins, p.losses)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
}
