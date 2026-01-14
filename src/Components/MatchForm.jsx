import { useState } from "react";

const players = ["Deniz", "Svag Rojan", "Parth", "Rustam", "Robert", "Gäst"];

export default function MatchForm({ addMatch }) {
  const [teamA, setTeamA] = useState(["", ""]);
  const [teamB, setTeamB] = useState(["", ""]);
  const [setsA, setSetsA] = useState(0);
  const [setsB, setSetsB] = useState(0);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (
      teamA.includes("") ||
      teamB.includes("") ||
      teamA.some((p) => teamB.includes(p))
    ) {
      alert("Kontrollera spelare!");
      return;
    }

    addMatch({
      team1: teamA,
      team2: teamB,
      team1_sets: setsA,
      team2_sets: setsB,
    });

    setTeamA(["", ""]);
    setTeamB(["", ""]);
    setSetsA(0);
    setSetsB(0);
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Lägg till match</h2>

      <div style={{ display: "flex", gap: 20 }}>
        <div>
          <h4>Team A</h4>
          {teamA.map((val, i) => (
            <select
              key={i}
              value={val}
              onChange={(e) => {
                const t = [...teamA];
                t[i] = e.target.value;
                setTeamA(t);
              }}
            >
              <option value="">Välj spelare</option>
              {players.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          ))}
        </div>

        <div>
          <h4>Team B</h4>
          {teamB.map((val, i) => (
            <select
              key={i}
              value={val}
              onChange={(e) => {
                const t = [...teamB];
                t[i] = e.target.value;
                setTeamB(t);
              }}
            >
              <option value="">Välj spelare</option>
              {players.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <label>Resultat</label>
        <div>
          <input
            type="number"
            min="0"
            value={setsA}
            onChange={(e) => setSetsA(Number(e.target.value))}
          />
          {" : "}
          <input
            type="number"
            min="0"
            value={setsB}
            onChange={(e) => setSetsB(Number(e.target.value))}
          />
        </div>
      </div>

      <button type="submit" style={{ marginTop: 12 }}>
        Spara match
      </button>
    </form>
  );
}
