export default function Heatmap({ matches }) {
  if (!Array.isArray(matches)) return null;
  const combos = {};

  matches.forEach((m) => {
    const teams = [
      { players: m.team1, won: m.team1_sets > m.team2_sets },
      { players: m.team2, won: m.team2_sets > m.team1_sets },
    ];

    teams.forEach(({ players, won }) => {
      const key = [...players].sort().join(" + ");

      if (!combos[key]) {
        combos[key] = {
          players: [...players].sort(),
          games: 0,
          wins: 0,
        };
      }

      combos[key].games += 1;
      if (won) combos[key].wins += 1;
    });
  });

  const rows = Object.values(combos).map((c) => ({
    ...c,
    winPct: Math.round((c.wins / c.games) * 100),
  }));

  return (
    <div>
      <h2>Lag-kombinationer</h2>

      <table>
        <thead>
          <tr>
            <th>Lag</th>
            <th>Matcher</th>
            <th>Vinster</th>
            <th>Vinst %</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.players.join("-")}>
              <td>{r.players.join(" & ")}</td>
              <td>{r.games}</td>
              <td>{r.wins}</td>
              <td>{r.winPct}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
