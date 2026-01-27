import { useMemo, useState } from "react";
import Avatar from "./Avatar";
import ProfileName from "./ProfileName";
import { getStoredAvatar } from "../utils/avatar";
import { Match, PlayerStats, Profile } from "../types";
import { useVirtualWindow } from "../hooks/useVirtualWindow";
import { calculateElo } from "../utils/elo";
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
  matches?: Match[];
  profiles?: Profile[];
}

export default function EloLeaderboard({ players = [], matches = [], profiles = [] }: EloLeaderboardProps) {
  const [sortKey, setSortKey] = useState<string>("elo");
  const [asc, setAsc] = useState<boolean>(false);

  const filteredPlayers = useMemo(() => {
    if (!matches.length || !profiles.length) return [];
    // Note for non-coders: this recalculates win/loss stats for the current filter only.
    return calculateElo(matches, profiles);
  }, [matches, profiles]);

  const filteredStatsById = useMemo(() => {
    return new Map(filteredPlayers.map(player => [player.id, player]));
  }, [filteredPlayers]);

  const mergedPlayers = useMemo(() => {
    return players.map(player => {
      const filtered = filteredStatsById.get(player.id);
      return {
        ...player,
        // Note for non-coders: keep the all-time ELO, but swap in filtered wins/losses.
        wins: filtered?.wins ?? 0,
        losses: filtered?.losses ?? 0,
        games: filtered?.games ?? 0,
        recentResults: filtered?.recentResults ?? [],
      };
    });
  }, [players, filteredStatsById]);

  const hasUnknownPlayers = mergedPlayers.some(player => !player.name || player.name === "Okänd");
  const showLoadingOverlay = !mergedPlayers.length || hasUnknownPlayers;

  const visiblePlayers = mergedPlayers.filter(p => p.name && p.name !== "Gäst" && p.name !== "Okänd");

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

  const { parentRef, totalSize, virtualItems, measureElement } = useVirtualWindow({
    itemCount: sortedPlayers.length,
    estimateSize: 56,
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

        <TableContainer
          ref={parentRef}
          component={Paper}
          variant="outlined"
          sx={{ borderRadius: 3, overflow: 'auto', position: 'relative', maxHeight: 480 }}
        >
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
          {/* Note for non-coders: we render rows in a grid so the virtual scroll transforms work reliably. */}
          <Table component="div" sx={{ minWidth: 650 }}>
            <TableHead component="div" sx={{ bgcolor: 'grey.50' }}>
              <TableRow
                component="div"
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(220px, 1.6fr) repeat(6, minmax(80px, 1fr))',
                  alignItems: 'center',
                }}
              >
                <TableCell component="div" onClick={() => toggleSort("name")} sx={{ cursor: 'pointer', fontWeight: 700 }}>Spelare</TableCell>
                <TableCell component="div" onClick={() => toggleSort("elo")} sx={{ cursor: 'pointer', fontWeight: 700, textAlign: 'center' }}>ELO</TableCell>
                <TableCell component="div" onClick={() => toggleSort("games")} sx={{ cursor: 'pointer', fontWeight: 700, textAlign: 'center' }}>Matcher</TableCell>
                <TableCell component="div" onClick={() => toggleSort("wins")} sx={{ cursor: 'pointer', fontWeight: 700, textAlign: 'center' }}>Vinster</TableCell>
                <TableCell component="div" sx={{ fontWeight: 700, textAlign: 'center' }}>Streak</TableCell>
                <TableCell component="div" sx={{ fontWeight: 700, textAlign: 'center' }}>Trend</TableCell>
                <TableCell component="div" onClick={() => toggleSort("winPct")} sx={{ cursor: 'pointer', fontWeight: 700, textAlign: 'center' }}>Vinst %</TableCell>
              </TableRow>
            </TableHead>
            <TableBody component="div" sx={{ position: 'relative', height: totalSize }}>
              {/* Note for non-coders: the table only draws rows you can see to stay fast on big leaderboards. */}
              {virtualItems.map((virtualItem) => {
                const p = sortedPlayers[virtualItem.index];
                return (
                  <TableRow
                    component="div"
                    key={p.name}
                    ref={measureElement(virtualItem.index)}
                    data-index={virtualItem.index}
                    hover
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      display: 'grid',
                      gridTemplateColumns: 'minmax(220px, 1.6fr) repeat(6, minmax(80px, 1fr))',
                      alignItems: 'center',
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                  >
                    <TableCell component="div">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar
                          sx={{ width: 32, height: 32 }}
                          src={p.avatarUrl || getStoredAvatar(p.id)}
                          name={p.name}
                        />
                        <ProfileName name={p.name} badgeId={p.featuredBadgeId} />
                      </Box>
                    </TableCell>
                    <TableCell component="div" sx={{ textAlign: 'center', fontWeight: 700 }}>{Math.round(p.elo)}</TableCell>
                    <TableCell component="div" sx={{ textAlign: 'center' }}>{p.wins + p.losses}</TableCell>
                    <TableCell component="div" sx={{ textAlign: 'center' }}>{p.wins}</TableCell>
                    <TableCell component="div" sx={{ textAlign: 'center' }}>{getStreak(p)}</TableCell>
                    <TableCell component="div" sx={{ textAlign: 'center' }}>
                      <Typography variant="body2" component="span">{getTrendIndicator(p)}</Typography>
                    </TableCell>
                    <TableCell component="div" sx={{ textAlign: 'center' }}>{winPct(p.wins, p.losses)}%</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
}
