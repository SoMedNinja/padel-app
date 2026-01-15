export default function EveningMVP({ matches = [], players = [] }) {
  if (!matches.length) return null;

  // Hitta senaste speldatum
  const latestDate = matches
    .map((m) => m.created_at?.slice(0, 10))
    .filter(Boolean)
    .sort()
    .pop();

  if (!latestDate) return null;

  // Filtrera matcher för kvällen
  const eveningMatches = matches.filter(
    (m) => m.created_at?.slice(0, 10) === latestDate
  );

  if (!eveningMatches.length) return null;

  const stats = {};

  // Samla statistik
  eveningMatches.forEach((m) => {
    const winners = m.team1_sets > m.team2_sets ? m.team1 : m.team2;
    const losers = m.team1_sets > m.team2_sets ? m.team2 : m.team1;

    winners.forEach((p) => {
      if (!p || p === "Gäst") return;
      if (!stats[p]) stats[p] = { wins: 0, games: 0, trend: [] };
      stats[p].wins++;
      stats[p].games++;
      stats[p].trend.push("W");
    });

    losers.forEach((p) => {
      if (!p || p === "Gäst") return;
      if (!stats[p]) stats[p] = { wins: 0, games: 0, trend: [] };
      stats[p].games++;
      stats[p].trend.push("L");
    });
  });

  // Beräkna poäng
  const scored = Object.entries(stats).map(([name, s]) => {
    const winPct = s.wins / (s.games || 1);
    const trendScore = s.trend.slice(-3).filter(r => r === "W").length;
    const eloDelta = Math.round((players.find(p => p.name === name)?.elo || 1000) - (players.find(p => p.name === name)?.startElo || 1000));

    const score = s.wins * 3 + winPct * 5 + s.games + trendScore * 2;

    return {
      name,
      score,
      wins: s.wins,
      games: s.games,
      winPct: Math.round(winPct * 100),
      eloDelta
    };
  });

  if (!scored.length) return null;

  const mvp = scored.sort((a, b) => b.score - a.score)[0];

  return (
    <div className="mvp">
      🚀 <strong>Kvällens MVP</strong> ({latestDate})<br />
      <strong>{mvp.name}</strong><br />
      ({mvp.wins} vinster, {mvp.games} matcher, {mvp.winPct}% vinst, ΔELO: {mvp.eloDelta})
    </div>
  );
}
