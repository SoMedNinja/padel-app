export default function EloLeaderboard({ players = [] }) {
  return (
    <div>
      <h2>ELO Leaderboard</h2>
      <table>
        <thead>
          <tr>
            <th>Spelare</th>
            <th>ELO</th>
            <th>Matcher</th>
            <th>Vinster</th>
            <th>Vinst %</th>
          </tr>
        </thead>
        <tbody>
          {players.map((p) => {
            const games = p.wins + p.losses;
            const winPct = games === 0 ? 0 : Math.round((p.wins / games) * 100);
            return (
              <tr key={p.name}>
                <td>{p.name}</td>
                <td>{Math.round(p.elo)}</td>
                <td>{games}</td>
                <td>{p.wins}</td>
                <td>{winPct}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
