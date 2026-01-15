import { useState } from "react";

const players = ["Deniz", "Svag Rojan", "Parth", "Rustam", "Robert", "Gäst"];

export default function MatchForm({ addMatch }) {
  const [teamA, setTeamA] = useState(["", ""]);
  const [teamB, setTeamB] = useState(["", ""]);
  const [setsA, setSetsA] = useState("");
  const [setsB, setSetsB] = useState("");

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
      team1_sets: Number(setsA),
      team2_sets: Number(setsB),
    });

    setTeamA(["", ""]);
    setTeamB(["", ""]);
    setSetsA("");
    setSetsB("");
  };

  const handleSetChange = (setter) => (e) => {
    const val = e.target.value.replace(/\D/g, ""); // bara siffror
    if (val.length <= 2) setter(val);
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
            type="text"
            value={setsA}
            onChange={handleSetChange(setSetsA)}
          />
          {" : "}
          <input
            type="text"
            value={setsB}
            onChange={handleSetChange(setSetsB)}
          />
        </div>
      </div>

      <button type="submit" style={{ marginTop: 12 }}>
        Spara match
      </button>
    </form>
  );
}
