export default function History({ matches, deleteMatch }) {
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
          {matches.map(m=>(
            <tr key={m.id}>
              <td>{m.team_a.join(", ")}</td>
              <td>{m.team_b.join(", ")}</td>
              <td>{m.sets_a} : {m.sets_b}</td>
              <td><button onClick={()=>deleteMatch(m.id)}>Radera</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
