export default function Streaks({ matches }) {
  if (!matches?.length) return null;

  const streaks = {};

  matches.forEach((m) => {
    if (!m?.team1 || !m?.team2 || m.team1_sets == null || m.team2_sets == null) return;

    const winners = m.team1_sets > m.team2_sets ? m.team1 : m.team2;

    if (!Array.isArray(winners)) return;

    winners.forEach((p) => {
      if (!p) return;
      streaks[p] = (streaks[p] || 0) + 1;
    });
  });

  return (
    <>
      <h2>Streaks</h2>
      <ul>
        {Object.entries(streaks).map(([p, s]) => (
          <li key={p}>
            {p}: {s} vinster i rad
          </li>
        ))}
      </ul>
    </>
  );
}
