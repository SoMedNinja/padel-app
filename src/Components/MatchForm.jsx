import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../supabaseClient";
import { GUEST_ID, GUEST_NAME } from "../utils/guest";
import { getProfileDisplayName, idsToNames, makeProfileMap } from "../utils/profileMap";

export default function MatchForm({ user, profiles = [] }) {
  const [team1, setTeam1] = useState(["", ""]);
  const [team2, setTeam2] = useState(["", ""]);
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const toastTimeoutRef = useRef(null);

  const selectablePlayers = useMemo(() => {
    const hasGuest = profiles.some(player => player.id === GUEST_ID);
    return hasGuest ? profiles : [...profiles, { id: GUEST_ID, name: GUEST_NAME }];
  }, [profiles]);
  const profileMap = useMemo(() => makeProfileMap(selectablePlayers), [selectablePlayers]);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const showToast = (message) => {
    setToastMessage(message);
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage("");
    }, 2500);
  };

  const submit = async e => {
    e.preventDefault();

    if (
      team1.includes("") ||
      team2.includes("") ||
      team1.some(p => team2.includes(p))
    ) {
      return alert("Ogiltiga lag");
    }

    try {
      const { error } = await supabase.from("matches").insert({
        team1: idsToNames(team1, profileMap),
        team2: idsToNames(team2, profileMap),
        team1_ids: team1,
        team2_ids: team2,
        team1_sets: Number(a),
        team2_sets: Number(b),
        created_by: user.id,
      });

      if (error) {
        alert(error.message);
        return;
      }
    } catch (error) {
      alert(error.message || "Kunde inte spara matchen.");
      return;
    }

    setTeam1(["", ""]);
    setTeam2(["", ""]);
    setA("");
    setB("");
    showToast("Resultat tillagt");
  };

  const renderPlayerSelect = (team, setTeam, index) => (
    <select
      value={team[index]}
      onChange={e => {
        const t = [...team];
        t[index] = e.target.value;
        setTeam(t);
      }}
    >
      <option value="">Välj</option>
      {selectablePlayers.map(p => (
        <option key={p.id} value={p.id}>
          {getProfileDisplayName(p)}
        </option>
      ))}
    </select>
  );

  return (
    <form onSubmit={submit} className="match-form">
      <h2>Ny match</h2>

      <div className="match-form-grid">
        <div className="match-form-header">
          <span>Lag A (Börjar med serv)</span>
          <span>Lag B</span>
        </div>

        <div className="match-form-row">
          <div className="match-form-cell">
            {renderPlayerSelect(team1, setTeam1, 0)}
          </div>
          <div className="match-form-cell">
            {renderPlayerSelect(team2, setTeam2, 0)}
          </div>
        </div>

        <div className="match-form-row">
          <div className="match-form-cell">
            {renderPlayerSelect(team1, setTeam1, 1)}
          </div>
          <div className="match-form-cell">
            {renderPlayerSelect(team2, setTeam2, 1)}
          </div>
        </div>

        <div className="match-form-header match-form-result-title">
          <span>Resultat</span>
          <span />
        </div>

        <div className="match-form-row match-form-result-row">
          <input
            type="number"
            min="0"
            className="match-form-score-input"
            value={a}
            onChange={e => setA(e.target.value)}
          />
          <span className="match-form-score-separator">–</span>
          <input
            type="number"
            min="0"
            className="match-form-score-input"
            value={b}
            onChange={e => setB(e.target.value)}
          />
        </div>
      </div>

      <button type="submit">Spara</button>
      {toastMessage && <div className="toast toast-success">{toastMessage}</div>}
    </form>
  );
}
