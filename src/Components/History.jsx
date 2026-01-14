export default function History({ matches, deleteMatch }) {
  if (!matches?.length) return <div>Inga matcher sparade.</div>;

  return (
    <div>
      <h2>Tidigare matcher</h2>
      <table>
        <thead>
          <tr>
            <th>Team A</th>
            <th>Team B</th>
            <th>Resultat</th>
            <th>Radera</th>
          </tr>
        </thead>
        <tbody>
          {matches.map((m) => {
            const teamA = Array.isArray(m.team_a) ? m.team_a.join(", ") : "";
            const teamB = Array.isArray(m.team_b) ? m.team_b.join(", ") : "";
            const setsA = m.sets_a ?? 0;
            const setsB = m.sets_b ?? 0;

            return (
              <tr key={m.id}>
                <td>{teamA}</td>
                <td>{teamB}</td>
                <td>{setsA} : {setsB}</td>
                <td>
                  <button onClick={() => deleteMatch(m.id)}>Radera</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
