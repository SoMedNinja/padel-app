export default function MVP({ matches = [], players = [] }) {
  if (!matches.length) return null;

  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000; // senaste 30 dagar
  const recentMatches = matches.filter(
    (m) => m.created_at && new Date(m.created_at).getTime() > cutoff
  );

  const stats = {}; // { [player]: { wins, games } }

  // Samla statistik per spelare
  recentMatches.forEach((m) => {
    const winners = m.team1_sets > m.team2_sets ? m.team1 : m.team2;
    const losers = m.team1_sets > m.team2_sets ? m.team2 : m.team1;

    winners.forEach((p) => {
      if (!p || p === "Gäst") return;
      if (!stats[p]) stats[p] = { wins: 0, games: 0 };
      stats[p].wins++;
      stats[p].games++;
    });

    losers.forEach((p) => {
      if (!p || p === "Gäst") return;
      if (!stats[p]) stats[p] = { wins: 0, games: 0 };
      stats[p].games++;
    });
  });

  // Beräkna MVP
  const mvpScores = Object.entries(stats).map(([p, s]) => {
    const winPct = s.games === 0 ? 0 : s.wins / s.games;
    const currentElo = players.find((pl) => pl.name === p)?.elo || 1000;
    const startElo = players.find((pl) => pl.name === p)?.startElo || 1000;
    const eloDelta = currentElo - startElo;

    return { player: p, wins: s.wins, games: s.games, winPct: Math.round(winPct*100), eloDelta };
  });

  if (!mvpScores.length) return null;

  const mvp = mvpScores.sort((a, b) => b.wins - a.wins)[0];

  return (
    <div className="mvp">
      🏆 <strong>MVP (30 dagar):</strong> {mvp.player}<br />
      ({mvp.wins} vinster, {mvp.games} matcher, {mvp.winPct}% vinst, ΔELO: {Math.round(mvp.eloDelta)})
    </div>
  );
}
