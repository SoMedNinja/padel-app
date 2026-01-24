import { useEffect, useMemo, useState } from "react";
import { Skeleton } from "@mui/material";
import { toast } from "sonner";
import { supabase } from "../supabaseClient";
import { GUEST_ID, GUEST_NAME } from "../utils/guest";
import { useTournaments, useTournamentDetails, useTournamentResults } from "../hooks/useTournamentData";
import { useQueryClient } from "@tanstack/react-query";
import TournamentBracket from "./TournamentBracket";
import {
  getProfileDisplayName,
  idsToNames,
  makeProfileMap,
} from "../utils/profileMap";
import {
  getTournamentState,
  getRestCycle,
  getNextSuggestion,
  generateAmericanoRounds,
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
  const queryClient = useQueryClient();
  const [activeTournamentId, setActiveTournamentId] = useState("");
  const { data: tournaments = [], isLoading: isLoadingTournaments } = useTournaments();
  const { data: tournamentData, isLoading: isLoadingDetails } = useTournamentDetails(activeTournamentId);
  const { data: resultsByTournament = {} } = useTournamentResults();

  const [participants, setParticipants] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  const isLoading = isLoadingTournaments || (!!activeTournamentId && isLoadingDetails);

  const [newTournament, setNewTournament] = useState({
    name: "",
    scheduled_at: toDateInput(new Date().toISOString()),
    location: "",
    score_target: SCORE_TARGET_DEFAULT,
    tournament_type: "americano",
  });

  const [recordingRound, setRecordingRound] = useState(null);
  const [showPreviousGames, setShowPreviousGames] = useState(false);

  // Add Guest to selectable profiles
  const selectableProfiles = useMemo(() => {
    const hasGuest = profiles.some(p => p.id === GUEST_ID);
    if (hasGuest) return profiles;
    return [...profiles, { id: GUEST_ID, name: GUEST_NAME }];
  }, [profiles]);

  const profileMap = useMemo(() => makeProfileMap(selectableProfiles), [selectableProfiles]);

  const activeTournament = useMemo(
    () => tournaments.find(t => t.id === activeTournamentId) || null,
    [tournaments, activeTournamentId]
  );

  const tournamentMode = activeTournament?.tournament_type || "americano";

  const { standings } = useMemo(() => {
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
    return getNextSuggestion(rounds, participants, tournamentMode);
  }, [rounds, participants, tournamentMode]);

  useEffect(() => {
    if (!activeTournamentId && tournaments.length > 0) {
      setActiveTournamentId(tournaments[0].id);
    }
  }, [tournaments, activeTournamentId]);

  useEffect(() => {
    if (tournamentData) {
      setParticipants(tournamentData.participants);
      setRounds(tournamentData.rounds);
    } else if (!activeTournamentId) {
      setParticipants([]);
      setRounds([]);
    }
  }, [tournamentData, activeTournamentId]);

  const createTournament = async (event) => {
    event.preventDefault();
    if (!newTournament.name.trim()) {
      toast.error("Ange ett namn för turneringen.");
      return;
    }
    if (isGuest || !user?.id) {
      toast.error("Logga in för att skapa en turnering.");
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
      toast.error(error.message);
    } else {
      queryClient.invalidateQueries({ queryKey: ["tournaments"] });
      setActiveTournamentId(data.id);
      toast.success("Turneringen är skapad.");
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
      toast.error("Välj 4 till 8 spelare.");
      return;
    }
    setIsSaving(true);
    await supabase.from("mexicana_participants").delete().eq("tournament_id", activeTournamentId);
    const { error } = await supabase.from("mexicana_participants").insert(
      participants.map(profileId => ({
        tournament_id: activeTournamentId,
        profile_id: profileId === GUEST_ID ? null : profileId,
      }))
    );
    if (error) toast.error(error.message);
    else {
      queryClient.invalidateQueries({ queryKey: ["tournamentDetails", activeTournamentId] });
      toast.success("Roster sparad.");
    }
    setIsSaving(false);
  };

  const startTournament = async () => {
    if (!activeTournamentId || isGuest) return;
    setIsSaving(true);

    if (tournamentMode === 'americano') {
      const generatedRounds = generateAmericanoRounds(participants);
      const roundsPayload = generatedRounds.map(r => ({
        tournament_id: activeTournamentId,
        round_number: r.round_number,
        team1_ids: r.team1_ids.map(id => id === GUEST_ID ? null : id),
        team2_ids: r.team2_ids.map(id => id === GUEST_ID ? null : id),
        resting_ids: r.resting_ids.map(id => id === GUEST_ID ? null : id),
        mode: 'americano',
      }));

      const { error: roundError } = await supabase
        .from("mexicana_rounds")
        .insert(roundsPayload);

      if (roundError) {
        toast.error(roundError.message);
        setIsSaving(false);
        return;
      }
    }

    const { error } = await supabase
      .from("mexicana_tournaments")
      .update({ status: "in_progress" })
      .eq("id", activeTournamentId);

    if (error) {
      toast.error(error.message);
    } else {
      queryClient.invalidateQueries({ queryKey: ["tournaments"] });
      queryClient.invalidateQueries({ queryKey: ["tournamentDetails", activeTournamentId] });
      toast.success("Turneringen har startat.");
    }
    setIsSaving(false);
  };

  const handleRecordRound = () => {
    if (!currentSuggestion) return;
    setRecordingRound({
      ...currentSuggestion,
      team1_score: "",
      team2_score: "",
      mode: tournamentMode,
    });
  };

  const saveRound = async () => {
    if (!recordingRound || isGuest || !user?.id) return;
    const s1 = Number(recordingRound.team1_score);
    const s2 = Number(recordingRound.team2_score);
    if (!Number.isFinite(s1) || !Number.isFinite(s2)) {
      toast.error("Fyll i poäng för båda lagen.");
      return;
    }

    setIsSaving(true);
    const nextRoundNumber = rounds.length + 1;

    const activeIds = new Set([...recordingRound.team1_ids, ...recordingRound.team2_ids]);
    const restingIds = participants.filter(id => !activeIds.has(id));

    // Map GUEST_ID to null for database
    const t1Ids = recordingRound.team1_ids.map(id => id === GUEST_ID ? null : id);
    const t2Ids = recordingRound.team2_ids.map(id => id === GUEST_ID ? null : id);
    const rIds = restingIds.map(id => id === GUEST_ID ? null : id);

    const { error } = await supabase
      .from("mexicana_rounds")
      .insert({
        tournament_id: activeTournamentId,
        round_number: nextRoundNumber,
        team1_ids: t1Ids,
        team2_ids: t2Ids,
        resting_ids: rIds,
        team1_score: s1,
        team2_score: s2,
        mode: recordingRound.mode,
      });

    if (error) toast.error(error.message);
    else {
      queryClient.invalidateQueries({ queryKey: ["tournamentDetails", activeTournamentId] });
      setRecordingRound(null);
      toast.success(`Rond ${nextRoundNumber} sparad.`);
    }
    setIsSaving(false);
  };

  const deleteTournament = async (tournament) => {
    if (!tournament?.id || isGuest || !user?.id) return;
    if (!window.confirm(`Ta bort turneringen "${tournament.name}"?`)) return;
    setIsSaving(true);

    // Explicitly delete matches first to handle FK constraint if migration hasn't run yet
    await supabase.from("matches").delete().eq("source_tournament_id", tournament.id);

    const { error } = await supabase.from("mexicana_tournaments").delete().eq("id", tournament.id);
    if (error) toast.error(error.message);
    else {
      queryClient.invalidateQueries({ queryKey: ["tournaments"] });
      if (activeTournamentId === tournament.id) setActiveTournamentId("");
      toast.success("Turneringen borttagen.");
    }
    setIsSaving(false);
  };

  const markAbandoned = async () => {
    if (!activeTournamentId || isGuest) return;
    if (!window.confirm("Markera turneringen som avbruten?")) return;
    setIsSaving(true);
    const { error } = await supabase.from("mexicana_tournaments").update({ status: "abandoned" }).eq("id", activeTournamentId);
    if (error) toast.error(error.message);
    else {
      queryClient.invalidateQueries({ queryKey: ["tournaments"] });
      toast.success("Turneringen avbruten.");
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
      team1_ids: round.team1_ids.map(id => id === GUEST_ID ? null : id),
      team2_ids: round.team2_ids.map(id => id === GUEST_ID ? null : id),
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
      toast.error(matchError.message);
      setIsSaving(false);
      return;
    }

    const resultsPayload = sortedStandings.map((res, index) => ({
      tournament_id: activeTournament.id,
      profile_id: res.id === GUEST_ID ? null : res.id,
      rank: index + 1,
      points_for: res.pointsFor,
      points_against: res.pointsAgainst,
      matches_played: res.gamesPlayed,
      wins: res.wins,
      losses: res.losses,
    }));

    const { error: resultError } = await supabase.from("mexicana_results").insert(resultsPayload);
    if (resultError) {
      toast.error(resultError.message);
      setIsSaving(false);
      return;
    }

    const { error: tournamentError } = await supabase
      .from("mexicana_tournaments")
      .update({ status: "completed", completed_at: new Date().toISOString(), synced_to_matches: true })
      .eq("id", activeTournament.id);

    if (tournamentError) toast.error(tournamentError.message);
    else {
      queryClient.invalidateQueries({ queryKey: ["tournaments"] });
      queryClient.invalidateQueries({ queryKey: ["tournamentResultsHistory"] });
      onTournamentSync?.();
      toast.success("Turneringen slutförd.");
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

  const updateRoundInDb = async (roundId, s1, s2) => {
    if (isGuest || !user?.id) return;
    setIsSaving(true);
    const { error } = await supabase
      .from("mexicana_rounds")
      .update({
        team1_score: Number(s1),
        team2_score: Number(s2),
      })
      .eq("id", roundId);

    if (error) {
      toast.error(error.message);
    } else {
      queryClient.invalidateQueries({ queryKey: ["tournamentDetails", activeTournamentId] });
      toast.success("Resultat sparat.");
    }
    setIsSaving(false);
  };

  const handleScoreChangeInList = (roundId, team, val) => {
    const score = val === "" ? "" : parseInt(val, 10);
    const target = activeTournament?.score_target || SCORE_TARGET_DEFAULT;

    setRounds(prev => prev.map(r => {
      if (r.id !== roundId) return r;
      const next = { ...r, [team]: score };
      if (typeof score === 'number' && score >= 0 && score <= target) {
        const otherTeam = team === 'team1_score' ? 'team2_score' : 'team1_score';
        next[otherTeam] = target - score;
      }
      return next;
    }));
  };

  return (
    <section className="page-section mexicana-page">
      <header className="mexicana-header">
        <div>
          <h2>Turnering</h2>
          <p className="muted">Stöd för Americano (fairness) och Mexicano (merit-baserad).</p>
        </div>
        {activeTournament && (
          <span className={`mexicana-status status-${activeTournament.status}`}>
            {getTournamentStatusLabel(activeTournament.status)}
          </span>
        )}
      </header>

      {activeTournament && (activeTournament.status === 'in_progress' || activeTournament.status === 'completed') && (
        <TournamentBracket
          rounds={rounds}
          profileMap={profileMap}
          activeTournament={activeTournament}
        />
      )}


      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="mexicana-grid">
            <Skeleton variant="rectangular" height={200} sx={{ borderRadius: '16px' }} />
            <Skeleton variant="rectangular" height={200} sx={{ borderRadius: '16px' }} />
          </div>
          <Skeleton variant="rectangular" height={300} sx={{ borderRadius: '16px' }} />
        </div>
      ) : (
      <>
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
              <div className="muted" style={{ fontSize: '0.8rem', padding: '0 4px' }}>
                {newTournament.tournament_type === 'americano' ? (
                  <>
                    <strong>Americano:</strong> Fokus på rättvisa. Alla spelar med och mot alla så mycket som möjligt. Lagen är förutbestämda. Vinnare är den med flest totalpoäng.
                  </>
                ) : (
                  <>
                    <strong>Mexicano:</strong> Fokus på jämna matcher. Laguppställningar baseras på poäng för att skapa utmanande möten. Vinnare är den med flest totalpoäng.
                  </>
                )}
              </div>
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
              {selectableProfiles.map(p => (
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
            <h3>Spela ronder</h3>
            <p className="muted">Läge: <strong>{tournamentMode === 'americano' ? 'Americano' : 'Mexicano'}</strong></p>

            {tournamentMode === 'mexicano' && (
              <div className="mexicano-flow" style={{ marginBottom: '2rem' }}>
                {!recordingRound ? (
                  <div className="next-suggestion">
                    <p><strong>Föreslagen nästa match:</strong></p>
                    {currentSuggestion ? (
                      <>
                        <p>{idsToNames(currentSuggestion.team1_ids, profileMap).join(" & ")} vs {idsToNames(currentSuggestion.team2_ids, profileMap).join(" & ")}</p>
                        {currentSuggestion.resting_ids.length > 0 && <p className="muted">Vilar: {idsToNames(currentSuggestion.resting_ids, profileMap).join(", ")}</p>}
                        <button onClick={handleRecordRound}>Starta rond {rounds.length + 1}</button>
                      </>
                    ) : <p className="muted">Välj minst 4 spelare.</p>}
                  </div>
                ) : (
                  <div className="recording-form">
                    <h4>Registrera resultat (Rond {rounds.length + 1})</h4>
                    <p className="muted" style={{ marginBottom: '1rem' }}>Lag A (vänster) börjar serva.</p>
                    <div className="mexicana-round-match">
                      <div className="mexicana-team">
                        <div className="mexicana-team-name">{idsToNames(recordingRound.team1_ids, profileMap).join(" & ")}</div>
                        <input type="number" value={recordingRound.team1_score} onChange={e => handleScoreChange('team1_score', e.target.value)} placeholder="Poäng" />
                      </div>
                      <span className="vs">vs</span>
                      <div className="mexicana-team">
                        <div className="mexicana-team-name">{idsToNames(recordingRound.team2_ids, profileMap).join(" & ")}</div>
                        <input type="number" value={recordingRound.team2_score} onChange={e => handleScoreChange('team2_score', e.target.value)} placeholder="Poäng" />
                      </div>
                    </div>
                    <div style={{ marginTop: '1rem' }}>
                      <button onClick={saveRound} disabled={isSaving}>Spara rond</button>
                      <button onClick={() => setRecordingRound(null)} className="ghost-button" style={{ marginLeft: '0.5rem' }}>Avbryt</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {tournamentMode === 'americano' && (
              <div className="americano-flow" style={{ marginBottom: '2rem' }}>
                <p>Alla ronder är förutbestämda. Fyll i poäng allt eftersom ni spelar.</p>
                <div className="mexicana-rounds">
                  {rounds.map(round => {
                    const isPlayed = Number.isFinite(round.team1_score) && Number.isFinite(round.team2_score);
                    return (
                      <div key={round.id} className={`mexicana-round-card ${isPlayed ? 'is-played' : ''}`}>
                         <div className="mexicana-round-header">
                            <strong>Rond {round.round_number}</strong>
                            {round.resting_ids?.length > 0 && <span className="muted">Vilar: {idsToNames(round.resting_ids, profileMap).join(", ")}</span>}
                         </div>
                         <div className="mexicana-round-match">
                            <div className="mexicana-team">
                              <div className="mexicana-team-name">{idsToNames(round.team1_ids, profileMap).join(" & ")}</div>
                              <input
                                type="number"
                                value={round.team1_score ?? ""}
                                onChange={e => handleScoreChangeInList(round.id, 'team1_score', e.target.value)}
                                placeholder="Poäng"
                              />
                            </div>
                            <span className="vs">vs</span>
                            <div className="mexicana-team">
                              <div className="mexicana-team-name">{idsToNames(round.team2_ids, profileMap).join(" & ")}</div>
                              <input
                                type="number"
                                value={round.team2_score ?? ""}
                                onChange={e => handleScoreChangeInList(round.id, 'team2_score', e.target.value)}
                                placeholder="Poäng"
                              />
                            </div>
                         </div>
                         <button
                            className="ghost-button"
                            onClick={() => updateRoundInDb(round.id, round.team1_score, round.team2_score)}
                            disabled={isSaving || !Number.isFinite(round.team1_score) || !Number.isFinite(round.team2_score)}
                          >
                           {isPlayed ? "Uppdatera" : "Spara"}
                         </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {tournamentMode === 'mexicano' && rounds.length > 0 && (
              <div style={{ marginTop: '2rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4>Tidigare matcher ({rounds.length})</h4>
                  <button className="ghost-button" onClick={() => setShowPreviousGames(!showPreviousGames)}>
                    {showPreviousGames ? "Dölj" : "Visa"}
                  </button>
                </div>

                {showPreviousGames && (
                  <div className="mexicana-rounds" style={{ marginTop: '1rem' }}>
                    {[...rounds].reverse().map(round => (
                      <div key={round.id} className="mexicana-round-card">
                        <div className="mexicana-round-header">
                          <strong>Rond {round.round_number}</strong>
                          {round.resting_ids?.length > 0 && <span className="muted">Vilade: {idsToNames(round.resting_ids, profileMap).join(", ")}</span>}
                        </div>
                        <p>{idsToNames(round.team1_ids, profileMap).join(" & ")} ({round.team1_score}) - ({round.team2_score}) {idsToNames(round.team2_ids, profileMap).join(" & ")}</p>
                      </div>
                    ))}
                  </div>
                )}
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
          <h3>Results of finished tournament</h3>
          <p><strong>{activeTournament.name}</strong> slutfördes {formatDate(activeTournament.completed_at)}.</p>

          <div className="mexicana-podium" style={{ marginBottom: '2rem' }}>
            {sortedStandings.slice(0, 3).map((res, i) => (
              <div key={res.id} className="mexicana-podium-spot">
                <span className="mexicana-podium-rank">{i + 1}</span>
                <strong>{profileMap[res.id] || "Okänd"}</strong>
                <span className="muted">{res.totalPoints} poäng</span>
              </div>
            ))}
          </div>

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
          <button onClick={() => setActiveTournamentId("")} style={{ marginTop: '1rem' }}>Tillbaka till alla turneringar</button>
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
      </>
      )}
    </section>
  );
}
