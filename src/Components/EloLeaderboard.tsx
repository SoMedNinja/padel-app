import { useMemo, useState } from "react";
import Avatar from "./Avatar";
import ProfileName from "./ProfileName";
import { getStoredAvatar } from "../utils/avatar";
import { getStreak, getTrendIndicator } from "../utils/stats";
import { Match, PlayerStats } from "../types";
import { useVirtualWindow } from "../hooks/useVirtualWindow";
import { useStore } from "../store/useStore";
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
  TableSortLabel,
  CircularProgress,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { InfoOutlined } from "@mui/icons-material";

// Enkel hjälpfunktion för vinstprocent
const winPct = (wins: number, losses: number) =>
  wins + losses === 0 ? 0 : Math.round((wins / (wins + losses)) * 100);

interface EloLeaderboardProps {
  players?: PlayerStats[];
  matches?: Match[];
  isFiltered?: boolean;
}

export default function EloLeaderboard({ players = [], matches = [], isFiltered = false }: EloLeaderboardProps) {
  const { user } = useStore();
  const [sortKey, setSortKey] = useState<string>("elo");
  const [asc, setAsc] = useState<boolean>(false);

  const mergedPlayers = useMemo(() => {
    if (!players.length) return [];

    // If no matches, return players with zeroed win/loss stats
    if (!matches.length) {
      return players.map(p => ({
        ...p,
        wins: 0,
        losses: 0,
        games: 0,
        recentResults: [],
        streak: "—",
        trend: "—",
      }));
    }

    // Optimization: If NOT filtered (showing all matches), we can skip the O(P * H) loop
    // as player.wins/losses/recentResults already contain the correct all-time stats.
    if (!isFiltered) {
      return players.map(player => ({
        ...player,
        streak: getStreak(player.recentResults).replace("W", "V").replace("L", "F"),
        trend: getTrendIndicator(player.recentResults),
      }));
    }

    // Optimization: avoid intermediate array and perform single pass for stats
    const matchIds = new Set<string>();
    for (const m of matches) {
      matchIds.add(m.id);
    }

    return players.map(player => {
      // Optimization: calculate all stats in a single pass over history
      let wins = 0;
      let losses = 0;
      const recentResults: ("W" | "L")[] = [];

      for (let i = 0; i < player.history.length; i++) {
        const h = player.history[i];
        if (matchIds.has(h.matchId)) {
          if (h.result === "W") wins++;
          else losses++;
          recentResults.push(h.result);
        }
      }

      // Optimization: Pre-calculate streak and trend once per data change
      // instead of on every render of every visible virtual row.
      const streakRaw = getStreak(recentResults);
      const streak = streakRaw.replace("W", "V").replace("L", "F");
      const trend = getTrendIndicator(recentResults);

      return {
        ...player,
        wins,
        losses,
        games: recentResults.length,
        recentResults,
        streak,
        trend,
      };
    });
  }, [matches, players, isFiltered]);

  const hasUnknownPlayers = useMemo(() => mergedPlayers.some(player => !player.name || player.name === "Okänd"), [mergedPlayers]);
  const showLoadingOverlay = !mergedPlayers.length || hasUnknownPlayers;

  const visiblePlayers = useMemo(() => mergedPlayers.filter(p => p.name && p.name !== "Gäst" && p.name !== "Okänd"), [mergedPlayers]);

  const sortedPlayers = useMemo(() => [...visiblePlayers].sort((a, b) => {
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
  }), [visiblePlayers, sortKey, asc]);

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

  return (
    <Card variant="outlined" sx={{ borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>ELO-topplista</Typography>
          <Tooltip title="ELO är ett rankingsystem baserat på flertal faktorer - hur stark du är, hur starkt motståndet är, hur lång matchen är, med mera." arrow>
            <IconButton
              size="small"
              sx={{ opacity: 0.6 }}
              aria-label="Information om ELO-ranking"
            >
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
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                bgcolor: 'rgba(255,255,255,0.8)',
                zIndex: 1
              }}
            >
              <CircularProgress size={24} />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>Laddar data…</Typography>
            </Box>
          )}
          {/* Note for non-coders: we render rows in a grid so the virtual scroll transforms work reliably. */}
          <Table component="div" sx={{ minWidth: 800, display: 'flex', flexDirection: 'column' }}>
            <TableHead component="div" sx={{ bgcolor: 'grey.50', display: 'block', width: '100%', borderBottom: '1px solid', borderColor: 'divider' }}>
              <TableRow
                component="div"
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(220px, 1.8fr) repeat(6, minmax(80px, 1fr))',
                  alignItems: 'center',
                  width: '100%',
                  minHeight: 56,
                }}
              >
                <TableCell component="div" sortDirection={sortKey === "name" ? (asc ? "asc" : "desc") : false} sx={{ fontWeight: 700, borderBottom: 'none' }}>
                  <TableSortLabel active={sortKey === "name"} direction={sortKey === "name" ? (asc ? "asc" : "desc") : "asc"} onClick={() => toggleSort("name")}>Spelare</TableSortLabel>
                </TableCell>
                <TableCell component="div" sortDirection={sortKey === "elo" ? (asc ? "asc" : "desc") : false} sx={{ fontWeight: 700, textAlign: 'center', borderBottom: 'none' }}>
                  <TableSortLabel active={sortKey === "elo"} direction={sortKey === "elo" ? (asc ? "asc" : "desc") : "asc"} onClick={() => toggleSort("elo")}>ELO</TableSortLabel>
                </TableCell>
                <TableCell component="div" sortDirection={sortKey === "games" ? (asc ? "asc" : "desc") : false} sx={{ fontWeight: 700, textAlign: 'center', borderBottom: 'none' }}>
                  <TableSortLabel active={sortKey === "games"} direction={sortKey === "games" ? (asc ? "asc" : "desc") : "asc"} onClick={() => toggleSort("games")}>Matcher</TableSortLabel>
                </TableCell>
                <TableCell component="div" sortDirection={sortKey === "wins" ? (asc ? "asc" : "desc") : false} sx={{ fontWeight: 700, textAlign: 'center', borderBottom: 'none' }}>
                  <TableSortLabel active={sortKey === "wins"} direction={sortKey === "wins" ? (asc ? "asc" : "desc") : "asc"} onClick={() => toggleSort("wins")}>Vinster</TableSortLabel>
                </TableCell>
                <TableCell component="div" sx={{ fontWeight: 700, textAlign: 'center', borderBottom: 'none' }}>
                  <Tooltip title="Antal vinster (V) eller förluster (F) i rad" arrow>
                    <Box component="span" sx={{ cursor: 'help' }}>Streak</Box>
                  </Tooltip>
                </TableCell>
                <TableCell component="div" sx={{ fontWeight: 700, textAlign: 'center', borderBottom: 'none' }}>
                  <Tooltip title="Form baserat på de senaste 5 matcherna" arrow>
                    <Box component="span" sx={{ cursor: 'help' }}>Trend</Box>
                  </Tooltip>
                </TableCell>
                <TableCell component="div" sortDirection={sortKey === "winPct" ? (asc ? "asc" : "desc") : false} sx={{ fontWeight: 700, textAlign: 'center', borderBottom: 'none' }}>
                  <TableSortLabel active={sortKey === "winPct"} direction={sortKey === "winPct" ? (asc ? "asc" : "desc") : "asc"} onClick={() => toggleSort("winPct")}>Vinst %</TableSortLabel>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody component="div" sx={{ position: 'relative', height: Math.max(totalSize, 100), display: 'block', width: '100%' }}>
              {/* Note for non-coders: the table only draws rows you can see to stay fast on big leaderboards. */}
              {virtualItems.map((virtualItem) => {
                const p = sortedPlayers[virtualItem.index];
                if (!p) return null;
                return (
                  <TableRow
                    component="div"
                    key={p.id || p.name}
                    ref={measureElement(virtualItem.index)}
                    data-index={virtualItem.index}
                    aria-rowindex={virtualItem.index + 1}
                    hover
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      display: 'grid',
                      gridTemplateColumns: 'minmax(220px, 1.8fr) repeat(6, minmax(80px, 1fr))',
                      alignItems: 'center',
                      transform: `translateY(${virtualItem.start}px)`,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      minHeight: 56,
                      bgcolor: p.id === user?.id ? (theme) => alpha(theme.palette.primary.main, 0.08) : 'transparent',
                    }}
                  >
                    <TableCell component="div" sx={{ borderBottom: 'none' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar
                          sx={{ width: 32, height: 32 }}
                          src={p.avatarUrl || getStoredAvatar(p.id)}
                          name={p.name}
                        />
                        <ProfileName name={p.name} badgeId={p.featuredBadgeId} />
                      </Box>
                    </TableCell>
                    <TableCell component="div" sx={{ textAlign: 'center', fontWeight: 700, borderBottom: 'none' }}>{Math.round(p.elo)}</TableCell>
                    <TableCell component="div" sx={{ textAlign: 'center', borderBottom: 'none' }}>{p.wins + p.losses}</TableCell>
                    <TableCell component="div" sx={{ textAlign: 'center', borderBottom: 'none' }}>{p.wins}</TableCell>
                    <TableCell component="div" sx={{ textAlign: 'center', borderBottom: 'none' }}>{(p as any).streak || "—"}</TableCell>
                    <TableCell component="div" sx={{ textAlign: 'center', borderBottom: 'none' }}>
                      <Typography variant="body2" component="span">{(p as any).trend || "—"}</Typography>
                    </TableCell>
                    <TableCell component="div" sx={{ textAlign: 'center', borderBottom: 'none' }}>{winPct(p.wins, p.losses)}%</TableCell>
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
