import React from "react";
import { getLatestMatchDate, getMvpWinner, MIN_GAMES_EVENING, MIN_GAMES_MONTH } from "../utils/stats";
import ProfileName from "./ProfileName";
import { Match, PlayerStats } from "../types";
import { Tooltip, IconButton } from "@mui/material";
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

  const minGames = mode === "evening" ? MIN_GAMES_EVENING : MIN_GAMES_MONTH;

  const mvp = getMvpWinner(
    relevantMatches,
    players,
    "evening", // MVP card always uses standard formula
    minGames
  );

  const titleEmoji = title?.toLowerCase().includes("kvällens mvp") ? "🚀" : "🏆";
  const explanation = mode === "evening"
    ? "Beräknas på senaste spelkvällens matcher. Kräver minst 3 matcher."
    : "Beräknas på rullande 30 dagar. Kräver minst 6 matcher.";

  if (!mvp) {
    return (
      <div className="mvp">
        <div className="mvp-title">
          {titleEmoji} {title}
          <Tooltip title={explanation} arrow>
            <IconButton size="small" sx={{ ml: 0.5, p: 0.5, opacity: 0.6 }}>
              <InfoOutlined fontSize="inherit" />
            </IconButton>
          </Tooltip>
        </div>
        <div className="mvp-meta">inte tillräckligt många spelade matcher</div>
      </div>
    );
  }

  const winPct = Math.round(mvp.winRate * 100);

  return (
    <div className="mvp">
      <div className="mvp-title">
        {titleEmoji} {title}
        <Tooltip title={explanation} arrow>
          <IconButton size="small" sx={{ ml: 0.5, p: 0.5, opacity: 0.6 }}>
            <InfoOutlined fontSize="inherit" />
          </IconButton>
        </Tooltip>
      </div>
      <ProfileName className="mvp-name" name={mvp.name} badgeId={mvp.badgeId} />
      <div className="mvp-meta">
        {mvp.wins} vinster, {mvp.games} matcher, {winPct}% vinst, ΔELO: {Math.round(mvp.periodEloGain)}
      </div>
    </div>
  );
}
