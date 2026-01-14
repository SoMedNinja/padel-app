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
      teamA.some((p) => teamB.includes(p)) ||
      setsA < 0 ||
      setsB < 0
    ) {
      alert("Kontrollera spelare och set-resultat!");
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

      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <label>Team A</label>
          {teamA.map((val, i) => (
            <select
              key={i}
              value={val}
              onChange={(e) => {
                const t = [...]()
