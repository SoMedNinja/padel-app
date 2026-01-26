import React, { useState } from "react";
import { Match } from "../types";

interface StreaksProps {
  matches?: Match[];
}

interface StreakStats {
  current: number;
  best: number;
}

export default function Streaks({ matches = [] }: StreaksProps) {
  const [sortKey, setSortKey] = useState<string>("best");
  const [asc, setAsc] = useState<boolean>(false);

  if (!matches.length) return null;

  const stats: Record<string, StreakStats> = {};
  matches.forEach((m) => {
    const winners = m.team1_sets > m.team2_sets ? m.team1 : m.team2;
    const losers = m.team1_sets > m.team2_sets ? m.team2 : m.team1;

    const winnersList = Array.isArray(winners) ? winners : [winners];
    const losersList = Array.isArray(losers) ? losers : [losers];

    winnersList.forEach((p) => {
      if (p === "Gäst") return;
      if (!stats[p]) stats[p] = { current: 0, best: 0 };
      stats[p].current += 1;
      if (stats[p].current > stats[p].best) stats[p].best = stats[p].current;
    });

    losersList.forEach((p) => {
      if (p === "Gäst") return;
      if (!stats[p]) stats[p] = { current: 0, best: 0 };
      stats[p].current = 0;
    });
  });

  const rows = Object.entries(stats).map(([name, s]) => ({ name, ...s }));

  rows.sort((a: any, b: any) => {
    const valA = a[sortKey], valB = b[sortKey];
    if (typeof valA === 'string' && typeof valB === 'string') {
        return asc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    return asc ? valA - valB : valB - valA;
  });

  const handleSort = (key: string) => {
    if (key === sortKey) setAsc(!asc);
    else {
      setSortKey(key);
      setAsc(false);
    }
  };

  return (
    <div className="table-card">
      <h2>Streaks</h2>
      <div className="table-scroll">
        <div className="table-scroll-inner">
          <table className="styled-table">
            <thead>
              <tr>
                <th className="sortable" onClick={() => handleSort("name")}>Spelare</th>
                <th className="sortable" onClick={() => handleSort("current")}>Nuvarande streak</th>
                <th className="sortable" onClick={() => handleSort("best")}>Längsta streak</th>
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
      </div>
    </div>
  );
}
