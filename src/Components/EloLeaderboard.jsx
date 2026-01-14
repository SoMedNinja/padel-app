import { useState } from "react";
export default function EloLeaderboard({ data }) {
  const [sortKey,setSortKey]=useState("elo"); const [asc,setAsc]=useState(false);
  const sorted=[...data].sort((a,b)=>asc?a[sortKey]-b[sortKey]:b[sortKey]-a[sortKey]);
  const sortBy=(key)=>{if(key===sortKey)setAsc(!asc);else{setSortKey(key);setAsc(false);}};
  return (
    <>
      <h2>ELO Leaderboard</h2>
      <table>
        <thead>
          <tr>
            <th onClick={()=>sortBy("name")}>Namn</th>
            <th onClick={()=>sortBy("elo")}>ELO</th>
            <th onClick={()=>sortBy("wins")}>Vinster</th>
            <th onClick={()=>sortBy("losses")}>Förluster</th>
            <th onClick={()=>sortBy("played")}>Matcher</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(p=>(
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
