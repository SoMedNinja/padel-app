import React from "react";
import { getMvpStats, getLatestMatchDate } from "../utils/stats";
import ProfileName from "./ProfileName";
import { Match, PlayerStats } from "../types";

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

  const allowedNames = new Set(players.map(player => player.name));
  const stats = getMvpStats(relevantMatches, allowedNames);
  const relevantMatchIds = new Set(relevantMatches.map(m => m.id).filter(Boolean));

  const minGames = mode === "evening" ? 3 : 6;

  const scored = Object.entries(stats).map(([name, s]) => {
    const winRate = s.games ? s.wins / s.games : 0;
    const player = players.find(p => p.name === name);

    const periodEloGain = (player?.history || [])
      .filter(h => relevantMatchIds.has(h.matchId))
      .reduce((sum, h) => sum + (h.delta || 0), 0);

    const eloNet = player?.elo || 1000;

    return {
      name,
      wins: s.wins,
      games: s.games,
      winRate,
      winPct: Math.round(winRate * 100),
      periodEloGain,
      eloNet,
      badgeId: player?.featuredBadgeId || null,
      score: periodEloGain * (0.9 + 0.2 * winRate) + 0.3 * s.games,
    };
  });

  const eligible = scored.filter(s => s.games >= minGames);

  const titleEmoji = title?.toLowerCase().includes("kvällens mvp") ? "🚀" : "🏆";

  if (!eligible.length) {
    return (
      <div className="mvp">
        <div className="mvp-title">{titleEmoji} {title}</div>
        <div className="mvp-meta">inte tillräckligt många spelade matcher</div>
      </div>
    );
  }

  const sortedEligible = eligible.sort((a, b) => {
    if (Math.abs(b.score - a.score) > 0.001) return b.score - a.score;
    if (b.periodEloGain !== a.periodEloGain) return b.periodEloGain - a.periodEloGain;
    if (b.eloNet !== a.eloNet) return b.eloNet - a.eloNet;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return a.name.localeCompare(b.name);
  });

  const mvp = sortedEligible[0];

  return (
    <div className="mvp">
      <div className="mvp-title">{titleEmoji} {title}</div>
      <ProfileName className="mvp-name" name={mvp.name} badgeId={mvp.badgeId} />
      <div className="mvp-meta">
        {mvp.wins} vinster, {mvp.games} matcher, {mvp.winPct}% vinst, ΔELO: {Math.round(mvp.periodEloGain)}
      </div>
    </div>
  );
}
