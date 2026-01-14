export default function Heatmap({ matches }) {
  if (!matches?.length) return null;
  const pairs = {};
  matches.forEach(m=>{
    if(!m||!Array.isArray(m.team1)||!Array.isArray(m.team2)||m.team1_sets==null||m.team2_sets==null) return;
    const winner = m.team1_sets>m.team2_sets?m.team1:m.team2;
    const key = winner.sort().join(" & ");
    if(!key) return;
    if(!pairs[key]) pairs[key]={wins:0,games:0};
    pairs[key].wins++; pairs[key].games++;
  });
  return (
    <>
      <h2>Lag-kombinationer</h2>
      <table>
        <thead><tr><th>Lag</th><th>Vinster</th><th>Matcher</th></tr></thead>
        <tbody>
          {Object.entries(pairs).map(([k,v])=><tr key={k}><td>{k}</td><td>{v.wins}</td><td>{v.games}</td></tr>)}
        </tbody>
      </table>
    </>
  );
}
