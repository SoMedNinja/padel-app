import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import {
  getProfileDisplayName,
  idsToNames,
  makeProfileMap,
} from "../utils/profileMap";
import {
  buildMexicanaResults,
  calculateMexicanaStandings,
  generateMexicanaRounds,
} from "../utils/mexicana";

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

const getScoreLabel = (scoreTarget) =>
  scoreTarget ? `Först till ${scoreTarget} poäng` : "Poängrunda";

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
  });

  const profileMap = useMemo(() => makeProfileMap(profiles), [profiles]);
  const eloMap = useMemo(() => {
    const map = {};
    eloPlayers.forEach(player => {
      map[player.id] = Math.round(player.elo ?? 1000);
    });
    return map;
  }, [eloPlayers]);

  const activeTournament = useMemo(
    () => tournaments.find(tournament => tournament.id === activeTournamentId) || null,
    [tournaments, activeTournamentId]
  );

  const standings = useMemo(() => {
    if (!participants.length) return [];
    return calculateMexicanaStandings(rounds, participants);
  }, [rounds, participants]);

  const results = useMemo(() => buildMexicanaResults(standings), [standings]);

  const rosterTooSmall = participants.length < 4;
  const rosterTooLarge = participants.length > 6;

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

      if (participantError) {
        setErrorMessage(participantError.message || "Kunde inte hämta deltagare.");
      }
      if (roundError) {
        setErrorMessage(roundError.message || "Kunde inte hämta rondinformation.");
      }

      setParticipants(participantRows?.map(row => row.profile_id) || []);
      setRounds(roundRows || []);
    };

    loadTournamentDetails();
  }, [activeTournamentId]);

  const createTournament = async (event) => {
    event.preventDefault();
    if (!newTournament.name.trim()) {
      setErrorMessage("Ange ett namn för turneringen.");
      setSuccessMessage("");
      return;
    }
    if (isGuest || !user?.id) {
      setErrorMessage("Logga in för att skapa en turnering.");
      setSuccessMessage("");
      return;
    }
    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    const { data, error } = await supabase
      .from("mexicana_tournaments")
      .insert({
        name: newTournament.name.trim(),
        scheduled_at: newTournament.scheduled_at || null,
        location: newTournament.location || null,
        score_target: Number(newTournament.score_target) || SCORE_TARGET_DEFAULT,
        status: "draft",
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      setErrorMessage(error.message || "Kunde inte skapa turneringen.");
      setSuccessMessage("");
      setIsSaving(false);
      return;
    }

    setTournaments(prev => [data, ...prev]);
    setActiveTournamentId(data.id);
    setParticipants([]);
    setRounds([]);
    setNewTournament({
      name: "",
      scheduled_at: toDateInput(new Date().toISOString()),
      location: "",
      score_target: SCORE_TARGET_DEFAULT,
    });
    setIsSaving(false);
    setSuccessMessage("Turneringen är skapad.");
  };

  const toggleParticipant = (profileId) => {
    if (isGuest) return;
    setParticipants(prev => {
      if (prev.includes(profileId)) {
        return prev.filter(id => id !== profileId);
      }
      return [...prev, profileId];
    });
  };

  const saveRoster = async () => {
    if (!activeTournamentId) return;
    if (isGuest || !user?.id) {
      setErrorMessage("Logga in för att spara roster.");
      setSuccessMessage("");
      return;
    }
    if (participants.length < 4 || participants.length > 6) {
      setErrorMessage("Mexicana kräver 4, 5 eller 6 spelare.");
      setSuccessMessage("");
      return;
    }
    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    await supabase.from("mexicana_participants").delete().eq("tournament_id", activeTournamentId);

    const { error } = await supabase.from("mexicana_participants").insert(
      participants.map(profileId => ({
        tournament_id: activeTournamentId,
        profile_id: profileId,
      }))
    );

    if (error) {
      setErrorMessage(error.message || "Kunde inte spara roster.");
      setSuccessMessage("");
    } else {
      setSuccessMessage("Roster sparad.");
    }
    setIsSaving(false);
  };

  const generateRounds = async () => {
    if (!activeTournamentId) return;
    if (isGuest || !user?.id) {
      setErrorMessage("Logga in för att skapa rondschema.");
      setSuccessMessage("");
      return;
    }
    if (participants.length < 4 || participants.length > 6) {
      setErrorMessage("Välj 4, 5 eller 6 spelare innan du skapar rondschema.");
      setSuccessMessage("");
      return;
    }

    const { rounds: generatedRounds } = generateMexicanaRounds(participants, eloMap);
    if (!generatedRounds.length) {
      setErrorMessage("Kunde inte skapa rondschema.");
      setSuccessMessage("");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    await supabase.from("mexicana_rounds").delete().eq("tournament_id", activeTournamentId);

    const { data, error } = await supabase.from("mexicana_rounds").insert(
      generatedRounds.map(round => ({
        tournament_id: activeTournamentId,
        round_number: round.roundNumber,
        team1_ids: round.team1Ids,
        team2_ids: round.team2Ids,
        resting_ids: round.restingIds,
      }))
    ).select("*");

    if (error) {
      setErrorMessage(error.message || "Kunde inte spara rondschema.");
      setSuccessMessage("");
      setIsSaving(false);
      return;
    }

    await supabase
      .from("mexicana_tournaments")
      .update({ status: "in_progress" })
      .eq("id", activeTournamentId);

    const sortedRounds = (data || []).sort(
      (a, b) => (a.round_number || 0) - (b.round_number || 0)
    );
    setRounds(sortedRounds);
    setTournaments(prev =>
      prev.map(tournament =>
        tournament.id === activeTournamentId
          ? { ...tournament, status: "in_progress" }
          : tournament
      )
    );
    setIsSaving(false);
    setSuccessMessage("Rondschema skapat.");
  };

  const updateRoundScore = (roundId, key, value) => {
    setRounds(prev =>
      prev.map(round =>
        round.id === roundId ? { ...round, [key]: value === "" ? "" : Number(value) } : round
      )
    );
  };

  const saveRoundScore = async (round) => {
    if (!round?.id) return;
    if (isGuest || !user?.id) {
      setErrorMessage("Logga in för att spara resultat.");
      setSuccessMessage("");
      return;
    }
    if (!Number.isFinite(round.team1_score) || !Number.isFinite(round.team2_score)) {
      setErrorMessage("Fyll i poäng för båda lagen innan du sparar.");
      setSuccessMessage("");
      return;
    }
    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    const { error } = await supabase
      .from("mexicana_rounds")
      .update({
        team1_score: Number(round.team1_score),
        team2_score: Number(round.team2_score),
      })
      .eq("id", round.id);

    if (error) {
      setErrorMessage(error.message || "Kunde inte uppdatera ronden.");
      setSuccessMessage("");
    } else {
      setSuccessMessage(`Rond ${round.round_number} sparad.`);
    }
    setIsSaving(false);
  };

  const resetForNewTournament = () => {
    setActiveTournamentId("");
    setParticipants([]);
    setRounds([]);
    setErrorMessage("");
    setSuccessMessage("Redo att skapa en ny turnering.");
  };

  const deleteTournament = async (tournament) => {
    if (!tournament?.id) return;
    if (isGuest || !user?.id) {
      setErrorMessage("Logga in för att ta bort turneringen.");
      setSuccessMessage("");
      return;
    }
    if (!window.confirm(`Ta bort turneringen "${tournament.name}" och all tillhörande data?`)) {
      return;
    }
    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    const tournamentId = tournament.id;
    const { error: matchError } = await supabase
      .from("matches")
      .delete()
      .eq("source_tournament_id", tournamentId);
    if (matchError) {
      setErrorMessage(matchError.message || "Kunde inte ta bort matcher.");
      setIsSaving(false);
      return;
    }

    const { error: resultError } = await supabase
      .from("mexicana_results")
      .delete()
      .eq("tournament_id", tournamentId);
    if (resultError) {
      setErrorMessage(resultError.message || "Kunde inte ta bort resultat.");
      setIsSaving(false);
      return;
    }

    const { error: roundError } = await supabase
      .from("mexicana_rounds")
      .delete()
      .eq("tournament_id", tournamentId);
    if (roundError) {
      setErrorMessage(roundError.message || "Kunde inte ta bort ronder.");
      setIsSaving(false);
      return;
    }

    const { error: participantError } = await supabase
      .from("mexicana_participants")
      .delete()
      .eq("tournament_id", tournamentId);
    if (participantError) {
      setErrorMessage(participantError.message || "Kunde inte ta bort deltagare.");
      setIsSaving(false);
      return;
    }

    const { error: tournamentError } = await supabase
      .from("mexicana_tournaments")
      .delete()
      .eq("id", tournamentId);
    if (tournamentError) {
      setErrorMessage(tournamentError.message || "Kunde inte ta bort turneringen.");
      setIsSaving(false);
      return;
    }

    setTournaments(prev => prev.filter(item => item.id !== tournamentId));
    setResultsByTournament(prev => {
      const next = { ...prev };
      delete next[tournamentId];
      return next;
    });
    if (activeTournamentId === tournamentId) {
      const nextTournament = tournaments.find(item => item.id !== tournamentId);
      setActiveTournamentId(nextTournament?.id || "");
      setParticipants([]);
      setRounds([]);
    }
    onTournamentSync?.();
    setSuccessMessage("Turneringen är borttagen.");
    setIsSaving(false);
  };

  const markAbandoned = async () => {
    if (!activeTournamentId) return;
    if (isGuest || !user?.id) {
      setErrorMessage("Logga in för att uppdatera turneringen.");
      setSuccessMessage("");
      return;
    }
    if (!window.confirm("Markera turneringen som avbruten?")) return;
    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    const { error } = await supabase
      .from("mexicana_tournaments")
      .update({ status: "abandoned" })
      .eq("id", activeTournamentId);

    if (error) {
      setErrorMessage(error.message || "Kunde inte markera som avbruten.");
      setSuccessMessage("");
    } else {
      setTournaments(prev =>
        prev.map(tournament =>
          tournament.id === activeTournamentId
            ? { ...tournament, status: "abandoned" }
            : tournament
        )
      );
      setSuccessMessage("Turneringen markerad som avbruten.");
    }
    setIsSaving(false);
  };

  const canComplete =
    rounds.length > 0 &&
    rounds.every(round => Number.isFinite(round.team1_score) && Number.isFinite(round.team2_score));

  const completeTournament = async () => {
    if (!activeTournament || !canComplete) return;
    if (activeTournament.synced_to_matches) return;
    if (!user?.id) {
      setErrorMessage("Logga in för att slutföra turneringen.");
      setSuccessMessage("");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    const matchPayload = rounds.map(round => ({
      team1: idsToNames(round.team1_ids, profileMap),
      team2: idsToNames(round.team2_ids, profileMap),
      team1_ids: round.team1_ids,
      team2_ids: round.team2_ids,
      team1_sets: Number(round.team1_score),
      team2_sets: Number(round.team2_score),
      score_type: "points",
      score_target: activeTournament.score_target || SCORE_TARGET_DEFAULT,
      source_tournament_id: activeTournament.id,
      source_tournament_type: "mexicana",
      team1_serves_first: true,
      created_by: user.id,
    }));

    const { error: matchError } = await supabase.from("matches").insert(matchPayload);
    if (matchError) {
      setErrorMessage(matchError.message || "Kunde inte synka matcher.");
      setSuccessMessage("");
      setIsSaving(false);
      return;
    }

    const resultsPayload = results.map(result => ({
      tournament_id: activeTournament.id,
      profile_id: result.id,
      rank: result.rank,
      points_for: result.pointsFor,
      points_against: result.pointsAgainst,
      matches_played: result.matchesPlayed,
      wins: result.wins,
      losses: result.losses,
    }));

    const { error: resultError } = await supabase.from("mexicana_results").insert(resultsPayload);
    if (resultError) {
      setErrorMessage(resultError.message || "Kunde inte spara resultat.");
      setSuccessMessage("");
      setIsSaving(false);
      return;
    }

    const completedAt = new Date().toISOString();
    const { error: tournamentError } = await supabase
      .from("mexicana_tournaments")
      .update({
        status: "completed",
        completed_at: completedAt,
        synced_to_matches: true,
      })
      .eq("id", activeTournament.id);

    if (tournamentError) {
      setErrorMessage(tournamentError.message || "Kunde inte avsluta turneringen.");
      setSuccessMessage("");
    } else {
      setTournaments(prev =>
        prev.map(tournament =>
          tournament.id === activeTournament.id
            ? {
                ...tournament,
                status: "completed",
                completed_at: completedAt,
                synced_to_matches: true,
              }
            : tournament
        )
      );
      setResultsByTournament(prev => ({
        ...prev,
        [activeTournament.id]: resultsPayload,
      }));
      onTournamentSync?.();
      setSuccessMessage("Turneringen är slutförd och synkad.");
    }
    setIsSaving(false);
  };

  const rosterHint = participants.length === 4
    ? "4 spelare: alla spelar varje rond."
    : participants.length === 5
      ? "5 spelare: 1 spelare vilar varje rond."
      : participants.length === 6
        ? "6 spelare: 2 spelare vilar varje rond."
        : "Välj 4, 5 eller 6 spelare för Mexicana.";

  const tournamentOptions = tournaments.map(tournament => ({
    value: tournament.id,
    label: `${tournament.name} (${getTournamentStatusLabel(tournament.status)})`,
  }));

  const rules = [
    "Välj 4, 5 eller 6 spelare och skapa rondschema med roterande partners.",
    "Varje rond spelas till 24 poäng (kan justeras vid start).",
    "Poängen summeras per spelare. Flest poäng vinner.",
    "Om turneringen pausas kan ni återuppta senare – ingen statistik synkas förrän allt är klart.",
    "När sista ronden är ifylld kan du slutföra och synka till historiken/ELO.",
  ];

  const historicalTournaments = tournaments.filter(
    tournament => tournament.status === "completed" || tournament.status === "abandoned"
  );

  const hasSyncedResults =
    activeTournament?.status === "completed" && activeTournament?.synced_to_matches;
  const podium = results.slice(0, 3);

  if (isLoading) {
    return <p className="muted">Laddar Mexicana...</p>;
  }

  return (
    <section className="page-section mexicana-page">
      <header className="mexicana-header">
        <div>
          <h2>Mexicana-turnering</h2>
          <p className="muted">
            Skapa roterande rondschema, följ poängställningen och synka först när turneringen är klar.
          </p>
        </div>
        <div className="mexicana-header-meta">
          {activeTournament && (
            <span className={`mexicana-status status-${activeTournament.status}`}>
              {getTournamentStatusLabel(activeTournament.status)}
            </span>
          )}
        </div>
      </header>

      <div className="mexicana-card mexicana-rules">
        <h3>Regler & process</h3>
        <ul>
          {rules.map(rule => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
        <p className="muted">
          Om turneringen inte blir klar stannar den som "Pågår" eller "Avbruten" och påverkar
          inte leaderboard, badges eller ELO förrän den slutförs.
        </p>
      </div>

      {successMessage && (
        <div className="notice-banner success" role="status">
          <div>{successMessage}</div>
          <button
            type="button"
            className="ghost-button"
            onClick={() => setSuccessMessage("")}
            disabled={isSaving}
          >
            Stäng
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="notice-banner error" role="alert">
          <div>{errorMessage}</div>
          <button type="button" className="ghost-button" onClick={() => setErrorMessage("")}
            disabled={isSaving}
          >
            Stäng
          </button>
        </div>
      )}

      <div className="mexicana-action-bar">
        <button
          type="button"
          className="ghost-button"
          onClick={resetForNewTournament}
          disabled={isSaving || !activeTournament}
        >
          Starta ny turnering
        </button>
        <button
          type="button"
          className="ghost-button"
          onClick={markAbandoned}
          disabled={
            isSaving ||
            isGuest ||
            !activeTournament ||
            activeTournament.status === "completed" ||
            activeTournament.status === "abandoned"
          }
        >
          Avbryt turnering
        </button>
        <button
          type="button"
          onClick={completeTournament}
          disabled={isSaving || isGuest || !activeTournament || !canComplete || activeTournament?.status === "completed"}
        >
          Slutför & synka
        </button>
      </div>

      <div className="mexicana-grid">
        <div className="mexicana-card">
          <h3>Välj turnering</h3>
          {tournaments.length ? (
            <select
              value={activeTournamentId}
              onChange={(event) => setActiveTournamentId(event.target.value)}
            >
              {tournamentOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : (
            <p className="muted">Inga turneringar än. Skapa en ny nedan.</p>
          )}

          <div className="mexicana-divider" />

          <h3>Skapa ny turnering</h3>
          <form className="mexicana-form" onSubmit={createTournament}>
            <label>
              Namn
              <input
                type="text"
                value={newTournament.name}
                onChange={(event) =>
                  setNewTournament(prev => ({ ...prev, name: event.target.value }))
                }
                placeholder="Mexicana onsdag"
                disabled={isSaving || isGuest}
              />
            </label>
            <label>
              Datum
              <input
                type="date"
                value={newTournament.scheduled_at}
                onChange={(event) =>
                  setNewTournament(prev => ({ ...prev, scheduled_at: event.target.value }))
                }
                disabled={isSaving || isGuest}
              />
            </label>
            <label>
              Plats (valfritt)
              <input
                type="text"
                value={newTournament.location}
                onChange={(event) =>
                  setNewTournament(prev => ({ ...prev, location: event.target.value }))
                }
                placeholder="Padelbanan"
                disabled={isSaving || isGuest}
              />
            </label>
            <label>
              Poäng per rond
              <input
                type="number"
                min="1"
                value={newTournament.score_target}
                onChange={(event) =>
                  setNewTournament(prev => ({ ...prev, score_target: event.target.value }))
                }
                disabled={isSaving || isGuest}
              />
            </label>
            <button type="submit" disabled={isSaving || isGuest}>
              Skapa turnering
            </button>
            {isGuest && (
              <p className="muted" style={{ marginTop: 8 }}>
                Gästläge: logga in för att skapa turneringar.
              </p>
            )}
          </form>
        </div>

        <div className="mexicana-card">
          <h3>Turneringsinfo</h3>
          {activeTournament ? (
            <div className="mexicana-info">
              <p>
                <strong>{activeTournament.name}</strong>
              </p>
              <p className="muted">
                {activeTournament.location || "Plats saknas"} • {formatDate(activeTournament.scheduled_at)}
              </p>
              <p className="muted">{getScoreLabel(activeTournament.score_target)}</p>
              {activeTournament.completed_at && (
                <p className="muted">
                  Avslutad: {formatDate(activeTournament.completed_at)}
                </p>
              )}
              {activeTournament.status !== "completed" && (
                <div className="mexicana-actions">
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={markAbandoned}
                    disabled={isSaving || isGuest}
                  >
                    Markera som avbruten
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p className="muted">Välj eller skapa en turnering för att se detaljer.</p>
          )}
        </div>

        <div className="mexicana-card">
          <h3>Roster</h3>
          {activeTournament ? (
            <>
              <p className="muted">Välj 4 till 6 spelare.</p>
              <div className="mexicana-roster">
                {profiles.map(profile => (
                  <label key={profile.id} className="mexicana-roster-item">
                    <input
                      type="checkbox"
                      checked={participants.includes(profile.id)}
                      onChange={() => toggleParticipant(profile.id)}
                      disabled={isSaving || isGuest || activeTournament.status === "completed"}
                    />
                    <span>{getProfileDisplayName(profile)}</span>
                  </label>
                ))}
              </div>
              <div className="mexicana-roster-actions">
                <span className={rosterTooSmall || rosterTooLarge ? "text-error" : "muted"}>
                  {participants.length} spelare valda. {rosterHint}
                </span>
                <button
                  type="button"
                  onClick={saveRoster}
                  disabled={isSaving || isGuest || activeTournament.status === "completed"}
                >
                  Spara roster
                </button>
              </div>
            </>
          ) : (
            <p className="muted">Skapa en turnering först.</p>
          )}
        </div>

        <div className="mexicana-card">
          <h3>Rondschema</h3>
          {activeTournament ? (
            <>
              <p className="muted">Skapa rondschema baserat på roster.</p>
              <button
                type="button"
                onClick={generateRounds}
                disabled={
                  isSaving ||
                  isGuest ||
                  rosterTooSmall ||
                  rosterTooLarge ||
                  activeTournament.status === "completed"
                }
              >
                Skapa rondschema
              </button>
              {rounds.length > 0 && (
                <p className="muted" style={{ marginTop: 8 }}>
                  {rounds.length} ronder • {rosterHint}
                </p>
              )}
            </>
          ) : (
            <p className="muted">Välj en turnering för att skapa rondschema.</p>
          )}
        </div>
      </div>

      <div className="mexicana-grid two-columns">
        <div className="mexicana-card">
          <h3>Rondresultat</h3>
          {rounds.length === 0 ? (
            <p className="muted">Inget rondschema ännu.</p>
          ) : (
            <div className="mexicana-rounds">
              {rounds.map(round => {
                const team1Names = idsToNames(round.team1_ids || [], profileMap).join(" & ");
                const team2Names = idsToNames(round.team2_ids || [], profileMap).join(" & ");
                const restNames = idsToNames(round.resting_ids || [], profileMap).join(", ");
                return (
                  <div key={round.id} className="mexicana-round-card">
                    <div className="mexicana-round-header">
                      <strong>Rond {round.round_number}</strong>
                      {restNames && <span className="muted">Vilar: {restNames}</span>}
                    </div>
                    <div className="mexicana-round-match">
                      <div>
                        <div className="mexicana-team-name">{team1Names}</div>
                        <div className="mexicana-score-inputs">
                          <input
                            type="number"
                            min="0"
                            value={round.team1_score ?? ""}
                            onChange={(event) =>
                              updateRoundScore(round.id, "team1_score", event.target.value)
                            }
                            disabled={activeTournament?.status === "completed" || isGuest}
                          />
                          <span>–</span>
                          <input
                            type="number"
                            min="0"
                            value={round.team2_score ?? ""}
                            onChange={(event) =>
                              updateRoundScore(round.id, "team2_score", event.target.value)
                            }
                            disabled={activeTournament?.status === "completed" || isGuest}
                          />
                        </div>
                      </div>
                      <div className="mexicana-team-name">{team2Names}</div>
                    </div>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => saveRoundScore(round)}
                      disabled={isSaving || isGuest || activeTournament?.status === "completed"}
                    >
                      Spara resultat
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mexicana-card">
          <h3>Poängställning</h3>
          {standings.length === 0 ? (
            <p className="muted">Inga resultat ännu.</p>
          ) : (
            <div className="table-scroll">
              <div className="table-scroll-inner">
                <table className="styled-table">
                  <thead>
                    <tr>
                      <th>Plac.</th>
                      <th>Spelare</th>
                      <th>Spelade</th>
                      <th>Vinster</th>
                      <th>Poäng</th>
                      <th>Poäng diff</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map(result => (
                      <tr key={result.id}>
                        <td>{result.rank}</td>
                        <td>{profileMap[result.id] || "Okänd"}</td>
                        <td>{result.matchesPlayed}</td>
                        <td>{result.wins}</td>
                        <td>{result.pointsFor}</td>
                        <td>{result.pointsDiff}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="mexicana-complete">
            <button
              type="button"
              onClick={completeTournament}
              disabled={isSaving || isGuest || !canComplete || activeTournament?.status === "completed"}
            >
              Slutför & synka till historiken
            </button>
            <p className="muted">
              Synkar endast när alla ronder har poäng och turneringen avslutas.
            </p>
          </div>
        </div>
      </div>

      {hasSyncedResults && (
        <div className="mexicana-card mexicana-results">
          <h3>Resultat</h3>
          {podium.length > 0 ? (
            <div className="mexicana-podium">
              {podium.map((entry, index) => (
                <div key={entry.id} className="mexicana-podium-spot">
                  <span className="mexicana-podium-rank">{index + 1}</span>
                  <strong>{profileMap[entry.id] || "Okänd"}</strong>
                  <span className="muted">{entry.pointsFor} poäng</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">Inga resultat att visa ännu.</p>
          )}
          {results.length > 0 && (
            <div className="table-scroll">
              <div className="table-scroll-inner">
                <table className="styled-table">
                  <thead>
                    <tr>
                      <th>Plac.</th>
                      <th>Spelare</th>
                      <th>Spelade</th>
                      <th>Vinster</th>
                      <th>Poäng</th>
                      <th>Poäng diff</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map(result => (
                      <tr key={result.id}>
                        <td>{result.rank}</td>
                        <td>{profileMap[result.id] || "Okänd"}</td>
                        <td>{result.matchesPlayed}</td>
                        <td>{result.wins}</td>
                        <td>{result.pointsFor}</td>
                        <td>{result.pointsDiff}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mexicana-card mexicana-history">
        <h3>Historik</h3>
        {historicalTournaments.length === 0 ? (
          <p className="muted">Inga avslutade eller avbrutna turneringar än.</p>
        ) : (
          <div className="table-scroll">
            <div className="table-scroll-inner">
              <table className="styled-table">
                <thead>
                  <tr>
                    <th>Turnering</th>
                    <th>Datum</th>
                    <th>Status</th>
                    <th>Spelare</th>
                    <th>Topp 3</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {historicalTournaments.map(tournament => {
                    const tournamentResults = resultsByTournament[tournament.id] || [];
                    const topThree = [...tournamentResults]
                      .sort((a, b) => (a.rank || 0) - (b.rank || 0))
                      .slice(0, 3)
                      .map(result => profileMap[result.profile_id] || "Okänd")
                      .join(", ");
                    return (
                      <tr key={tournament.id}>
                        <td>{tournament.name}</td>
                        <td>{formatDate(tournament.completed_at || tournament.scheduled_at)}</td>
                        <td>
                          <span className={`mexicana-status status-${tournament.status} inline`}>
                            {getTournamentStatusLabel(tournament.status)}
                          </span>
                        </td>
                        <td>{tournamentResults.length || "—"}</td>
                        <td>{topThree || "—"}</td>
                        <td>
                          <div className="mexicana-history-actions">
                            <button
                              type="button"
                              className="ghost-button"
                              onClick={() => setActiveTournamentId(tournament.id)}
                            >
                              Visa
                            </button>
                            <button
                              type="button"
                              className="ghost-button danger"
                              onClick={() => deleteTournament(tournament)}
                              disabled={isSaving || isGuest}
                            >
                              Ta bort
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <p className="muted">
          Välj en avslutad eller avbruten turnering för att se den låsta vyn med resultat och ronder.
        </p>
      </div>
    </section>
  );
}
