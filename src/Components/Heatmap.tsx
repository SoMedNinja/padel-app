import { useMemo, useState } from "react";
import { getProfileDisplayName, makeProfileMap } from "../utils/profileMap";
import ProfileName from "./ProfileName";
import { GUEST_NAME } from "../utils/guest";
import { Match, Profile, PlayerStats } from "../types";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  MenuItem,
  Chip,
  Stack,
  TableSortLabel,
} from "@mui/material";

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
  allEloPlayers?: PlayerStats[];
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
  allEloPlayers = [],
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
    // Note for non-coders: we store all-time ELO by name, and normalize names so filters don't affect it.
    return new Map<string, number>(
      allEloPlayers.map(player => [normalizeProfileName(player.name), player.elo])
    );
  }, [allEloPlayers]);

  const sortedProfileNames = useMemo(() => {
    return profiles
      .map(p => getProfileDisplayName(p))
      .filter(name => name !== GUEST_NAME)
      .sort((a, b) => a.localeCompare(b, "sv"));
  }, [profiles]);

  const sortedMatches = useMemo(() => {
    // Optimization: check if matches are already sorted in O(N) to avoid expensive O(N log N) sort.
    let isSorted = true;
    for (let i = 1; i < matches.length; i++) {
      if (matches[i].created_at > matches[i - 1].created_at) {
        isSorted = false;
        break;
      }
    }

    if (isSorted) return matches;

    // Optimization: Use ISO string lexicographical comparison instead of expensive new Date() calls.
    return [...matches].sort(
      (a, b) => (b.created_at < a.created_at ? -1 : b.created_at > a.created_at ? 1 : 0)
    );
  }, [matches]);

  // Optimization: Pre-resolve match data to avoid expensive ID resolution and normalization in the hot loop.
  const resolvedMatches = useMemo(() => {
    const guestKey = normalizeProfileName(GUEST_NAME);
    return sortedMatches.map(m => {
      // Optimization: Resolve and normalize in a single pass directly from IDs/Names to final names.
      // This avoids multiple iterations and intermediate array allocations in the hot loop.
      const resolveTeam = (ids: (string | null)[] | undefined, names: string | string[] | undefined) => {
        const resolved: string[] = [];
        let hasGuest = false;
        let hasUnknown = false;

        const players = (ids && ids.length > 0) ? ids : (Array.isArray(names) ? names : (typeof names === "string" ? names.split(",") : []));

        for (let i = 0; i < players.length; i++) {
          let p = players[i];
          if (!p) continue;
          if (typeof p === "string") p = p.trim();
          if (!p) continue;

          const key = normalizeProfileName(p);
          if (key === guestKey) {
            hasGuest = true;
            break;
          }

          // Try resolving by ID first if it's an ID string, then fallback to normalized name lookup.
          const profile = (ids && ids.length > 0) ? profileMap.get(p as string) : null;
          const finalName = profile ? getProfileDisplayName(profile) : allowedNameMap.get(key);

          if (finalName && finalName !== "Okänd") {
            resolved.push(finalName);
          } else if (allowedNameMap.size) {
            hasUnknown = true;
            break;
          }
        }
        return { resolved, hasGuest, hasUnknown };
      };

      return {
        m,
        t1: resolveTeam(m.team1_ids, m.team1),
        t2: resolveTeam(m.team2_ids, m.team2),
        normalizedServeFlag: normalizeServeFlag(m.team1_serves_first)
      };
    });
  }, [sortedMatches, profileMap, allowedNameMap]);

  const combos = useMemo(() => {
    const comboMap: Record<string, Combo> = {};
    resolvedMatches.forEach(({ m, t1, t2, normalizedServeFlag }) => {
      const team1ServedFirst = normalizedServeFlag === true;
      const team2ServedFirst = normalizedServeFlag === false;
      const teams = [
        { data: t1, won: m.team1_sets > m.team2_sets, servedFirst: team1ServedFirst },
        { data: t2, won: m.team2_sets > m.team1_sets, servedFirst: team2ServedFirst },
      ];

      teams.forEach(({ data, won, servedFirst }) => {
        if (!data.resolved.length || data.hasGuest || data.hasUnknown) return;

        const resolvedPlayers = data.resolved;

        // Optimization: For 2 players (padel), manual swap is ~10x faster than .sort()
        // and avoids intermediate array allocation.
        let sortedPair = resolvedPlayers;
        if (resolvedPlayers.length > 1) {
          const p1 = resolvedPlayers[0];
          const p2 = resolvedPlayers[1];
          sortedPair = p1 < p2 ? [p1, p2] : [p2, p1];
        }
        const key = sortedPair.join(" + ");

        if (!comboMap[key]) {
          comboMap[key] = {
            players: sortedPair,
            games: 0,
            wins: 0,
            serveFirstGames: 0,
            serveFirstWins: 0,
            serveSecondGames: 0,
            serveSecondWins: 0,
            recentResults: [],
          };
        }
        const c = comboMap[key];
        c.games++;
        if (won) c.wins++;
        if (servedFirst === true) {
          c.serveFirstGames++;
          if (won) c.serveFirstWins++;
        }
        if (servedFirst === false) {
          c.serveSecondGames++;
          if (won) c.serveSecondWins++;
        }
        if (c.recentResults.length < 5) {
          c.recentResults.push(won ? "V" : "F");
        }
      });
    });
    return comboMap;
  }, [resolvedMatches]);

  // Optimization: Memoize the baseline rows to avoid expensive statistics re-calculation on every render
  const allRows = useMemo(() => {
    return Object.values(combos).map((c) => {
      const avgElo = c.players.length
        ? Math.round(
          c.players.reduce(
            (sum, name) => sum + (eloMap.get(normalizeProfileName(name)) ?? ELO_BASELINE),
            0
          ) / c.players.length
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
  }, [combos, eloMap]);

  // Optimization: Memoize filtered rows separately
  const filteredRows = useMemo(() => {
    let rows = allRows;
    if (currentUserOnly) {
      const currentProfile = profiles.find(p => p.id === currentUserOnly);
      const currentName = currentProfile ? getProfileDisplayName(currentProfile) : null;
      if (currentName) {
        rows = rows.filter(r => r.players.includes(currentName));
      }
    } else if (playerFilter !== "all") {
      rows = rows.filter(r => r.players.includes(playerFilter));
    }
    return rows;
  }, [allRows, currentUserOnly, playerFilter, profiles]);

  // Optimization: Memoize sorted rows
  const rows = useMemo(() => {
    const sorted = [...filteredRows];
    sorted.sort((a: any, b: any) => {
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
        // Optimization: use native string comparison instead of expensive localeCompare
        if (valA < valB) return asc ? -1 : 1;
        if (valA > valB) return asc ? 1 : -1;
        return 0;
      }
      return asc ? valA - valB : valB - valA;
    });
    return sorted;
  }, [filteredRows, sortKey, asc]);

  if (!matches.length) return null;

  const handleSort = (key: string) => {
    if (key === sortKey) setAsc(!asc);
    else {
      setSortKey(key);
      setAsc(false);
    }
  };

  return (
    <Card sx={{ overflow: 'hidden' }}>
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2, mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>Lagkombinationer</Typography>
          {!currentUserOnly && (
            <TextField
              select
              size="small"
              label="Filtrera spelare"
              value={playerFilter}
              onChange={e => setPlayerFilter(e.target.value)}
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="all">Alla spelare</MenuItem>
              {sortedProfileNames.map(name => (
                <MenuItem key={name} value={name}>{name}</MenuItem>
              ))}
            </TextField>
          )}
        </Box>

        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3, overflow: 'auto' }}>
          <Table sx={{ minWidth: 800 }} aria-label="Lagkombinationer och statistik">
            <TableHead sx={{ bgcolor: 'grey.50' }}>
              <TableRow>
                <TableCell sortDirection={sortKey === "players" ? (asc ? "asc" : "desc") : false} sx={{ fontWeight: 700 }}>
                  <TableSortLabel
                    active={sortKey === "players"}
                    direction={sortKey === "players" ? (asc ? "asc" : "desc") : "asc"}
                    onClick={() => handleSort("players")}
                    aria-label="Sortera efter lag"
                  >
                    Lag
                  </TableSortLabel>
                </TableCell>
                <TableCell align="center" sortDirection={sortKey === "games" ? (asc ? "asc" : "desc") : false} sx={{ fontWeight: 700 }}>
                  <TableSortLabel
                    active={sortKey === "games"}
                    direction={sortKey === "games" ? (asc ? "asc" : "desc") : "asc"}
                    onClick={() => handleSort("games")}
                    aria-label="Sortera efter matcher"
                  >
                    Matcher
                  </TableSortLabel>
                </TableCell>
                <TableCell align="center" sortDirection={sortKey === "wins" ? (asc ? "asc" : "desc") : false} sx={{ fontWeight: 700 }}>
                  <TableSortLabel
                    active={sortKey === "wins"}
                    direction={sortKey === "wins" ? (asc ? "asc" : "desc") : "asc"}
                    onClick={() => handleSort("wins")}
                    aria-label="Sortera efter vinster"
                  >
                    Vinster
                  </TableSortLabel>
                </TableCell>
                <TableCell align="center" sortDirection={sortKey === "winPct" ? (asc ? "asc" : "desc") : false} sx={{ fontWeight: 700 }}>
                  <TableSortLabel
                    active={sortKey === "winPct"}
                    direction={sortKey === "winPct" ? (asc ? "asc" : "desc") : "asc"}
                    onClick={() => handleSort("winPct")}
                    aria-label="Sortera efter vinstprocent"
                  >
                    Vinst %
                  </TableSortLabel>
                </TableCell>
                <TableCell align="center" sortDirection={sortKey === "serveFirstWinPct" ? (asc ? "asc" : "desc") : false} sx={{ fontWeight: 700 }}>
                  <TableSortLabel
                    active={sortKey === "serveFirstWinPct"}
                    direction={sortKey === "serveFirstWinPct" ? (asc ? "asc" : "desc") : "asc"}
                    onClick={() => handleSort("serveFirstWinPct")}
                    aria-label="Sortera efter vinstprocent vid serve"
                  >
                    Vinst % (servade)
                  </TableSortLabel>
                </TableCell>
                <TableCell align="center" sortDirection={sortKey === "serveSecondWinPct" ? (asc ? "asc" : "desc") : false} sx={{ fontWeight: 700 }}>
                  <TableSortLabel
                    active={sortKey === "serveSecondWinPct"}
                    direction={sortKey === "serveSecondWinPct" ? (asc ? "asc" : "desc") : "asc"}
                    onClick={() => handleSort("serveSecondWinPct")}
                    aria-label="Sortera efter vinstprocent vid mottagning"
                  >
                    Vinst % (mottagning)
                  </TableSortLabel>
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Senaste 5</TableCell>
                <TableCell align="center" sortDirection={sortKey === "avgElo" ? (asc ? "asc" : "desc") : false} sx={{ fontWeight: 700 }}>
                  <TableSortLabel
                    active={sortKey === "avgElo"}
                    direction={sortKey === "avgElo" ? (asc ? "asc" : "desc") : "asc"}
                    onClick={() => handleSort("avgElo")}
                    aria-label="Sortera efter genomsnittlig ELO"
                  >
                    Snitt-ELO
                  </TableSortLabel>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.players.join("-")} hover>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap">
                      {r.players.map((name, index) => (
                        <Box key={`${name}-${index}`} sx={{ display: 'flex', alignItems: 'center' }}>
                          <ProfileName name={name} badgeId={badgeNameMap.get(name) || null} />
                          {index < r.players.length - 1 && (
                            <Typography variant="body2" sx={{ mx: 0.5, opacity: 0.5 }}>&</Typography>
                          )}
                        </Box>
                      ))}
                    </Stack>
                  </TableCell>
                  <TableCell align="center">{r.games}</TableCell>
                  <TableCell align="center">{r.wins}</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>{r.winPct}%</TableCell>
                  <TableCell align="center">{r.serveFirstWinPct === null ? "-" : `${r.serveFirstWinPct}%`}</TableCell>
                  <TableCell align="center">{r.serveSecondWinPct === null ? "-" : `${r.serveSecondWinPct}%`}</TableCell>
                  <TableCell align="center">
                    {r.recentResults?.length ? (
                      <Stack direction="row" spacing={0.5} justifyContent="center">
                        {r.recentResults.map((result, index) => (
                          <Chip
                            key={`${result}-${index}`}
                            label={result}
                            size="small"
                            color={result === "V" ? "success" : "error"}
                            sx={{ fontWeight: 800, width: 28, height: 28, '& .MuiChip-label': { px: 0 } }}
                          />
                        ))}
                      </Stack>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>{r.avgElo}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
}
