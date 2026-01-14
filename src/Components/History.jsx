if (!Array.isArray(matches)) return null;
export default function History({ matches, deleteMatch }) {
  if (!matches?.length) {
    return <div>Inga matcher sparade.</div>;
  }

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
          {matches.map((m) => (
            <tr key={m.id}>
              <td>{m.team1.join(", ")}</td>
              <td>{m.team2.join(", ")}</td>
              <td>
                {m.team1_sets} : {m.team2_sets}
              </td>
              <td>
                <button onClick={() => deleteMatch(m.id)}>Radera</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
