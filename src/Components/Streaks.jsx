export default function Streaks({ matches }) {
  if (!matches?.length) return null;

  const streaks = {};

  matches.forEach(m => {
    const winners =
      m.team1_sets > m.team2_sets ? m.team1 : m.team2;

    winners.forEach(p => {
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
