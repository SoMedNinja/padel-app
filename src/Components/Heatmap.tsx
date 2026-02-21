import { useMemo, useState } from "react";
import { getProfileDisplayName, makeProfileMap } from "../utils/profileMap";
import { useResolvedMatches } from "../hooks/useResolvedMatches";
import { GUEST_NAME } from "../utils/guest";
import { Match, Profile } from "../types";
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
} from "@mui/material";

type Metric = "matches" | "winPct";

interface HeatmapProps {
  matches?: Match[];
  profiles?: Profile[];
}

interface PairStat {
  matches: number;
  wins: number;
}

const LOW_COLOR = { r: 255, g: 235, b: 238 }; // light red
const MID_COLOR = { r: 255, g: 249, b: 196 }; // soft yellow
const HIGH_COLOR = { r: 232, g: 245, b: 233 }; // light green

const mix = (start: number, end: number, amount: number) => Math.round(start + (end - start) * amount);

const interpolateColor = (ratio: number) => {
  const clamped = Math.max(0, Math.min(1, ratio));

  if (clamped <= 0.5) {
    const local = clamped / 0.5;
    return `rgb(${mix(LOW_COLOR.r, MID_COLOR.r, local)}, ${mix(LOW_COLOR.g, MID_COLOR.g, local)}, ${mix(LOW_COLOR.b, MID_COLOR.b, local)})`;
  }

  const local = (clamped - 0.5) / 0.5;
  return `rgb(${mix(MID_COLOR.r, HIGH_COLOR.r, local)}, ${mix(MID_COLOR.g, HIGH_COLOR.g, local)}, ${mix(MID_COLOR.b, HIGH_COLOR.b, local)})`;
};

export default function Heatmap({ matches = [], profiles = [] }: HeatmapProps) {
  const [metric, setMetric] = useState<Metric>("matches");

  const profileMap = useMemo(() => makeProfileMap(profiles), [profiles]);

  const sortedPlayerNames = useMemo(() => {
    return profiles
      .map((profile) => getProfileDisplayName(profile))
      .filter((name) => name !== GUEST_NAME)
      .sort((a, b) => a.localeCompare(b, "sv"));
  }, [profiles]);

  const validPlayers = useMemo(() => new Set(sortedPlayerNames), [sortedPlayerNames]);
  const resolvedMatches = useResolvedMatches(matches, profiles, profileMap);

  const pairStats = useMemo(() => {
    const stats = new Map<string, PairStat>();

    // Note for non-coders: each matrix cell represents how two players perform together in the same team.
    resolvedMatches.forEach(({ m, t1, t2 }) => {
      const teams = [
        { data: t1, won: m.team1_sets > m.team2_sets },
        { data: t2, won: m.team2_sets > m.team1_sets },
      ];

      teams.forEach(({ data, won }) => {
        if (!data.resolved.length || data.hasGuest || data.hasUnknown) return;

        const teamNames = data.resolved
          .filter((name) => validPlayers.has(name))
          .sort((a, b) => a.localeCompare(b, "sv"));

        for (let i = 0; i < teamNames.length; i++) {
          for (let j = i + 1; j < teamNames.length; j++) {
            const first = teamNames[i];
            const second = teamNames[j];
            const key = `${first}|${second}`;
            const current = stats.get(key) ?? { matches: 0, wins: 0 };
            current.matches += 1;
            if (won) current.wins += 1;
            stats.set(key, current);
          }
        }
      });
    });

    return stats;
  }, [resolvedMatches, validPlayers]);

  const matrix = useMemo(() => {
    return sortedPlayerNames.map((rowName) =>
      sortedPlayerNames.map((colName) => {
        if (rowName === colName) return null;
        const [first, second] = [rowName, colName].sort((a, b) => a.localeCompare(b, "sv"));
        const stat = pairStats.get(`${first}|${second}`);
        if (!stat) return { matches: 0, winPct: null as number | null, raw: null as number | null };
        const winPct = stat.matches ? Math.round((stat.wins / stat.matches) * 100) : null;
        return {
          matches: stat.matches,
          winPct,
          raw: metric === "matches" ? stat.matches : winPct,
        };
      })
    );
  }, [sortedPlayerNames, pairStats, metric]);

  const metricValues = useMemo(() => {
    const values: number[] = [];
    matrix.forEach((row) => {
      row.forEach((cell) => {
        if (!cell || cell.raw === null) return;
        values.push(cell.raw);
      });
    });
    return values;
  }, [matrix]);

  const minValue = metricValues.length ? Math.min(...metricValues) : null;
  const maxValue = metricValues.length ? Math.max(...metricValues) : null;

  const getCellColor = (value: number | null) => {
    if (value === null || minValue === null || maxValue === null) {
      return "background.paper";
    }

    if (minValue === maxValue) {
      return interpolateColor(0.5);
    }

    const ratio = (value - minValue) / (maxValue - minValue);
    return interpolateColor(ratio);
  };

  if (!sortedPlayerNames.length) return null;

  return (
    <Card variant="outlined" sx={{ borderRadius: 3, boxShadow: "0 4px 12px rgba(0,0,0,0.04)", overflow: "hidden" }}>
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2, mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>Heatmap</Typography>
          <TextField
            select
            size="small"
            label="Visa värde"
            value={metric}
            onChange={(event) => setMetric(event.target.value as Metric)}
            sx={{ minWidth: 190 }}
          >
            <MenuItem value="matches">#matches</MenuItem>
            <MenuItem value="winPct">win %</MenuItem>
          </TextField>
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
          Rött = lägst, gult = mellanläge, grönt = högst.
        </Typography>

        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3, overflow: "auto", maxHeight: 520 }}>
          <Table size="small" aria-label="Heatmap med spelarkombinationer" sx={{ minWidth: 900 }}>
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{
                    fontWeight: 700,
                    position: "sticky",
                    left: 0,
                    top: 0,
                    zIndex: 4,
                    bgcolor: "grey.100",
                    minWidth: 180,
                  }}
                >
                  Spelare
                </TableCell>
                {sortedPlayerNames.map((name) => (
                  <TableCell key={`head-${name}`} align="center" sx={{ fontWeight: 700, top: 0, position: "sticky", zIndex: 3, bgcolor: "grey.50", minWidth: 100 }}>
                    {name}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {matrix.map((row, rowIndex) => (
                <TableRow key={`row-${sortedPlayerNames[rowIndex]}`}>
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      position: "sticky",
                      left: 0,
                      zIndex: 2,
                      bgcolor: "background.paper",
                      minWidth: 180,
                    }}
                  >
                    {sortedPlayerNames[rowIndex]}
                  </TableCell>
                  {row.map((cell, colIndex) => {
                    if (rowIndex === colIndex) {
                      // Note for non-coders: diagonal cells compare a player with themself, so we keep them empty and grey.
                      return (
                        <TableCell key={`diag-${rowIndex}-${colIndex}`} align="center" sx={{ bgcolor: "grey.100" }}>
                          
                        </TableCell>
                      );
                    }

                    const displayText = metric === "matches"
                      ? `${cell?.matches ?? 0}`
                      : cell?.winPct === null
                        ? "-"
                        : `${cell.winPct}%`;

                    return (
                      <TableCell
                        key={`cell-${rowIndex}-${colIndex}`}
                        align="center"
                        sx={{
                          bgcolor: getCellColor(cell?.raw ?? null),
                          color: "text.primary",
                          fontWeight: 600,
                        }}
                      >
                        {displayText}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
}
