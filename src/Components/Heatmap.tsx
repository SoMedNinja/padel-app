import { useMemo, useState } from "react";
import { getProfileDisplayName, makeProfileMap, resolveTeamNames } from "../utils/profileMap";
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
    <Card variant="outlined" sx={{ borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
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
          <Table sx={{ minWidth: 800 }}>
            <TableHead sx={{ bgcolor: 'grey.50' }}>
              <TableRow>
                <TableCell onClick={() => handleSort("players")} sx={{ cursor: 'pointer', fontWeight: 700 }}>Lag</TableCell>
                <TableCell onClick={() => handleSort("games")} sx={{ cursor: 'pointer', fontWeight: 700 }} align="center">Matcher</TableCell>
                <TableCell onClick={() => handleSort("wins")} sx={{ cursor: 'pointer', fontWeight: 700 }} align="center">Vinster</TableCell>
                <TableCell onClick={() => handleSort("winPct")} sx={{ cursor: 'pointer', fontWeight: 700 }} align="center">Vinst %</TableCell>
                <TableCell onClick={() => handleSort("serveFirstWinPct")} sx={{ cursor: 'pointer', fontWeight: 700 }} align="center">Vinst % (servade)</TableCell>
                <TableCell onClick={() => handleSort("serveSecondWinPct")} sx={{ cursor: 'pointer', fontWeight: 700 }} align="center">Vinst % (mottagning)</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Senaste 5</TableCell>
                <TableCell onClick={() => handleSort("avgElo")} sx={{ cursor: 'pointer', fontWeight: 700 }} align="center">Snitt-ELO</TableCell>
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
