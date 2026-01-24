import { useState } from "react";

export default function Streaks({ matches = [] }) {
  const [sortKey, setSortKey] = useState("best");
  const [asc, setAsc] = useState(false);

  if (!matches.length) return null;

  const stats = {};
  matches.forEach((m) => {
    const winners = m.team1_sets > m.team2_sets ? m.team1 : m.team2;
    const losers = m.team1_sets > m.team2_sets ? m.team2 : m.team1;

    winners.forEach((p) => {
      if (p === "Gäst") return;
      if (!stats[p]) stats[p] = { current: 0, best: 0 };
      stats[p].current += 1;
      if (stats[p].current > stats[p].best) stats[p].best = stats[p].current;
    });

    losers.forEach((p) => {
      if (p === "Gäst") return;
      if (!stats[p]) stats[p] = { current: 0, best: 0 };
      stats[p].current = 0;
    });
  });

  let rows = Object.entries(stats).map(([name, s]) => ({ name, ...s }));

  rows.sort((a, b) => {
    let valA = a[sortKey], valB = b[sortKey];
    return asc ? valA - valB : valB - valA;
  });

  const handleSort = (key) => {
    if (key === sortKey) setAsc(!asc);
    else {
      setSortKey(key);
      setAsc(false);
    }
  };

  return (
    <div>
      <h2>Streaks</h2>
      <table>
        <thead>
          <tr>
            <th onClick={() => handleSort("name")}>Spelare</th>
            <th onClick={() => handleSort("current")}>Nuvarande streak</th>
            <th onClick={() => handleSort("best")}>Längsta streak</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name}>
              <td>{r.name}</td>
              <td>{r.current}</td>
              <td>{r.best}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
