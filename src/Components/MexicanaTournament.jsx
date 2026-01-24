import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import {
  getProfileDisplayName,
  idsToNames,
  makeProfileMap,
} from "../utils/profileMap";
import {
  getTournamentState,
  getRestCycle,
  getNextSuggestion,
  pickAmericanoRestingPlayers,
  pickMexicanoRestingPlayers,
} from "../utils/tournamentLogic";

const POINTS_OPTIONS = [16, 21, 24, 31];
const SCORE_TARGET_DEFAULT = 24;

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
};

const toDateInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const getTournamentStatusLabel = (status) => {
  const labels = {
    draft: "Utkast",
    in_progress: "Pågår",
    completed: "Avslutad",
    abandoned: "Avbruten",
  };
  return labels[status] || "Okänd";
};

export default function MexicanaTournament({
  user,
  profiles = [],
  eloPlayers = [],
  isGuest = false,
  onTournamentSync,
}) {
  const [tournaments, setTournaments] = useState([]);
  const [activeTournamentId, setActiveTournamentId] = useState("");
  const [participants, setParticipants] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [resultsByTournament, setResultsByTournament] = useState({});
  const [newTournament, setNewTournament] = useState({
    name: "",
    scheduled_at: toDateInput(new Date().toISOString()),
    location: "",
    score_target: SCORE_TARGET_DEFAULT,
    tournament_type: "americano",
  });

  // Mode for the NEXT round suggestion
  const [nextRoundMode, setNextRoundMode] = useState("americano");
  const [recordingRound, setRecordingRound] = useState(null);
  const [showOverrideWarning, setShowOverrideWarning] = useState(false);
  const [overrideConfirmed, setOverrideConfirmed] = useState(false);

  const profileMap = useMemo(() => makeProfileMap(profiles), [profiles]);

  const activeTournament = useMemo(
    () => tournaments.find(t => t.id === activeTournamentId) || null,
    [tournaments, activeTournamentId]
  );

  useEffect(() => {
    if (activeTournament) {
      setNextRoundMode(activeTournament.tournament_type || "americano");
    }
  }, [activeTournament]);

  const { standings, teammatesFaced } = useMemo(() => {
    return getTournamentState(rounds, participants);
  }, [rounds, participants]);

  const sortedStandings = useMemo(() => {
    return Object.values(standings).sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      const diffA = a.pointsFor - a.pointsAgainst;
      const diffB = b.pointsFor - b.pointsAgainst;
      if (diffB !== diffA) return diffB - diffA;
      return b.wins - a.wins;
    });
  }, [standings]);

  const currentSuggestion = useMemo(() => {
    if (participants.length < 4) return null;
    return getNextSuggestion(rounds, participants, nextRoundMode);
  }, [rounds, participants, nextRoundMode]);

  useEffect(() => {
    const loadTournaments = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("mexicana_tournaments")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        setErrorMessage(error.message || "Kunde inte hämta turneringar.");
      }
      setTournaments(data || []);
      if (!activeTournamentId && data?.length) {
        setActiveTournamentId(data[0].id);
      }
      setIsLoading(false);
    };

    loadTournaments();
  }, []);

  useEffect(() => {
    const loadResults = async () => {
      const { data, error } = await supabase.from("mexicana_results").select("*");
      if (error) {
        setErrorMessage(error.message || "Kunde inte hämta historiska resultat.");
        return;
      }
      const grouped = (data || []).reduce((acc, row) => {
        if (!row?.tournament_id) return acc;
        if (!acc[row.tournament_id]) acc[row.tournament_id] = [];
        acc[row.tournament_id].push(row);
        return acc;
      }, {});
      setResultsByTournament(grouped);
    };

    loadResults();
  }, []);

  useEffect(() => {
    if (!activeTournamentId) {
      setParticipants([]);
      setRounds([]);
      return;
    }

    const loadTournamentDetails = async () => {
      const [{ data: participantRows, error: participantError }, { data: roundRows, error: roundError }] =
        await Promise.all([
          supabase
            .from("mexicana_participants")
            .select("profile_id")
            .eq("tournament_id", activeTournamentId),
          supabase
            .from("mexicana_rounds")
            .select("*")
            .eq("tournament_id", activeTournamentId)
            .order("round_number", { ascending: true }),
        ]);

      if (participantError) setErrorMessage(participantError.message);
      if (roundError) setErrorMessage(roundError.message);

      setParticipants(participantRows?.map(row => row.profile_id) || []);
      setRounds(roundRows || []);
    };

    loadTournamentDetails();
  }, [activeTournamentId]);

  const createTournament = async (event) => {
    event.preventDefault();
    if (!newTournament.name.trim()) {
      setErrorMessage("Ange ett namn för turneringen.");
      return;
    }
    if (isGuest || !user?.id) {
      setErrorMessage("Logga in för att skapa en turnering.");
      return;
    }
    setIsSaving(true);
    const { data, error } = await supabase
      .from("mexicana_tournaments")
      .insert({
        name: newTournament.name.trim(),
        scheduled_at: newTournament.scheduled_at || null,
        location: newTournament.location || null,
        score_target: Number(newTournament.score_target) || SCORE_TARGET_DEFAULT,
        tournament_type: newTournament.tournament_type,
        status: "draft",
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      setErrorMessage(error.message);
    } else {
      setTournaments(prev => [data, ...prev]);
      setActiveTournamentId(data.id);
      setParticipants([]);
      setRounds([]);
      setSuccessMessage("Turneringen är skapad.");
    }
    setIsSaving(false);
  };

  const toggleParticipant = (profileId) => {
    if (isGuest || activeTournament?.status === "completed") return;
    setParticipants(prev =>
      prev.includes(profileId) ? prev.filter(id => id !== profileId) : [...prev, profileId]
    );
  };

  const saveRoster = async () => {
    if (!activeTournamentId || isGuest || !user?.id) return;
    if (participants.length < 4 || participants.length > 8) {
      setErrorMessage("Välj 4 till 8 spelare.");
      return;
    }
    setIsSaving(true);
    await supabase.from("mexicana_participants").delete().eq("tournament_id", activeTournamentId);
    const { error } = await supabase.from("mexicana_participants").insert(
      participants.map(profileId => ({
        tournament_id: activeTournamentId,
        profile_id: profileId,
      }))
    );
    if (error) setErrorMessage(error.message);
    else setSuccessMessage("Roster sparad.");
    setIsSaving(false);
  };

  const startTournament = async () => {
    if (!activeTournamentId || isGuest) return;
    setIsSaving(true);
    const { error } = await supabase
      .from("mexicana_tournaments")
      .update({ status: "in_progress" })
      .eq("id", activeTournamentId);
    if (error) setErrorMessage(error.message);
    else {
      setTournaments(prev => prev.map(t => t.id === activeTournamentId ? { ...t, status: "in_progress" } : t));
      setSuccessMessage("Turneringen har startat.");
    }
    setIsSaving(false);
  };

  const handleRecordRound = () => {
    if (!currentSuggestion) return;
    setRecordingRound({
      ...currentSuggestion,
      team1_score: "",
      team2_score: "",
      mode: nextRoundMode,
    });
    setShowOverrideWarning(false);
    setOverrideConfirmed(false);
  };

  const validateRestingRules = (round) => {
    const restCycle = getRestCycle(rounds, participants, round.mode);
    const restingCount = participants.length - 4;

    const activeIds = new Set([...round.team1_ids, ...round.team2_ids]);
    const actualResting = participants.filter(id => !activeIds.has(id));

    let expectedResting;
    if (round.mode === "americano") {
      expectedResting = pickAmericanoRestingPlayers(standings, restCycle, participants, restingCount);
    } else {
      expectedResting = pickMexicanoRestingPlayers(standings, restCycle, participants, restingCount);
    }

    const actualRestingSet = new Set(actualResting);
    return expectedResting.every(id => actualRestingSet.has(id));
  };

  const saveRound = async () => {
    if (!recordingRound || isGuest || !user?.id) return;
    const s1 = Number(recordingRound.team1_score);
    const s2 = Number(recordingRound.team2_score);
    if (!Number.isFinite(s1) || !Number.isFinite(s2)) {
      setErrorMessage("Fyll i poäng för båda lagen.");
      return;
    }

    if (!overrideConfirmed && !validateRestingRules(recordingRound)) {
      setShowOverrideWarning(true);
      return;
    }

    setIsSaving(true);
    const nextRoundNumber = rounds.length + 1;

    const activeIds = new Set([...recordingRound.team1_ids, ...recordingRound.team2_ids]);
    const restingIds = participants.filter(id => !activeIds.has(id));

    const { data, error } = await supabase
      .from("mexicana_rounds")
      .insert({
        tournament_id: activeTournamentId,
        round_number: nextRoundNumber,
        team1_ids: recordingRound.team1_ids,
        team2_ids: recordingRound.team2_ids,
        resting_ids: restingIds,
        team1_score: s1,
        team2_score: s2,
        mode: recordingRound.mode,
      })
      .select()
      .single();

    if (error) setErrorMessage(error.message);
    else {
      setRounds(prev => [...prev, data]);
      setRecordingRound(null);
      setSuccessMessage(`Rond ${nextRoundNumber} sparad.`);
    }
    setIsSaving(false);
  };

  const deleteTournament = async (tournament) => {
    if (!tournament?.id || isGuest || !user?.id) return;
    if (!window.confirm(`Ta bort turneringen "${tournament.name}"?`)) return;
    setIsSaving(true);
    const { error } = await supabase.from("mexicana_tournaments").delete().eq("id", tournament.id);
    if (error) setErrorMessage(error.message);
    else {
      setTournaments(prev => prev.filter(t => t.id !== tournament.id));
      if (activeTournamentId === tournament.id) setActiveTournamentId("");
      setSuccessMessage("Turneringen borttagen.");
    }
    setIsSaving(false);
  };

  const markAbandoned = async () => {
    if (!activeTournamentId || isGuest) return;
    if (!window.confirm("Markera turneringen som avbruten?")) return;
    setIsSaving(true);
    const { error } = await supabase.from("mexicana_tournaments").update({ status: "abandoned" }).eq("id", activeTournamentId);
    if (error) setErrorMessage(error.message);
    else {
      setTournaments(prev => prev.map(t => t.id === activeTournamentId ? { ...t, status: "abandoned" } : t));
      setSuccessMessage("Turneringen avbruten.");
    }
    setIsSaving(false);
  };

  const completeTournament = async () => {
    if (!activeTournament || isGuest) return;
    setIsSaving(true);

    // Sync to matches
    const matchPayload = rounds.map(round => ({
      team1: idsToNames(round.team1_ids, profileMap),
      team2: idsToNames(round.team2_ids, profileMap),
      team1_ids: round.team1_ids,
      team2_ids: round.team2_ids,
      team1_sets: Number(round.team1_score),
      team2_sets: Number(round.team2_score),
      score_type: "points",
      score_target: activeTournament.score_target,
      source_tournament_id: activeTournament.id,
      source_tournament_type: activeTournament.tournament_type || "mexicana",
      team1_serves_first: true,
      created_by: user.id,
    }));

    const { error: matchError } = await supabase.from("matches").insert(matchPayload);
    if (matchError) {
      setErrorMessage(matchError.message);
      setIsSaving(false);
      return;
    }

    const resultsPayload = sortedStandings.map((res, index) => ({
      tournament_id: activeTournament.id,
      profile_id: res.id,
      rank: index + 1,
      points_for: res.pointsFor,
      points_against: res.pointsAgainst,
      matches_played: res.gamesPlayed,
      wins: res.wins,
      losses: res.losses,
    }));

    const { error: resultError } = await supabase.from("mexicana_results").insert(resultsPayload);
    if (resultError) {
      setErrorMessage(resultError.message);
      setIsSaving(false);
      return;
    }

    const { error: tournamentError } = await supabase
      .from("mexicana_tournaments")
      .update({ status: "completed", completed_at: new Date().toISOString(), synced_to_matches: true })
      .eq("id", activeTournament.id);

    if (tournamentError) setErrorMessage(tournamentError.message);
    else {
      setTournaments(prev => prev.map(t => t.id === activeTournament.id ? { ...t, status: "completed", synced_to_matches: true } : t));
      onTournamentSync?.();
      setSuccessMessage("Turneringen slutförd.");
    }
    setIsSaving(false);
  };

  const handleScoreChange = (team, val) => {
    const score = val === "" ? "" : parseInt(val, 10);
    const target = activeTournament?.score_target || SCORE_TARGET_DEFAULT;
    setRecordingRound(prev => {
      const next = { ...prev, [team]: score };
      if (typeof score === 'number' && score >= 0 && score <= target) {
        const otherTeam = team === 'team1_score' ? 'team2_score' : 'team1_score';
        next[otherTeam] = target - score;
      }
      return next;
    });
  };

  const lastRound = rounds.length > 0 ? rounds[rounds.length - 1] : null;

  const handleTeamPlayerChange = (team, index, val) => {
    setRecordingRound(prev => {
      const next = { ...prev };
      const teamKey = team === 1 ? 'team1_ids' : 'team2_ids';
      const newTeamIds = [...next[teamKey]];
      newTeamIds[index] = val;
      next[teamKey] = newTeamIds;
      return next;
    });
  };

  return (
    <section className="page-section mexicana-page">
      <header className="mexicana-header">
        <div>
          <h2>Turneringsläge</h2>
          <p className="muted">Stöd för Americano (fairness) och Mexicano (merit-baserad).</p>
        </div>
        {activeTournament && (
          <span className={`mexicana-status status-${activeTournament.status}`}>
            {getTournamentStatusLabel(activeTournament.status)}
          </span>
        )}
      </header>

      {successMessage && <div className="notice-banner success"><div>{successMessage}</div><button onClick={() => setSuccessMessage("")}>Stäng</button></div>}
      {errorMessage && <div className="notice-banner error"><div>{errorMessage}</div><button onClick={() => setErrorMessage("")}>Stäng</button></div>}

      <div className="mexicana-grid">
        <div className="mexicana-card">
          <h3>Välj eller skapa turnering</h3>
          <select value={activeTournamentId} onChange={e => setActiveTournamentId(e.target.value)}>
            <option value="">-- Ny turnering --</option>
            {tournaments.map(t => (
              <option key={t.id} value={t.id}>{t.name} ({getTournamentStatusLabel(t.status)})</option>
            ))}
          </select>

          {!activeTournamentId && (
            <form className="mexicana-form" onSubmit={createTournament} style={{ marginTop: '1rem' }}>
              <input type="text" placeholder="Namn" value={newTournament.name} onChange={e => setNewTournament({ ...newTournament, name: e.target.value })} disabled={isSaving} />
              <input type="text" placeholder="Plats (valfritt)" value={newTournament.location} onChange={e => setNewTournament({ ...newTournament, location: e.target.value })} disabled={isSaving} />
              <input type="date" value={newTournament.scheduled_at} onChange={e => setNewTournament({ ...newTournament, scheduled_at: e.target.value })} disabled={isSaving} />
              <select value={newTournament.tournament_type} onChange={e => setNewTournament({ ...newTournament, tournament_type: e.target.value })} disabled={isSaving}>
                <option value="americano">Americano</option>
                <option value="mexicano">Mexicano</option>
              </select>
              <select value={newTournament.score_target} onChange={e => setNewTournament({ ...newTournament, score_target: e.target.value })} disabled={isSaving}>
                {POINTS_OPTIONS.map(p => <option key={p} value={p}>{p} poäng</option>)}
              </select>
              <button type="submit" disabled={isSaving}>Skapa</button>
            </form>
          )}
        </div>

        {activeTournament && (
          <div className="mexicana-card">
            <h3>Roster ({participants.length})</h3>
            <div className="mexicana-roster" style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {profiles.map(p => (
                <label key={p.id} className="mexicana-roster-item">
                  <input type="checkbox" checked={participants.includes(p.id)} onChange={() => toggleParticipant(p.id)} disabled={activeTournament.status !== 'draft'} />
                  <span>{getProfileDisplayName(p)}</span>
                </label>
              ))}
            </div>
            {activeTournament.status === 'draft' && (
              <button onClick={saveRoster} disabled={isSaving} style={{ marginTop: '0.5rem' }}>Spara roster</button>
            )}
            {activeTournament.status === 'draft' && participants.length >= 4 && (
              <button onClick={startTournament} disabled={isSaving} className="ghost-button" style={{ marginLeft: '0.5rem' }}>Starta turnering</button>
            )}
          </div>
        )}
      </div>

      {activeTournament?.status === 'in_progress' && (
        <div className="mexicana-grid two-columns">
          <div className="mexicana-card">
            <h3>Spela nästa rond</h3>
            <div className="mode-toggle" style={{ marginBottom: '1rem' }}>
              <button className={nextRoundMode === 'americano' ? 'active' : ''} onClick={() => setNextRoundMode('americano')}>Americano</button>
              <button className={nextRoundMode === 'mexicano' ? 'active' : ''} onClick={() => setNextRoundMode('mexicano')}>Mexicano</button>
            </div>

            {!recordingRound ? (
              <div className="next-suggestion">
                <p><strong>Föreslagen match:</strong></p>
                {currentSuggestion ? (
                  <>
                    <p>{idsToNames(currentSuggestion.team1_ids, profileMap).join(" & ")} vs {idsToNames(currentSuggestion.team2_ids, profileMap).join(" & ")}</p>
                    {currentSuggestion.resting_ids.length > 0 && <p className="muted">Vilar: {idsToNames(currentSuggestion.resting_ids, profileMap).join(", ")}</p>}
                    <button onClick={handleRecordRound}>Starta rond</button>
                  </>
                ) : <p className="muted">Välj minst 4 spelare.</p>}
              </div>
            ) : (
              <div className="recording-form">
                <h4>Registrera resultat (Rond {rounds.length + 1})</h4>
                <p className="muted" style={{ marginBottom: '1rem' }}>Team 1 (vänster) börjar serva.</p>
                <div className="mexicana-round-match">
                  <div className="mexicana-team">
                    <div className="mexicana-team-selector">
                      <select value={recordingRound.team1_ids[0]} onChange={e => handleTeamPlayerChange(1, 0, e.target.value)}>
                        {participants.map(id => <option key={id} value={id}>{profileMap[id]}</option>)}
                      </select>
                      <select value={recordingRound.team1_ids[1]} onChange={e => handleTeamPlayerChange(1, 1, e.target.value)}>
                        {participants.map(id => <option key={id} value={id}>{profileMap[id]}</option>)}
                      </select>
                    </div>
                    <input type="number" value={recordingRound.team1_score} onChange={e => handleScoreChange('team1_score', e.target.value)} placeholder="Poäng" />
                  </div>
                  <span className="vs">vs</span>
                  <div className="mexicana-team">
                    <div className="mexicana-team-selector">
                      <select value={recordingRound.team2_ids[0]} onChange={e => handleTeamPlayerChange(2, 0, e.target.value)}>
                        {participants.map(id => <option key={id} value={id}>{profileMap[id]}</option>)}
                      </select>
                      <select value={recordingRound.team2_ids[1]} onChange={e => handleTeamPlayerChange(2, 1, e.target.value)}>
                        {participants.map(id => <option key={id} value={id}>{profileMap[id]}</option>)}
                      </select>
                    </div>
                    <input type="number" value={recordingRound.team2_score} onChange={e => handleScoreChange('team2_score', e.target.value)} placeholder="Poäng" />
                  </div>
                </div>

                <div className="resting-info" style={{ marginTop: '1rem' }}>
                  <p><strong>Vilar:</strong></p>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {participants.filter(id => !recordingRound.team1_ids.includes(id) && !recordingRound.team2_ids.includes(id)).map(id => (
                      <span key={id} className="resting-badge" style={{ background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: '4px' }}>{profileMap[id]}</span>
                    ))}
                  </div>
                </div>

                {showOverrideWarning && (
                  <div className="notice-banner warning" style={{ marginTop: '1rem' }}>
                    <p>Varning: Valda spelare/vila följer inte reglerna för {recordingRound.mode}. Vill du fortsätta ändå?</p>
                    <button onClick={() => { setOverrideConfirmed(true); setShowOverrideWarning(false); }}>Ja, bekräfta</button>
                    <button className="ghost-button" onClick={() => setRecordingRound(null)}>Avbryt</button>
                  </div>
                )}

                {!showOverrideWarning && (
                  <div style={{ marginTop: '1rem' }}>
                    <button onClick={saveRound} disabled={isSaving}>Spara rond</button>
                    <button onClick={() => setRecordingRound(null)} className="ghost-button" style={{ marginLeft: '0.5rem' }}>Avbryt</button>
                  </div>
                )}
              </div>
            )}

            {lastRound && (
              <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                <h4>Senaste rond (Rond {lastRound.round_number})</h4>
                <p>{idsToNames(lastRound.team1_ids, profileMap).join(" & ")} ({lastRound.team1_score}) - ({lastRound.team2_score}) {idsToNames(lastRound.team2_ids, profileMap).join(" & ")}</p>
                {lastRound.resting_ids?.length > 0 && <p className="muted">Vilade: {idsToNames(lastRound.resting_ids, profileMap).join(", ")}</p>}
              </div>
            )}
          </div>

          <div className="mexicana-card">
            <h3>Poängställning</h3>
            <div className="table-scroll">
              <table className="styled-table">
                <thead>
                  <tr>
                    <th>Plac.</th>
                    <th>Namn</th>
                    <th>Poäng</th>
                    <th>Matcher</th>
                    <th>V/O/F</th>
                    <th>Diff</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedStandings.map((res, i) => (
                    <tr key={res.id}>
                      <td>{i + 1}</td>
                      <td>{profileMap[res.id] || "Okänd"}</td>
                      <td>{res.totalPoints}</td>
                      <td>{res.gamesPlayed}</td>
                      <td>{res.wins}/{res.ties}/{res.losses}</td>
                      <td>{res.pointsFor - res.pointsAgainst}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: '1rem' }}>
               <button onClick={markAbandoned} className="ghost-button danger">Avbryt turnering</button>
               <button onClick={completeTournament} disabled={rounds.length === 0} style={{ marginLeft: '0.5rem' }}>Slutför & synka</button>
            </div>
          </div>
        </div>
      )}

      {activeTournament?.status === 'completed' && (
        <div className="mexicana-card">
          <h3>Turneringen avslutad</h3>
          <p><strong>{activeTournament.name}</strong> slutfördes {formatDate(activeTournament.completed_at)}.</p>
          <div className="table-scroll">
            <table className="styled-table">
              <thead>
                <tr>
                  <th>Plac.</th>
                  <th>Namn</th>
                  <th>Poäng</th>
                  <th>Matcher</th>
                  <th>Diff</th>
                </tr>
              </thead>
              <tbody>
                {sortedStandings.map((res, i) => (
                  <tr key={res.id}>
                    <td>{i + 1}</td>
                    <td>{profileMap[res.id] || "Okänd"}</td>
                    <td>{res.totalPoints}</td>
                    <td>{res.gamesPlayed}</td>
                    <td>{res.pointsFor - res.pointsAgainst}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={() => setActiveTournamentId("")} style={{ marginTop: '1rem' }}>Tillbaka</button>
        </div>
      )}

      <div className="mexicana-card mexicana-history" style={{ marginTop: '2rem' }}>
        <h3>Historik</h3>
        <div className="table-scroll">
          <table className="styled-table">
            <thead>
              <tr>
                <th>Turnering</th>
                <th>Typ</th>
                <th>Status</th>
                <th>Datum</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {tournaments.map(t => (
                <tr key={t.id}>
                  <td>{t.name}</td>
                  <td>{t.tournament_type === 'americano' ? 'Americano' : 'Mexicano'}</td>
                  <td><span className={`mexicana-status status-${t.status} inline`}>{getTournamentStatusLabel(t.status)}</span></td>
                  <td>{formatDate(t.scheduled_at)}</td>
                  <td>
                    <button className="ghost-button" onClick={() => setActiveTournamentId(t.id)}>Visa</button>
                    <button className="ghost-button danger" onClick={() => deleteTournament(t)}>Ta bort</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
