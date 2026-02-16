import React, { useMemo } from "react";
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
  eloDeltaByMatch?: Record<string, Record<string, number>>;
}

export default function MVP({
  matches = [],
  players = [],
  mode,
  title,
  eloDeltaByMatch,
}: MVPProps) {
  const mvp = useMemo(() => {
    if (!matches.length) return null;

    let relevantMatches = matches;

    if (mode === "evening") {
      // Optimization: find latest date in a single pass using string comparison
      // to avoid new Date() calls.
      let latestDate = "";
      for (const m of matches) {
        const d = m.created_at?.slice(0, 10);
        if (d && d > latestDate) latestDate = d;
      }
      if (!latestDate) return null;

      relevantMatches = matches.filter(
        m => m.created_at?.startsWith(latestDate)
      );
    }

    if (mode === "30days") {
      // Optimization: find latest timestamp using string comparison for latest date
      // and use ISO string comparison for filtering to avoid O(M) new Date() calls.
      let latestCreatedAt = "";
      for (const m of matches) {
        if (m.created_at > latestCreatedAt) latestCreatedAt = m.created_at;
      }
      if (!latestCreatedAt) return null;

      const latestTime = new Date(latestCreatedAt).getTime();
      const cutoffStr = new Date(latestTime - 30 * 24 * 60 * 60 * 1000).toISOString();

      relevantMatches = matches.filter(m => m.created_at > cutoffStr);
    }

    const minGames = mode === "evening" ? EVENING_MIN_GAMES : MONTH_MIN_GAMES;

    const results = scorePlayersForMvp(relevantMatches, players, minGames, eloDeltaByMatch);
    return getMvpWinner(results);
  }, [matches, players, mode, eloDeltaByMatch]);

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
            <Tooltip
              title={explanation}
              arrow
              enterTouchDelay={0}
              leaveTouchDelay={5000}
            >
              <IconButton
                size="small"
                sx={{ ml: 0.5, opacity: 0.6 }}
                aria-label={`Information om ${title}`}
              >
                <InfoOutlined fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          <Typography variant="body2" color="text.secondary">
            Inte tillräckligt många spelade matcher
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
          <Tooltip
            title={explanation}
            arrow
            enterTouchDelay={0}
            leaveTouchDelay={5000}
          >
            <IconButton
              size="small"
              sx={{ ml: 0.5, opacity: 0.6 }}
              aria-label={`Information om ${title}`}
            >
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
