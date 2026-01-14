export default function Streaks({ matches }) {
  if (!matches?.length) return null;
  const streaks = {};
  matches.forEach(m=>{
    if(!m||!Array.isArray(m.team1)||!Array.isArray(m.team2)||m.team1_sets==null||m.team2_sets==null) return;
    const winners = m.team1_sets>m.team2_sets?m.team1:m.team2;
    winners.forEach(p=>{if(!p) return; streaks[p]=(streaks[p]||0)+1;});
  });
  return (
    <>
      <h2>Streaks</h2>
      <table>
        <thead><tr><th>Spelare</th><th>Vinster i rad</th></tr></thead>
        <tbody>
          {Object.entries(streaks).map(([p,s])=><tr key={p}><td>{p}</td><td>{s}</td></tr>)}
        </tbody>
      </table>
    </>
  );
}
