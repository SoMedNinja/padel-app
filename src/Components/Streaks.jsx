if (!Array.isArray(matches)) return null;
export default function Streaks({ matches }) {
  const stats = {};

  matches.forEach((m) => {
    const winners =
      m.team1_sets > m.team2_sets ? m.team1 : m.team2;
    const losers =
      m.team1_sets > m.team2_sets ? m.team2 : m.team1;

    winners.forEach((p) => {
      if (!stats[p]) stats[p] = { current: 0, best: 0 };
      stats[p].current += 1;
      if (stats[p].current > stats[p].best) {
        stats[p].best = stats[p].current;
      }
    });

    losers.forEach((p) => {
      if (!stats[p]) stats[p] = { current: 0, best: 0 };
      stats[p].current = 0;
    });
  });

  return (
    <div>
      <h2>Streaks</h2>

      <table>
        <thead>
          <tr>
            <th>Spelare</th>
            <th>Nuvarande streak</th>
            <th>Längsta streak</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(stats).map(([name, s]) => (
            <tr key={name}>
              <td>{name}</td>
              <td>{s.current}</td>
              <td>{s.best}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
