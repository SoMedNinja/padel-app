import { getMvpStats, getLatestMatchDate } from "../utils/stats";

export default function MVP({
  matches = [],
  players = [],
  mode,
  title,
}) {
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

  const stats = getMvpStats(relevantMatches);

  const scored = Object.entries(stats).map(([name, s]) => {
    const winPct = s.games ? s.wins / s.games : 0;
    const player = players.find(p => p.name === name);

    return {
      name,
      wins: s.wins,
      games: s.games,
      winPct: Math.round(winPct * 100),
      eloDelta: Math.round(
        (player?.elo || 1000) - (player?.startElo || 1000)
      ),
      score: s.wins * 3 + winPct * 5 + s.games,
    };
  });

  if (!scored.length) return null;

  const mvp = scored.sort((a, b) => b.score - a.score)[0];

  return (
    <div className="mvp">
      🏆 <strong>{title}</strong><br />
      <strong>{mvp.name}</strong><br />
      ({mvp.wins} vinster, {mvp.games} matcher, {mvp.winPct}% vinst, ΔELO: {mvp.eloDelta})
    </div>
  );
}
