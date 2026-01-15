export default function EveningMVP({ matches = [] }) {
  if (!matches.length) return null;

  // 1️⃣ Hitta senaste speldatumet
  const latestDate = matches
    .map(m => m.created_at?.slice(0, 10))
    .filter(Boolean)
    .sort()
    .pop();

  if (!latestDate) return null;

  // 2️⃣ Filtrera matcher till just denna kväll
  const eveningMatches = matches.filter(
    m => m.created_at?.slice(0, 10) === latestDate
  );

  if (!eveningMatches.length) return null;

  const stats = {};

  // 3️⃣ Samla statistik
  eveningMatches.forEach((m) => {
    const teamAWon = m.team1_sets > m.team2_sets;
    const winners = teamAWon ? m.team1 : m.team2;
    const losers = teamAWon ? m.team2 : m.team1;

    winners.forEach((p) => {
      if (!p || p === "Gäst") return;
      if (!stats[p]) {
        stats[p] = { wins: 0, games: 0, trend: [] };
      }
      stats[p].wins += 1;
      stats[p].games += 1;
      stats[p].trend.push("W");
    });

    losers.forEach((p) => {
      if (!p || p === "Gäst") return;
      if (!stats[p]) {
        stats[p] = { wins: 0, games: 0, trend: [] };
      }
      stats[p].games += 1;
      stats[p].trend.push("L");
    });
  });

  // 4️⃣ MVP-poäng (viktad men enkel)
  const scored = Object.entries(stats).map(([name, s]) => {
    const winPct = s.wins / (s.games || 1);
    const trendScore = s.trend.slice(-3).filter(r => r === "W").length;

    const score =
      s.wins * 3 +          // vinster
      winPct * 5 +          // vinst %
      s.games * 1 +         // aktivitet
      trendScore * 2;       // form samma kväll

    return {
      name,
      score,
      wins: s.wins,
      games: s.games,
      winPct: Math.round(winPct * 100),
    };
  });

  if (!scored.length) return null;

  scored.sort((a, b) => b.score - a.score);
  const mvp = scored[0];

  return (
    <div className="mvp">
      🏆 <strong>Kvällens MVP</strong> ({latestDate})<br />
      <strong>{mvp.name}</strong><br />
      {mvp.wins} vinster · {mvp.games} matcher · {mvp.winPct}% vinst<br />
      <small>baserat på {eveningMatches.length} matcher</small>
    </div>
  );
}
