import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function MatchForm({ user }) {
  const [players, setPlayers] = useState([]);
  const [team1, setTeam1] = useState(["", ""]);
  const [team2, setTeam2] = useState(["", ""]);
  const [a, setA] = useState("");
  const [b, setB] = useState("");

  useEffect(() => {
    supabase.from("profiles").select("*").then(({ data }) => {
      setPlayers(data || []);
    });
  }, []);

  const submit = async e => {
    e.preventDefault();

    if (
      team1.includes("") ||
      team2.includes("") ||
      team1.some(p => team2.includes(p))
    ) {
      return alert("Ogiltiga lag");
    }

    await supabase.from("matches").insert({
      team1_ids: team1,
      team2_ids: team2,
      team1_sets: Number(a),
      team2_sets: Number(b),
      created_by: user.id,
    });

    setTeam1(["", ""]);
    setTeam2(["", ""]);
    setA("");
    setB("");
  };

  const selectTeam = (team, setTeam) =>
    team.map((val, i) => (
      <select
        key={i}
        value={val}
        onChange={e => {
          const t = [...team];
          t[i] = e.target.value;
          setTeam(t);
        }}
      >
        <option value="">Välj</option>
        {players.map(p => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    ));

  return (
    <form onSubmit={submit}>
      <h2>Ny match</h2>

      <h4>Team A</h4>
      {selectTeam(team1, setTeam1)}

      <h4>Team B</h4>
      {selectTeam(team2, setTeam2)}

      <input value={a} onChange={e => setA(e.target.value)} />
      {" : "}
      <input value={b} onChange={e => setB(e.target.value)} />

      <button>Spara</button>
    </form>
  );
}
