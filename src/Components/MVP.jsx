export default function MVP({ matches }) {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const wins = {};

  matches
    .filter(m => new Date(m.created_at).getTime() > cutoff)
    .forEach(m => {
      const winners =
        m.team1_sets > m.team2_sets ? m.team1 : m.team2;

      winners.forEach(p => {
        wins[p] = (wins[p] || 0) + 1;
      });
    });

  const mvp = Object.entries(wins).sort((a, b) => b[1] - a[1])[0];

  if (!mvp) return null;

  return (
    <div className="mvp">
      🏆 <strong>MVP (30 dagar):</strong> {mvp[0]} – {mvp[1]} vinster
    </div>
  );
}
