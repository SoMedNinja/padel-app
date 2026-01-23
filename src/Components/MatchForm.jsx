import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../supabaseClient";
import { GUEST_ID, GUEST_NAME } from "../utils/guest";
import { getPlayerWeight } from "../utils/elo";
import { getBadgeLabelById } from "../utils/badges";
import {
  getIdDisplayName,
  getProfileDisplayName,
  idsToNames,
  makeNameToIdMap,
  makeProfileMap,
  resolveTeamIds,
} from "../utils/profileMap";
import ProfileName from "./ProfileName";

const ELO_BASELINE = 1000;
const K = 20;

export default function MatchForm({
  user,
  profiles = [],
  matches = [],
  eloPlayers = [],
}) {
  const [team1, setTeam1] = useState(["", ""]);
  const [team2, setTeam2] = useState(["", ""]);
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [matchSuggestion, setMatchSuggestion] = useState(null);
  const [matchRecap, setMatchRecap] = useState(null);
  const [eveningRecap, setEveningRecap] = useState(null);
  const [recapMode, setRecapMode] = useState("evening");
  const [showRecap, setShowRecap] = useState(true);
  const toastTimeoutRef = useRef(null);

  const selectablePlayers = useMemo(() => {
    const hasGuest = profiles.some(player => player.id === GUEST_ID);
    return hasGuest ? profiles : [...profiles, { id: GUEST_ID, name: GUEST_NAME }];
  }, [profiles]);
  const profileMap = useMemo(() => makeProfileMap(selectablePlayers), [selectablePlayers]);
  const nameToIdMap = useMemo(
    () => makeNameToIdMap(selectablePlayers),
    [selectablePlayers]
  );
  const badgeNameMap = useMemo(() => {
    const map = new Map();
    profiles.forEach(profile => {
      map.set(getProfileDisplayName(profile), profile.featured_badge_id || null);
    });
    return map;
  }, [profiles]);
  const eloMap = useMemo(() => {
    const map = { [GUEST_ID]: ELO_BASELINE };
    eloPlayers.forEach(player => {
      map[player.id] = Math.round(player.elo ?? ELO_BASELINE);
    });
    return map;
  }, [eloPlayers]);
  const playerPool = useMemo(
    () => Array.from(new Set([...team1, ...team2].filter(Boolean))),
    [team1, team2]
  );

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

  const getPlayerOptionLabel = (player) => {
    if (player.id === GUEST_ID) return GUEST_NAME;
    const baseName = getProfileDisplayName(player);
    const badgeLabel = getBadgeLabelById(player.featured_badge_id);
    return badgeLabel ? `${baseName} ${badgeLabel}` : baseName;
  };

  const getBadgeIdForName = (name) => badgeNameMap.get(name) || null;

  const getTeamAverageElo = (team) => {
    const active = team.filter(id => id && id !== GUEST_ID);
    if (!active.length) return ELO_BASELINE;
    const total = active.reduce((sum, id) => sum + (eloMap[id] ?? ELO_BASELINE), 0);
    return total / active.length;
  };

  const getWinProbability = (teamAElo, teamBElo) =>
    1 / (1 + Math.pow(10, (teamBElo - teamAElo) / 400));

  const getFairnessScore = (winProbability) =>
    Math.max(0, Math.min(100, Math.round((1 - Math.abs(0.5 - winProbability) * 2) * 100)));

  const getRotationRounds = (playerCount) => {
    const roundMap = {
      5: 5,
      6: 3,
      7: 7,
      8: 4,
    };
    return roundMap[playerCount] || Math.ceil(playerCount / 2);
  };

  const buildRotationSchedule = (pool) => {
    const players = [...pool];
    const roundCount = getRotationRounds(players.length);
    const targetGames = (4 * roundCount) / players.length;
    const games = Object.fromEntries(players.map(id => [id, 0]));
    const teammateCounts = new Map();
    const opponentCounts = new Map();

    const pairKey = (a, b) => [a, b].sort().join("|");
    const getPairCount = (map, a, b) => map.get(pairKey(a, b)) || 0;
    const addPairCount = (map, a, b) => {
      const key = pairKey(a, b);
      map.set(key, (map.get(key) || 0) + 1);
    };

    const buildCombos = (arr, size) => {
      const result = [];
      const helper = (start, combo) => {
        if (combo.length === size) {
          result.push([...combo]);
          return;
        }
        for (let i = start; i <= arr.length - (size - combo.length); i += 1) {
          combo.push(arr[i]);
          helper(i + 1, combo);
          combo.pop();
        }
      };
      helper(0, []);
      return result;
    };

    const teamSplits = (fourPlayers) => {
      const [p1, p2, p3, p4] = fourPlayers;
      return [
        { teamA: [p1, p2], teamB: [p3, p4] },
        { teamA: [p1, p3], teamB: [p2, p4] },
        { teamA: [p1, p4], teamB: [p2, p3] },
      ];
    };

    const rounds = [];
    const combos = buildCombos(players, 4);

    const pickCandidate = (strictGames) => {
      let best = null;
      combos.forEach(combo => {
        const restPlayers = players.filter(id => !combo.includes(id));
        const teams = teamSplits(combo);
        teams.forEach(teamsOption => {
          if (
            strictGames &&
            [...teamsOption.teamA, ...teamsOption.teamB].some(id => games[id] >= targetGames)
          ) {
            return;
          }

          const teamAElo = getTeamAverageElo(teamsOption.teamA);
          const teamBElo = getTeamAverageElo(teamsOption.teamB);
          const winProbability = getWinProbability(teamAElo, teamBElo);
          const fairness = getFairnessScore(winProbability);

          const teammatePenalty =
            getPairCount(teammateCounts, teamsOption.teamA[0], teamsOption.teamA[1]) +
            getPairCount(teammateCounts, teamsOption.teamB[0], teamsOption.teamB[1]);
          const opponentPenalty = teamsOption.teamA.reduce(
            (sum, aId) =>
              sum +
              teamsOption.teamB.reduce(
                (innerSum, bId) => innerSum + getPairCount(opponentCounts, aId, bId),
                0
              ),
            0
          );
          const gamePenalty = [...teamsOption.teamA, ...teamsOption.teamB].reduce(
            (sum, id) => sum + games[id],
            0
          );
          const restPenalty = restPlayers.reduce(
            (sum, id) => sum + Math.max(0, targetGames - games[id]),
            0
          );
          const score =
            fairness * 2 -
            teammatePenalty * 15 -
            opponentPenalty * 6 -
            gamePenalty * 4 -
            restPenalty * 2;

          if (!best || score > best.score) {
            best = {
              score,
              fairness,
              winProbability,
              teamA: teamsOption.teamA,
              teamB: teamsOption.teamB,
              rest: restPlayers,
            };
          }
        });
      });
      return best;
    };

    for (let round = 0; round < roundCount; round += 1) {
      const candidate = pickCandidate(true) || pickCandidate(false);
      if (!candidate) {
        break;
      }
      rounds.push({
        round: round + 1,
        teamA: candidate.teamA,
        teamB: candidate.teamB,
        rest: candidate.rest,
        fairness: candidate.fairness,
        winProbability: candidate.winProbability,
      });

      [...candidate.teamA, ...candidate.teamB].forEach(id => {
        games[id] += 1;
      });
      addPairCount(teammateCounts, candidate.teamA[0], candidate.teamA[1]);
      addPairCount(teammateCounts, candidate.teamB[0], candidate.teamB[1]);
      candidate.teamA.forEach(aId => {
        candidate.teamB.forEach(bId => {
          addPairCount(opponentCounts, aId, bId);
        });
      });
    }

    const averageFairness = rounds.length
      ? Math.round(rounds.reduce((sum, round) => sum + round.fairness, 0) / rounds.length)
      : 0;

    return { rounds, averageFairness, targetGames };
  };

  const isSameDay = (aDate, bDate) =>
    aDate.getFullYear() === bDate.getFullYear() &&
    aDate.getMonth() === bDate.getMonth() &&
    aDate.getDate() === bDate.getDate();

  const buildEveningRecap = (allMatches, latestMatch) => {
    const now = new Date();
    const normalizedMatches = [...allMatches, latestMatch].map(match => {
      const team1Ids = resolveTeamIds(match.team1_ids, match.team1, nameToIdMap);
      const team2Ids = resolveTeamIds(match.team2_ids, match.team2, nameToIdMap);
      return {
        ...match,
        team1_ids: team1Ids,
        team2_ids: team2Ids,
      };
    });

    const eveningMatches = normalizedMatches.filter(match => {
      const stamp = match.created_at ? new Date(match.created_at) : now;
      return !Number.isNaN(stamp.valueOf()) && isSameDay(stamp, now);
    });

    if (!eveningMatches.length) {
      setEveningRecap(null);
      return;
    }

    const stats = {};
    let totalSets = 0;

    eveningMatches.forEach(match => {
      const team1Ids = match.team1_ids || [];
      const team2Ids = match.team2_ids || [];
      const team1Sets = Number(match.team1_sets || 0);
      const team2Sets = Number(match.team2_sets || 0);
      const team1Won = team1Sets > team2Sets;
      totalSets += team1Sets + team2Sets;

      const recordTeam = (teamIds, didWin, setsFor, setsAgainst) => {
        teamIds.forEach(id => {
          if (!id || id === GUEST_ID) return;
          if (!stats[id]) {
            stats[id] = {
              id,
              name: getIdDisplayName(id, profileMap),
              games: 0,
              wins: 0,
              losses: 0,
              setsFor: 0,
              setsAgainst: 0,
            };
          }
          stats[id].games += 1;
          stats[id].wins += didWin ? 1 : 0;
          stats[id].losses += didWin ? 0 : 1;
          stats[id].setsFor += setsFor;
          stats[id].setsAgainst += setsAgainst;
        });
      };

      recordTeam(team1Ids, team1Won, team1Sets, team2Sets);
      recordTeam(team2Ids, !team1Won, team2Sets, team1Sets);
    });

    const players = Object.values(stats);
    const mvp = players
      .slice()
      .sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        const winPctA = a.games ? a.wins / a.games : 0;
        const winPctB = b.games ? b.wins / b.games : 0;
        if (winPctB !== winPctA) return winPctB - winPctA;
        return b.games - a.games;
      })[0];

    const leaders = players
      .slice()
      .sort((a, b) => b.wins - a.wins)
      .slice(0, 3);

    setEveningRecap({
      dateLabel: now.toLocaleDateString("sv-SE", {
        weekday: "long",
        month: "short",
        day: "numeric",
      }),
      matches: eveningMatches.length,
      totalSets,
      mvp,
      leaders,
    });
  };

  const createRecap = (teamAIds, teamBIds, scoreA, scoreB) => {
    const teamAElo = getTeamAverageElo(teamAIds);
    const teamBElo = getTeamAverageElo(teamBIds);
    const winProbability = getWinProbability(teamAElo, teamBElo);
    const teamAWon = scoreA > scoreB;

    const teamADelta = Math.round(K * ((teamAWon ? 1 : 0) - winProbability));
    const teamBDelta = Math.round(K * ((teamAWon ? 0 : 1) - (1 - winProbability)));

    const mapPlayers = (ids, delta, teamAverageElo) =>
      ids
        .filter(Boolean)
        .map(id => ({
          id,
          name: getIdDisplayName(id, profileMap),
          elo: eloMap[id] ?? ELO_BASELINE,
          delta:
            id === GUEST_ID
              ? 0
              : Math.round(
                  delta * getPlayerWeight(eloMap[id] ?? ELO_BASELINE, teamAverageElo)
                ),
        }));

    const recap = {
      createdAt: new Date().toISOString(),
      scoreline: `${scoreA}–${scoreB}`,
      teamAWon,
      fairness: getFairnessScore(winProbability),
      winProbability,
      teamA: {
        ids: teamAIds,
        averageElo: Math.round(teamAElo),
        delta: teamADelta,
        players: mapPlayers(teamAIds, teamADelta, teamAElo),
      },
      teamB: {
        ids: teamBIds,
        averageElo: Math.round(teamBElo),
        delta: teamBDelta,
        players: mapPlayers(teamBIds, teamBDelta, teamBElo),
      },
    };

    setMatchRecap(recap);
    setShowRecap(true);
  };

  const submit = async e => {
    e.preventDefault();

    if (
      team1.includes("") ||
      team2.includes("") ||
      team1.some(p => team2.includes(p))
    ) {
      showToast("Ogiltiga lag.");
      return;
    }

    const scoreA = Number(a);
    const scoreB = Number(b);
    const team1Label = team1.map(id => getIdDisplayName(id, profileMap)).join(" & ");
    const team2Label = team2.map(id => getIdDisplayName(id, profileMap)).join(" & ");

    const team1IdsForDb = team1.map(id => (id === GUEST_ID ? null : id));
    const team2IdsForDb = team2.map(id => (id === GUEST_ID ? null : id));

    try {
      const { error } = await supabase.from("matches").insert({
        team1: idsToNames(team1, profileMap),
        team2: idsToNames(team2, profileMap),
        team1_ids: team1IdsForDb,
        team2_ids: team2IdsForDb,
        team1_sets: scoreA,
        team2_sets: scoreB,
        team1_serves_first: true,
        created_by: user.id,
      });

      if (error) {
        showToast(error.message);
        return;
      }
    } catch (error) {
      showToast(error.message || "Kunde inte spara matchen.");
      return;
    }

    const newMatch = {
      team1_ids: team1,
      team2_ids: team2,
      team1_sets: scoreA,
      team2_sets: scoreB,
      created_at: new Date().toISOString(),
    };

    createRecap(team1, team2, scoreA, scoreB);
    buildEveningRecap(matches, newMatch);
    setTeam1(["", ""]);
    setTeam2(["", ""]);
    setA("");
    setB("");
    setMatchSuggestion(null);
    setRecapMode("evening");
    setShowRecap(true);
    showToast(`Match sparad: ${team1Label} vs ${team2Label} (${scoreA}–${scoreB})`);
  };

  const suggestTeams = () => {
    const uniquePool = Array.from(new Set(playerPool)).filter(Boolean);

    if (uniquePool.length < 4 || uniquePool.length > 8) {
      showToast("Välj 4–8 unika spelare för smarta lagförslag.");
      return;
    }

    if (uniquePool.length > 4) {
      const rotation = buildRotationSchedule(uniquePool);
      if (!rotation.rounds.length) {
        showToast("Kunde inte skapa rotation. Prova med färre spelare.");
        return;
      }
      const firstRound = rotation.rounds[0];
      setTeam1(firstRound.teamA);
      setTeam2(firstRound.teamB);
      setMatchSuggestion({
        mode: "rotation",
        rounds: rotation.rounds,
        fairness: rotation.averageFairness,
        targetGames: rotation.targetGames,
      });
      showToast("Rotationsschema klart!");
      return;
    }

    const [p1, p2, p3, p4] = uniquePool;
    const options = [
      { teamA: [p1, p2], teamB: [p3, p4] },
      { teamA: [p1, p3], teamB: [p2, p4] },
      { teamA: [p1, p4], teamB: [p2, p3] },
    ];

    const scored = options
      .map(option => {
        const teamAElo = getTeamAverageElo(option.teamA);
        const teamBElo = getTeamAverageElo(option.teamB);
        const winProbability = getWinProbability(teamAElo, teamBElo);
        const fairness = getFairnessScore(winProbability);
        return { ...option, teamAElo, teamBElo, winProbability, fairness };
      })
      .sort((a, b) => b.fairness - a.fairness);

    const best = scored[0];
    setTeam1(best.teamA);
    setTeam2(best.teamB);
    setMatchSuggestion({
      mode: "single",
      fairness: best.fairness,
      winProbability: best.winProbability,
      teamA: best.teamA,
      teamB: best.teamB,
    });
    showToast("Lagförslag klart!");
  };

  const recapSummary = useMemo(() => {
    if (recapMode === "evening") {
      if (!eveningRecap) return "";
      const mvpName = eveningRecap.mvp?.name || "Ingen MVP";
      return `🌙 Kvällsrecap (${eveningRecap.dateLabel}): ${eveningRecap.matches} matcher, ${eveningRecap.totalSets} sets. MVP: ${mvpName}.`;
    }
    if (!matchRecap) return "";
    const teamA = matchRecap.teamA.players.map(player => player.name).join(" & ");
    const teamB = matchRecap.teamB.players.map(player => player.name).join(" & ");
    const winner = matchRecap.teamAWon ? teamA : teamB;
    return `🎾 Matchen: ${teamA} vs ${teamB} (${matchRecap.scoreline}). Vinnare: ${winner}.`;
  }, [eveningRecap, matchRecap, recapMode]);

  const renderPlayerSelect = (team, setTeam, index, teamLabel) => (
    <select
      aria-label={`${teamLabel} spelare ${index + 1}`}
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
          {getPlayerOptionLabel(p)}
        </option>
      ))}
    </select>
  );

  return (
    <div className="match-form-stack">
      <form onSubmit={submit} className="match-form">
        <div className="match-form-title">
          <h3>Ny match</h3>
          <button
            type="button"
            className="ghost-button matchmaker-button"
            onClick={suggestTeams}
          >
            ⚖️ Föreslå lag
          </button>
        </div>

        <div className="match-form-grid">
          <div className="match-form-header">
            <span>Lag A (Börjar med serv)</span>
            <span>Lag B</span>
          </div>

          <div className="match-form-row">
            <div className="match-form-cell">
              {renderPlayerSelect(team1, setTeam1, 0, "Lag A")}
            </div>
            <div className="match-form-cell">
              {renderPlayerSelect(team2, setTeam2, 0, "Lag B")}
            </div>
          </div>

          <div className="match-form-row">
            <div className="match-form-cell">
              {renderPlayerSelect(team1, setTeam1, 1, "Lag A")}
            </div>
            <div className="match-form-cell">
              {renderPlayerSelect(team2, setTeam2, 1, "Lag B")}
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
              aria-label="Set Lag A"
              value={a}
              onChange={e => setA(e.target.value)}
            />
            <span className="match-form-score-separator">–</span>
            <input
              type="number"
              min="0"
              className="match-form-score-input"
              aria-label="Set Lag B"
              value={b}
              onChange={e => setB(e.target.value)}
            />
          </div>
        </div>

        <button type="submit">Spara</button>
        {toastMessage && <div className="toast toast-success">{toastMessage}</div>}
      </form>

      {matchSuggestion && (
        <div className="matchmaker-card">
          <div className="matchmaker-header">
            <strong>Smart Matchmaker</strong>
            <span className="chip chip-success">
              {matchSuggestion.mode === "rotation" ? "Rotation" : "Balansering"}{" "}
              {matchSuggestion.fairness}%
            </span>
          </div>
          <div className="matchmaker-body">
            {matchSuggestion.mode === "rotation" ? (
              <div className="matchmaker-rotation">
                {matchSuggestion.rounds.map(round => (
                  <div key={round.round} className="matchmaker-round">
                    <div className="matchmaker-round-title">Runda {round.round}</div>
                    <div className="matchmaker-round-teams">
                      <div>
                        <span className="muted">Lag A</span>
                        <div className="matchmaker-team">
                          {round.teamA.map(id => getIdDisplayName(id, profileMap)).join(" & ")}
                        </div>
                      </div>
                      <div>
                        <span className="muted">Lag B</span>
                        <div className="matchmaker-team">
                          {round.teamB.map(id => getIdDisplayName(id, profileMap)).join(" & ")}
                        </div>
                      </div>
                    </div>
                    <div className="matchmaker-round-meta muted">
                      Balans {round.fairness}% · Vinstchans Lag A:{" "}
                      {Math.round(round.winProbability * 100)}%
                    </div>
                    <div className="matchmaker-round-meta muted">
                      Vilar: {round.rest.map(id => getIdDisplayName(id, profileMap)).join(", ")}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div>
                  <span className="muted">Lag A</span>
                  <div className="matchmaker-team">
                    {matchSuggestion.teamA.map(id => getIdDisplayName(id, profileMap)).join(" & ")}
                  </div>
                </div>
                <div>
                  <span className="muted">Lag B</span>
                  <div className="matchmaker-team">
                    {matchSuggestion.teamB.map(id => getIdDisplayName(id, profileMap)).join(" & ")}
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="matchmaker-footer muted">
            {matchSuggestion.mode === "rotation"
              ? `Mål: ${matchSuggestion.targetGames} matcher per spelare.`
              : `Förväntad vinstchans Lag A: ${Math.round(
                  matchSuggestion.winProbability * 100
                )}%`}
          </div>
        </div>
      )}

      {showRecap && (matchRecap || eveningRecap) && (
        <div className="recap-card">
          <div className="recap-header">
            <strong>{recapMode === "evening" ? "Kvällsrecap" : "Match‑recap"}</strong>
            <div className="recap-toggle">
              <button
                type="button"
                className={`ghost-button ${recapMode === "evening" ? "is-active" : ""}`}
                onClick={() => setRecapMode("evening")}
                disabled={!eveningRecap}
              >
                Kväll
              </button>
              <button
                type="button"
                className={`ghost-button ${recapMode === "match" ? "is-active" : ""}`}
                onClick={() => setRecapMode("match")}
                disabled={!matchRecap}
              >
                Match
              </button>
            </div>
            {recapMode === "evening" && (
              <button type="button" className="ghost-button" onClick={() => setShowRecap(false)}>
                Stäng
              </button>
            )}
            {recapMode === "match" && matchRecap && (
              <span className="chip chip-neutral">{matchRecap.scoreline}</span>
            )}
          </div>
          <div className="recap-body">
            {recapMode === "evening" && eveningRecap ? (
              <>
                <div className="recap-team recap-summary">
                  <div>
                    <div className="recap-summary-title">{eveningRecap.dateLabel}</div>
                    <div className="muted">
                      {eveningRecap.matches} matcher · {eveningRecap.totalSets} sets
                    </div>
                  </div>
                  <div className="recap-summary-mvp">
                    <span className="chip chip-success">MVP</span>
                    <strong>
                      <ProfileName
                        name={eveningRecap.mvp?.name || "—"}
                        badgeId={getBadgeIdForName(eveningRecap.mvp?.name || "")}
                      />
                    </strong>
                  </div>
                </div>
                <div className="recap-team">
                  <div className="recap-team-header">
                    <span>Topp vinster</span>
                  </div>
                  <div className="recap-team-players">
                    {eveningRecap.leaders.map(player => (
                      <div key={player.id} className="recap-player">
                        <ProfileName
                          name={player.name}
                          badgeId={getBadgeIdForName(player.name)}
                        />
                        <span className="muted">
                          {player.wins} vinster · {player.games} matcher
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : null}
            {recapMode === "match" && matchRecap ? (
              <>
                <div className="recap-team">
                  <div className="recap-team-header">
                    <span>Lag A</span>
                    <span className={matchRecap.teamAWon ? "chip chip-success" : "chip chip-warning"}>
                      {matchRecap.teamAWon ? "Vinst" : "Förlust"}
                    </span>
                  </div>
                  <div className="recap-team-players">
                    {matchRecap.teamA.players.map(player => (
                      <div key={player.id} className="recap-player">
                        <ProfileName
                          name={player.name}
                          badgeId={getBadgeIdForName(player.name)}
                        />
                        <span className="muted">
                          ELO {player.elo} · {player.delta >= 0 ? "+" : ""}{player.delta}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="recap-team">
                  <div className="recap-team-header">
                    <span>Lag B</span>
                    <span className={!matchRecap.teamAWon ? "chip chip-success" : "chip chip-warning"}>
                      {!matchRecap.teamAWon ? "Vinst" : "Förlust"}
                    </span>
                  </div>
                  <div className="recap-team-players">
                    {matchRecap.teamB.players.map(player => (
                      <div key={player.id} className="recap-player">
                        <ProfileName
                          name={player.name}
                          badgeId={getBadgeIdForName(player.name)}
                        />
                        <span className="muted">
                          ELO {player.elo} · {player.delta >= 0 ? "+" : ""}{player.delta}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : null}
          </div>
          <div className="recap-footer">
            {recapMode === "match" && matchRecap ? (
              <div className="muted">
                Fairness: {matchRecap.fairness}% · Förväntad vinstchans Lag A:{" "}
                {Math.round(matchRecap.winProbability * 100)}%
              </div>
            ) : (
              <div className="muted">Dela kvällens höjdpunkter med laget.</div>
            )}
            <button
              type="button"
              className="ghost-button"
              onClick={() => {
                if (!navigator.clipboard) {
                  showToast("Kopiering stöds inte i den här webbläsaren.");
                  return;
                }
                navigator.clipboard.writeText(recapSummary);
                showToast("Recap kopierad!");
              }}
            >
              Kopiera sammanfattning
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
