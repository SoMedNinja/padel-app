import {
  Grid,
  Paper,
  Typography,
  Box,
} from "@mui/material";
import { PlayerStats } from "../../types";
import { percent, formatEloDelta } from "../../utils/format";
import { getEloDeltaClass } from "../../utils/playerStats";
import { MVP_WINDOW_DAYS } from "../../utils/mvp";

const renderWinLossSplit = (wins: number, losses: number, includePercent = false) => {
  const total = wins + losses;
  if (!total) return "—";
  // Note for non-coders: we render wins/losses as separate colored spans so it's easy to scan at a glance.
  return (
    <Box component="span" sx={{ display: "inline-flex", alignItems: "baseline", gap: 0.75, flexWrap: "wrap" }}>
      <Typography component="span" variant="inherit" sx={{ color: "success.main", fontWeight: 800 }}>
        {wins}
      </Typography>
      <Typography component="span" variant="inherit" sx={{ color: "text.primary" }}>
        -
      </Typography>
      <Typography component="span" variant="inherit" sx={{ color: "error.main", fontWeight: 800 }}>
        {losses}
      </Typography>
      {includePercent && (
        <Typography component="span" variant="body2" sx={{ color: "text.secondary", fontWeight: 600 }}>
          ({percent(wins, losses)}%)
        </Typography>
      )}
    </Box>
  );
};

interface PlayerStatsGridProps {
  filteredStats: PlayerStats | undefined;
  serveSplitStats: {
    serveFirstWins: number;
    serveFirstLosses: number;
    serveSecondWins: number;
    serveSecondLosses: number;
  };
  last30DaysDelta: number;
  lastSessionDelta: number;
  recentFormStats: { wins: number; losses: number };
  tournamentMerits: Array<{ label: string; count: number }>;
}

export default function PlayerStatsGrid({
  filteredStats,
  serveSplitStats,
  last30DaysDelta,
  lastSessionDelta,
  recentFormStats,
  tournamentMerits,
}: PlayerStatsGridProps) {
  return (
    <Grid container spacing={2}>
      {tournamentMerits.map(merit => (
        <Grid key={merit.label} size={{ xs: 6, sm: 4, md: 3 }}>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              textAlign: 'center',
              borderRadius: 2,
              bgcolor: 'grey.50',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>{merit.label}</Typography>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>{merit.count}</Typography>
          </Paper>
        </Grid>
      ))}
      {/* Note for non-coders: the card styles below keep each stats box the same height for neat rows. */}
      {[
        { label: "Matcher", value: filteredStats ? filteredStats.wins + filteredStats.losses : 0 },
        {
          label: "Vinst/förlust",
          value: renderWinLossSplit(filteredStats?.wins ?? 0, filteredStats?.losses ?? 0),
        },
        { label: "Vinst %", value: `${filteredStats ? percent(filteredStats.wins, filteredStats.losses) : 0}%` },
        {
          label: "Vinst/förlust med start-serve",
          value: renderWinLossSplit(serveSplitStats.serveFirstWins, serveSplitStats.serveFirstLosses, true),
        },
        {
          label: "Vinst/förlust utan start-serve",
          value: renderWinLossSplit(serveSplitStats.serveSecondWins, serveSplitStats.serveSecondLosses, true),
        },
        { label: `ELO +/- (${MVP_WINDOW_DAYS}d)`, value: formatEloDelta(last30DaysDelta), color: getEloDeltaClass(last30DaysDelta) },
        { label: "ELO +/- (Kväll)", value: formatEloDelta(lastSessionDelta), color: getEloDeltaClass(lastSessionDelta) },
        { label: "Form (L5)", value: `${recentFormStats.wins}V - ${recentFormStats.losses}F` },
      ].map(stat => (
        <Grid key={stat.label} size={{ xs: 6, sm: 4, md: 3 }}>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              textAlign: 'center',
              borderRadius: 2,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>{stat.label}</Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, color: stat.color === 'stat-delta-positive' ? 'success.main' : stat.color === 'stat-delta-negative' ? 'error.main' : 'inherit' }}>
              {stat.value}
            </Typography>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
}
