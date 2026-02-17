import { useMemo, useState } from "react";
import Avatar from "./Avatar";
import ProfileName from "./ProfileName";
import RivalryModal from "./RivalryModal";
import { Sparkline } from "./Shared/Sparkline";
import { GUEST_ID } from "../utils/guest";
import { getStoredAvatar } from "../utils/avatar";
import { getStreak } from "../utils/stats";
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
  Skeleton,
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
  const [rivalryOpen, setRivalryOpen] = useState(false);
  const [selectedRival, setSelectedRival] = useState<PlayerStats | null>(null);

  const handlePlayerClick = (p: PlayerStats) => {
    if (!user || p.id === user.id) return;
    setSelectedRival(p);
    setRivalryOpen(true);
  };

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

    // Optimization: If NOT filtered (showing all matches), we can use pre-calculated all-time stats
    // that are already populated in calculateEloWithStats.
    if (!isFiltered) {
      return players.map(player => {
        const history = player.history || [];
        const hLen = history.length;
        const eloHistory: number[] = [];
        // Optimization: fetch last 6 points to show the trend over 5 matches
        const startIdx = Math.max(0, hLen - 6);
        for (let j = startIdx; j < hLen; j++) {
          eloHistory.push(history[j].elo);
        }

        if (player.elo && (eloHistory.length === 0 || eloHistory[eloHistory.length - 1] !== player.elo)) {
          eloHistory.push(player.elo);
        }

        // Determine trend color: Green if current >= start, else Red
        const sparklineColor = (eloHistory.length > 0 && eloHistory[eloHistory.length - 1] >= eloHistory[0])
          ? '#34C759'
          : '#FF3B30';

        return {
          ...player,
          eloHistory,
          sparklineColor,
        };
      });
    }

    // Optimization: Instead of O(P * H) where we scan every player's history,
    // we perform a single O(M) pass over the filtered match list.
    const playerStatsMap = new Map<string, { wins: number; losses: number; recentResults: ("W" | "L")[] }>();

    // We process matches in chronological order to build recentResults correctly.
    // Matches are typically passed in descending order (newest first).
    for (let i = matches.length - 1; i >= 0; i--) {
      const m = matches[i];
      const team1Won = m.team1_sets > m.team2_sets;

      const processTeam = (ids: (string | null)[], won: boolean) => {
        for (const id of ids) {
          if (!id || id === GUEST_ID) continue;
          let s = playerStatsMap.get(id);
          if (!s) {
            s = { wins: 0, losses: 0, recentResults: [] };
            playerStatsMap.set(id, s);
          }
          if (won) s.wins++; else s.losses++;
          s.recentResults.push(won ? "W" : "L");
        }
      };

      processTeam(m.team1_ids, team1Won);
      processTeam(m.team2_ids, !team1Won);
    }

    const finalPlayers: PlayerStats[] = [];
    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      const s = playerStatsMap.get(player.id) || { wins: 0, losses: 0, recentResults: [] };

      // Optimization: use the built-in Swedish parameter to avoid manual string replacements.
      const streak = getStreak(s.recentResults, true);

      // Optimization: avoid redundant mapping and slicing where possible.
      const history = player.history || [];
      const hLen = history.length;
      const eloHistory: number[] = [];
      // Optimization: fetch last 6 points to show the trend over 5 matches
      const startIdx = Math.max(0, hLen - 6);
      for (let j = startIdx; j < hLen; j++) {
        eloHistory.push(history[j].elo);
      }

      if (player.elo && (eloHistory.length === 0 || eloHistory[eloHistory.length - 1] !== player.elo)) {
        eloHistory.push(player.elo);
      }

      // Determine trend color: Green if current >= start, else Red
      const sparklineColor = (eloHistory.length > 0 && eloHistory[eloHistory.length - 1] >= eloHistory[0])
        ? '#34C759'
        : '#FF3B30';

      finalPlayers.push({
        ...player,
        wins: s.wins,
        losses: s.losses,
        games: s.recentResults.length,
        recentResults: s.recentResults.slice(-5),
        streak,
        eloHistory,
        sparklineColor,
      });
    }

    return finalPlayers;
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
          {/* Note for non-coders: we render rows in a grid so the virtual scroll transforms work reliably. */}
          <Table component="div" role="table" sx={{ minWidth: 800, display: 'flex', flexDirection: 'column' }}>
            <TableHead component="div" role="rowgroup" sx={{ bgcolor: 'grey.50', display: 'block', width: '100%', borderBottom: '1px solid', borderColor: 'divider' }}>
              <TableRow
                component="div"
                role="row"
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(220px, 1.8fr) repeat(5, minmax(80px, 1fr))',
                  alignItems: 'center',
                  width: '100%',
                  minHeight: 56,
                }}
              >
                <TableCell component="div" role="columnheader" sortDirection={sortKey === "name" ? (asc ? "asc" : "desc") : false} sx={{ fontWeight: 700, borderBottom: 'none' }}>
                  <TableSortLabel
                    active={sortKey === "name"}
                    direction={sortKey === "name" ? (asc ? "asc" : "desc") : "asc"}
                    onClick={() => toggleSort("name")}
                    aria-label={`Sortera efter spelare, nuvarande ${sortKey === "name" ? (asc ? "stigande" : "fallande") : "osorterad"}`}
                  >
                    Spelare
                  </TableSortLabel>
                </TableCell>
                <TableCell component="div" role="columnheader" sortDirection={sortKey === "elo" ? (asc ? "asc" : "desc") : false} sx={{ fontWeight: 700, textAlign: 'center', borderBottom: 'none' }}>
                  <TableSortLabel
                    active={sortKey === "elo"}
                    direction={sortKey === "elo" ? (asc ? "asc" : "desc") : "asc"}
                    onClick={() => toggleSort("elo")}
                    aria-label={`Sortera efter ELO, nuvarande ${sortKey === "elo" ? (asc ? "stigande" : "fallande") : "osorterad"}`}
                  >
                    ELO
                  </TableSortLabel>
                </TableCell>
                <TableCell component="div" role="columnheader" sortDirection={sortKey === "games" ? (asc ? "asc" : "desc") : false} sx={{ fontWeight: 700, textAlign: 'center', borderBottom: 'none' }}>
                  <TableSortLabel
                    active={sortKey === "games"}
                    direction={sortKey === "games" ? (asc ? "asc" : "desc") : "asc"}
                    onClick={() => toggleSort("games")}
                    aria-label={`Sortera efter matcher, nuvarande ${sortKey === "games" ? (asc ? "stigande" : "fallande") : "osorterad"}`}
                  >
                    Matcher
                  </TableSortLabel>
                </TableCell>
                <TableCell component="div" role="columnheader" sortDirection={sortKey === "wins" ? (asc ? "asc" : "desc") : false} sx={{ fontWeight: 700, textAlign: 'center', borderBottom: 'none' }}>
                  <TableSortLabel
                    active={sortKey === "wins"}
                    direction={sortKey === "wins" ? (asc ? "asc" : "desc") : "asc"}
                    onClick={() => toggleSort("wins")}
                    aria-label={`Sortera efter vinster, nuvarande ${sortKey === "wins" ? (asc ? "stigande" : "fallande") : "osorterad"}`}
                  >
                    Vinster
                  </TableSortLabel>
                </TableCell>
                <TableCell component="div" role="columnheader" sx={{ fontWeight: 700, textAlign: 'center', borderBottom: 'none' }}>
                  <Tooltip title="ELO-kurvan över dina senaste matcher" arrow>
                    <Box
                      component="span"
                      tabIndex={0}
                      sx={{
                        cursor: 'help',
                        borderBottom: '1px dotted',
                        borderColor: 'text.secondary',
                        outline: 'none',
                        '&:focus-visible': {
                          outline: '2px solid',
                          outlineColor: 'primary.main',
                          outlineOffset: '2px',
                          borderRadius: '2px'
                        }
                      }}
                      aria-label="Form: ELO-kurvan över dina senaste matcher. Fokusera för mer info."
                    >
                      Form
                    </Box>
                  </Tooltip>
                </TableCell>
                <TableCell component="div" role="columnheader" sortDirection={sortKey === "winPct" ? (asc ? "asc" : "desc") : false} sx={{ fontWeight: 700, textAlign: 'center', borderBottom: 'none' }}>
                  <TableSortLabel
                    active={sortKey === "winPct"}
                    direction={sortKey === "winPct" ? (asc ? "asc" : "desc") : "asc"}
                    onClick={() => toggleSort("winPct")}
                    aria-label={`Sortera efter vinstprocent, nuvarande ${sortKey === "winPct" ? (asc ? "stigande" : "fallande") : "osorterad"}`}
                  >
                    Vinst %
                  </TableSortLabel>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody component="div" role="rowgroup" sx={{ position: 'relative', height: showLoadingOverlay ? 'auto' : Math.max(totalSize, 100), display: 'block', width: '100%' }}>
              {showLoadingOverlay ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow
                    component="div"
                    role="row"
                    key={i}
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(220px, 1.8fr) repeat(5, minmax(80px, 1fr))',
                      alignItems: 'center',
                      width: '100%',
                      minHeight: 56,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <TableCell component="div" sx={{ borderBottom: 'none' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Skeleton variant="circular" width={32} height={32} />
                        <Skeleton variant="text" width={120} height={24} />
                      </Box>
                    </TableCell>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j} component="div" sx={{ textAlign: 'center', borderBottom: 'none', display: 'flex', justifyContent: 'center' }}>
                        <Skeleton variant="text" width={40} height={24} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                /* Note for non-coders: the table only draws rows you can see to stay fast on big leaderboards. */
                virtualItems.map((virtualItem) => {
                  const p = sortedPlayers[virtualItem.index];
                  if (!p) return null;
                  const isMe = p.id === user?.id;
                  return (
                    <TableRow
                      component="div"
                      role="row"
                      key={p.id || p.name}
                      ref={measureElement(virtualItem.index)}
                      data-index={virtualItem.index}
                      aria-rowindex={virtualItem.index + 1}
                      aria-label={`Rank ${virtualItem.index + 1}: ${p.name}, ELO ${Math.round(p.elo)}, ${p.wins + p.losses} matcher, ${winPct(p.wins, p.losses)}% vinstprocent. ${isMe || !user ? '' : 'Tryck för rivalitet.'}`}
                      tabIndex={isMe || !user ? -1 : 0}
                      onKeyDown={(e) => {
                        if (!isMe && user && (e.key === 'Enter' || e.key === ' ')) {
                          e.preventDefault();
                          handlePlayerClick(p);
                        }
                      }}
                      hover
                      className={isMe || !user ? "" : "interactive-press"}
                      onClick={() => handlePlayerClick(p)}
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        display: 'grid',
                        gridTemplateColumns: 'minmax(220px, 1.8fr) repeat(5, minmax(80px, 1fr))',
                        alignItems: 'center',
                        transform: `translateY(${virtualItem.start}px)`,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        minHeight: 56,
                        bgcolor: isMe ? (theme) => alpha(theme.palette.primary.main, 0.08) : 'transparent',
                        cursor: isMe || !user ? 'default' : 'pointer',
                        '&:hover': {
                          bgcolor: isMe ? (theme) => alpha(theme.palette.primary.main, 0.12) : undefined
                        },
                        '&:focus-visible': {
                          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
                          outline: 'none',
                          boxShadow: (theme) => `inset 0 0 0 2px ${theme.palette.primary.main}`
                        }
                      }}
                    >
                      <TableCell component="div" role="cell" sx={{ borderBottom: 'none' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar
                            sx={{ width: 32, height: 32 }}
                            src={p.avatarUrl || getStoredAvatar(p.id)}
                            name={p.name}
                          />
                          <ProfileName name={p.name} badgeId={p.featuredBadgeId} />
                        </Box>
                      </TableCell>
                      <TableCell component="div" role="cell" sx={{ textAlign: 'center', fontWeight: 700, borderBottom: 'none' }}>{Math.round(p.elo)}</TableCell>
                      <TableCell component="div" role="cell" sx={{ textAlign: 'center', borderBottom: 'none' }}>{p.wins + p.losses}</TableCell>
                      <TableCell component="div" role="cell" sx={{ textAlign: 'center', borderBottom: 'none' }}>{p.wins}</TableCell>
                      <TableCell component="div" role="cell" sx={{ textAlign: 'center', borderBottom: 'none' }}>
                        <Sparkline
                          data={p.eloHistory || []}
                          color={(p as any).sparklineColor}
                        />
                      </TableCell>
                      <TableCell component="div" role="cell" sx={{ textAlign: 'center', borderBottom: 'none' }}>{winPct(p.wins, p.losses)}%</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {selectedRival && (
          <RivalryModal
            open={rivalryOpen}
            onClose={() => setRivalryOpen(false)}
            currentUser={user}
            selectedPlayer={selectedRival}
            matches={matches}
          />
        )}
      </CardContent>
    </Card>
  );
}
