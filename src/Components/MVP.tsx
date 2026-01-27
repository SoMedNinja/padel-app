import React from "react";
import { getLatestMatchDate } from "../utils/stats";
import {
  getMvpWinner,
  scorePlayersForMvp,
  EVENING_MIN_GAMES,
  MONTH_MIN_GAMES
} from "../utils/mvp";
import ProfileName from "./ProfileName";
import { Match, PlayerStats } from "../types";
import { Tooltip, IconButton, Card, CardContent, Typography, Box } from "@mui/material";
import { InfoOutlined } from "@mui/icons-material";

interface MVPProps {
  matches?: Match[];
  players?: PlayerStats[];
  mode: "evening" | "30days";
  title: string;
}

export default function MVP({
  matches = [],
  players = [],
  mode,
  title,
}: MVPProps) {
  if (!matches.length) return null;

  let relevantMatches = matches;

  if (mode === "evening") {
    const latestDate = getLatestMatchDate(matches);
    if (!latestDate) return null;

    relevantMatches = matches.filter(
      m => m.created_at?.slice(0, 10) === latestDate
    );
  }

  if (mode === "30days") {
    const latestTimestamp = matches.reduce((max, match) => {
      const timestamp = new Date(match.created_at).getTime();
      return Number.isNaN(timestamp) ? max : Math.max(max, timestamp);
    }, 0);
    const cutoff = latestTimestamp - 30 * 24 * 60 * 60 * 1000;
    relevantMatches = matches.filter(
      m => new Date(m.created_at).getTime() > cutoff
    );
  }

  const minGames = mode === "evening" ? EVENING_MIN_GAMES : MONTH_MIN_GAMES;

  const results = scorePlayersForMvp(relevantMatches, players, minGames);
  const mvp = getMvpWinner(results);

  const titleEmoji = title?.toLowerCase().includes("kvällens mvp") ? "🚀" : "🏆";
  const explanation = mode === "evening"
    ? "MVP-poängen är utformad för att belöna höga ELO-vinster samtidigt som den tar hänsyn till vinsteffektivitet och deltagandevolym. Beräknas på senaste spelkvällens matcher. Kräver minst 3 matcher."
    : "MVP-poängen är utformad för att belöna höga ELO-vinster samtidigt som den tar hänsyn till vinsteffektivitet och deltagandevolym. Beräknas på rullande 30 dagar. Kräver minst 6 matcher.";

  if (!mvp) {
    return (
      <Card variant="outlined" sx={{ textAlign: 'center', borderRadius: 3, bgcolor: 'background.paper' }}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', color: 'primary.main', fontWeight: 700 }}>
            {titleEmoji} {title}
            <Tooltip title={explanation} arrow>
              <IconButton size="small" sx={{ ml: 0.5, opacity: 0.6 }}>
                <InfoOutlined fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          <Typography variant="body2" color="text.secondary">
            inte tillräckligt många spelade matcher
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const winPct = Math.round(mvp.winRate * 100);

  return (
    <Card variant="outlined" sx={{ textAlign: 'center', borderRadius: 3, bgcolor: 'background.paper', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', color: 'primary.main', fontWeight: 700 }}>
          {titleEmoji} {title}
          <Tooltip title={explanation} arrow>
            <IconButton size="small" sx={{ ml: 0.5, opacity: 0.6 }}>
              <InfoOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        <ProfileName name={mvp.name} badgeId={mvp.badgeId} />
        <Typography variant="body2" color="text.secondary">
          {mvp.wins} vinster, {mvp.games} matcher, {winPct}% vinst, ΔELO: {Math.round(mvp.periodEloGain)}
        </Typography>
      </CardContent>
    </Card>
  );
}
