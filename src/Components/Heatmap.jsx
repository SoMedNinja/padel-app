export default function Heatmap({ matches }) {
  if (!matches?.length) return null;

  const pairs = {};

  matches.forEach((m, i) => {
    if (
      !m ||
      !Array.isArray(m.team1) ||
      !Array.isArray(m.team2) ||
      m.team1_sets == null ||
      m.team2_sets == null
    ) {
      console.warn("Skipping invalid match", i, m);
      return;
    }

    const winner = m.team1_sets > m.team2_sets ? m.team1 : m.team2;
    if (!Array.isArray(winner)) return;

    const key = [...winner].sort().join(" & ");
    if (!key) return;

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
