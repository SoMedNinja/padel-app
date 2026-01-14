export default function Heatmap({ matches }) {
  if (!matches?.length) return null;

  const pairs = {};

  matches.forEach(m => {
    const winner = m.team1_sets > m.team2_sets ? m.team1 : m.team2;
    const key = winner.sort().join(" & ");

    if (!pairs[key]) pairs[key] = { wins: 0, games: 0 };
    pairs[key].wins++;
    pairs[key].games++;
  });

  return (
    <>
      <h2>Lag-kombinationer</h2>
      <ul>
        {Object.entries(pairs).map(([k, v]) => (
          <li key={k}>
            {k}: {v.wins} vinster ({v.games} matcher)
          </li>
        ))}
      </ul>
    </>
  );
}
