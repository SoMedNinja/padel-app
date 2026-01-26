import React from "react";
import { getLatestMatchDate } from "../utils/stats";
import ProfileName from "./ProfileName";
import { Match, PlayerStats } from "../types";
import { getMvpWinner, scorePlayersForMvp, EVENING_MIN_GAMES, MONTH_MIN_GAMES } from "../utils/mvp";

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
  const scored = scorePlayersForMvp(relevantMatches, players, minGames);
  const mvp = getMvpWinner(scored);

  const titleEmoji = title?.toLowerCase().includes("kvällens mvp") ? "🚀" : "🏆";

  if (!mvp) {
    return (
      <div className="mvp">
        <div className="mvp-title">{titleEmoji} {title}</div>
        <div className="mvp-meta">inte tillräckligt många spelade matcher</div>
      </div>
    );
  }

  const player = players.find(p => p.id === mvp.id);
  const winPct = Math.round(mvp.winRate * 100);

  return (
    <div className="mvp">
      <div className="mvp-title">{titleEmoji} {title}</div>
      <ProfileName className="mvp-name" name={mvp.name} badgeId={player?.featuredBadgeId || null} />
      <div className="mvp-meta">
        {mvp.wins} vinster, {mvp.games} matcher, {winPct}% vinst, ΔELO: {Math.round(mvp.periodEloGain)}
      </div>
    </div>
  );
}
