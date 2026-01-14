import { useState } from "react";

export default function EloLeaderboard({ data }) {
  const [sortKey, setSortKey] = useState("elo");
  const [asc, setAsc] = useState(false);

  function sortBy(key) {
    if (key === sortKey) setAsc(!asc);
    else {
      setSortKey(key);
      setAsc(false);
    }
  }

  const sorted = [...data].sort((a, b) =>
    asc ? a[sortKey] - b[sortKey] : b[sortKey] - a[sortKey]
  );

  return (
    <>
      <h2>ELO Leaderboard</h2>
      <table>
        <thead>
          <tr>
            {["name", "elo", "wins", "losses", "played"].map(k => (
              <th key={k} onClick={() => sortBy(k)}>
                {k.toUpperCase()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map(p => (
            <tr key={p.name}>
              <td>{p.name}</td>
              <td>{Math.round(p.elo)}</td>
              <td>{p.wins}</td>
              <td>{p.losses}</td>
              <td>{p.played}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
