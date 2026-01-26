import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  getIdDisplayName,
  getProfileDisplayName,
  idsToNames,
  makeNameToIdMap,
  makeProfileMap,
  resolveTeamIds,
  resolveTeamNames,
} from "../utils/profileMap";
import { GUEST_ID, GUEST_NAME } from "../utils/guest";
import { supabase } from "../supabaseClient";
import { Match, Profile } from "../types";
import { calculateElo, ELO_BASELINE } from "../utils/elo";

const normalizeName = (name: string) => name?.trim().toLowerCase();
const toDateTimeInput = (value: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

interface HistoryProps {
  matches?: Match[];
  globalMatches?: Match[];
  profiles?: Profile[];
  user: any;
}

interface EditState {
  created_at: string;
  team1_ids: (string | null)[];
  team2_ids: (string | null)[];
  team1_sets: number | string;
  team2_sets: number | string;
  score_type: string;
  score_target: number | string;
}

interface TeamEntry {
  id: string | null;
  name: string;
}

export default function History({ matches = [], globalMatches = [], profiles = [], user }: HistoryProps) {
  const profileMap = useMemo(() => makeProfileMap(profiles), [profiles]);
  const nameToIdMap = useMemo(() => makeNameToIdMap(profiles), [profiles]);
  const playerOptions = useMemo(() => {
    const options = profiles.map(profile => ({
      id: profile.id,
      name: getProfileDisplayName(profile),
    }));
    return [{ id: GUEST_ID, name: GUEST_NAME }, ...options];
  }, [profiles]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [visibleCount, setVisibleCount] = useState<number>(10);

  useEffect(() => {
    // Note for non-coders: when the match list changes, we reset to the first 10 cards.
    setVisibleCount(10);
  }, [matches.length]);

  if (!matches.length) return <div>Inga matcher ännu.</div>;

  const canDelete = (m: Match) => {
    return user?.id && (m.created_by === user.id || user?.is_admin === true);
  };

  const canEdit = user?.is_admin === true;

  const getTeamIds = (teamIds: (string | null)[], teamNames: string | string[]): (string | null)[] => {
    const ids = Array.isArray(teamIds) ? teamIds : [];
    const names = Array.isArray(teamNames) ? teamNames : [];

    return Array.from({ length: 2 }, (_, index) => {
      if (ids[index] === null) return GUEST_ID;
      if (ids[index]) return ids[index];
      const name = names[index];
      if (!name) return "";
      const key = normalizeName(name);
      return nameToIdMap.get(key) || "";
    });
  };

  const startEdit = (match: Match) => {
    setEditingId(match.id);
    setEdit({
      created_at: toDateTimeInput(match.created_at),
      team1_ids: getTeamIds(match.team1_ids, match.team1),
      team2_ids: getTeamIds(match.team2_ids, match.team2),
      team1_sets: match.team1_sets ?? 0,
      team2_sets: match.team2_sets ?? 0,
      score_type: match.score_type || "sets",
      score_target: match.score_target ?? "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEdit(null);
  };

  const updateTeam = (teamKey: "team1_ids" | "team2_ids", index: number, value: string) => {
    setEdit(prev => {
      if (!prev) return prev;
      const nextTeam = [...prev[teamKey]];
      nextTeam[index] = value;
      return { ...prev, [teamKey]: nextTeam };
    });
  };

  const hasDuplicatePlayers = (team1Ids: (string | null)[], team2Ids: (string | null)[]) => {
    const ids = [...team1Ids, ...team2Ids].filter(Boolean);
    return new Set(ids).size !== ids.length;
  };

  const saveEdit = async (matchId: string) => {
    if (!edit) return;

    if (!edit.created_at) {
      toast.error("Välj datum och tid.");
      return;
    }

    if (edit.team1_ids.some(id => !id) || edit.team2_ids.some(id => !id)) {
      toast.error("Välj spelare för alla positioner.");
      return;
    }

    if (hasDuplicatePlayers(edit.team1_ids, edit.team2_ids)) {
      toast.error("Samma spelare kan inte vara med i båda lagen.");
      return;
    }

    const team1IdsForDb = edit.team1_ids.map(id => (id === GUEST_ID ? null : id));
    const team2IdsForDb = edit.team2_ids.map(id => (id === GUEST_ID ? null : id));

    const { error } = await supabase
      .from("matches")
      .update({
        created_at: new Date(edit.created_at).toISOString(),
        team1: idsToNames(edit.team1_ids as string[], profileMap),
        team2: idsToNames(edit.team2_ids as string[], profileMap),
        team1_ids: team1IdsForDb,
        team2_ids: team2IdsForDb,
        team1_sets: Number(edit.team1_sets),
        team2_sets: Number(edit.team2_sets),
        score_type: edit.score_type || "sets",
        score_target:
          edit.score_type === "points" && edit.score_target !== ""
            ? Number(edit.score_target)
            : null,
      })
      .eq("id", matchId);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Matchen har uppdaterats.");
      cancelEdit();
    }
  };

  const deleteMatch = async (matchId: string) => {
    if (!window.confirm("Radera matchen?")) return;

    const { error } = await supabase.from("matches").delete().eq("id", matchId);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Matchen har raderats.");
    }
  };

  const sortedMatches = useMemo(
    () => [...matches].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [matches]
  );

  const { eloDeltaByMatch, eloRatingByMatch } = useMemo(() => {
    // Note for non-coders: we use the full match list (when provided) so ratings stay global.
    const eloMatches = globalMatches.length ? globalMatches : matches;
    // Note for non-coders: we compute both the Elo change and the updated rating after each match.
    const players = calculateElo(eloMatches, profiles);
    const deltas: Record<string, Record<string, number>> = {};
    const ratingsByMatch: Record<string, Record<string, number>> = {};

    players.forEach(player => {
      player.history.forEach(entry => {
        if (!deltas[entry.matchId]) deltas[entry.matchId] = {};
        if (!ratingsByMatch[entry.matchId]) ratingsByMatch[entry.matchId] = {};

        deltas[entry.matchId][player.id] = entry.delta;
        ratingsByMatch[entry.matchId][player.id] = entry.elo;
      });
    });

    return { eloDeltaByMatch: deltas, eloRatingByMatch: ratingsByMatch };
  }, [globalMatches, matches, profiles]);

  const visibleMatches = sortedMatches.slice(0, visibleCount);
  const canLoadMore = visibleCount < sortedMatches.length;

  const formatScore = (match: Match) => {
    const scoreType = match.score_type || "sets";
    const score = `${match.team1_sets} – ${match.team2_sets}`;
    if (scoreType === "points") {
      const target = match.score_target ? ` (till ${match.score_target})` : "";
      return `${score} poäng${target}`;
    }
    return `${score} set`;
  };

  const buildTeamEntries = (match: Match, teamKey: "team1" | "team2", idKey: "team1_ids" | "team2_ids"): TeamEntry[] => {
    const ids = resolveTeamIds(match[idKey], match[teamKey], nameToIdMap);
    const names = resolveTeamNames(match[idKey], match[teamKey], profileMap);
    // Note for non-coders: we only keep the first two players per team to avoid displaying extra "unknown" slots.
    const trimmedIds = ids.slice(0, 2);
    const trimmedNames = names.slice(0, 2);
    return trimmedIds.map((id, index) => ({
      id,
      name: trimmedNames[index] || getIdDisplayName(id, profileMap),
    }));
  };

  const formatDelta = (delta?: number) => {
    if (typeof delta !== "number") return "—";
    return delta > 0 ? `+${delta}` : `${delta}`;
  };

  const formatElo = (elo?: number) => {
    if (typeof elo !== "number") return "—";
    return Math.round(elo).toString();
  };

  const getDeltaClass = (delta?: number) => {
    if (typeof delta !== "number") return "neutral";
    if (delta > 0) return "positive";
    if (delta < 0) return "negative";
    return "neutral";
  };

  return (
    <div className="history-section">
      <div className="history-header">
        <div>
          <h2>Tidigare matcher</h2>
          <div className="muted">Visar {Math.min(visibleCount, sortedMatches.length)} av {sortedMatches.length} matcher</div>
        </div>
        <div className="history-header-note">
          <span className="muted">Senaste matchen visas överst. Scrolla för att se äldre matcher.</span>
        </div>
      </div>
      <div className="history-card-list">
        {visibleMatches.map(m => {
          const teamAEntries = buildTeamEntries(m, "team1", "team1_ids");
          const teamBEntries = buildTeamEntries(m, "team2", "team2_ids");
          const date = m.created_at?.slice(0, 10);
          const isEditing = editingId === m.id;

          const tournamentType = m.source_tournament_type || "standalone";
          const typeLabel = tournamentType === "standalone" ? "Match" : tournamentType === "mexicano" ? "Mexicano" : tournamentType === "americano" ? "Americano" : tournamentType;

          const matchDeltas = eloDeltaByMatch[m.id] || {};

          return (
            <article className="history-card" key={m.id}>
              <div className="history-card-header">
                <div>
                  <div className="history-card-title">{typeLabel}</div>
                  <div className="history-card-meta">
                    {isEditing ? (
                      <input
                        type="datetime-local"
                        aria-label="Matchdatum och tid"
                        value={edit?.created_at || ""}
                        onChange={(event) =>
                          setEdit(prev => (prev ? { ...prev, created_at: event.target.value } : prev))
                        }
                      />
                    ) : (
                      <span>Datum: {date}</span>
                    )}
                  </div>
                </div>
                <span className="chip chip-neutral">{typeLabel}</span>
              </div>

              <div className="history-card-body">
                <div className="history-card-score">
                  <div className="history-card-label">Resultat</div>
                  {isEditing ? (
                    <div className="history-edit-score">
                      <div className="history-score-type">
                        <label>
                          Typ
                          <select
                            value={edit?.score_type || "sets"}
                            onChange={(event) =>
                              setEdit(prev => (prev ? { ...prev, score_type: event.target.value } : prev))
                            }
                          >
                            <option value="sets">Set</option>
                            <option value="points">Poäng</option>
                          </select>
                        </label>
                        {edit?.score_type === "points" && (
                          <label>
                            Mål
                            <input
                              type="number"
                              min="1"
                              value={edit?.score_target ?? ""}
                              onChange={(event) =>
                                setEdit(prev =>
                                  prev ? { ...prev, score_target: event.target.value } : prev
                                )
                              }
                            />
                          </label>
                        )}
                      </div>
                      <div className="history-score-values">
                        <input
                          type="number"
                          min="0"
                          aria-label="Set Lag A"
                          value={edit?.team1_sets ?? 0}
                          onChange={(event) =>
                            setEdit(prev => (prev ? { ...prev, team1_sets: event.target.value } : prev))
                          }
                        />
                        <span>–</span>
                        <input
                          type="number"
                          min="0"
                          aria-label="Set Lag B"
                          value={edit?.team2_sets ?? 0}
                          onChange={(event) =>
                            setEdit(prev => (prev ? { ...prev, team2_sets: event.target.value } : prev))
                          }
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="history-card-score-value">{formatScore(m)}</div>
                  )}
                </div>

                <div className="history-card-team">
                  <div className="history-card-label">Lag A</div>
                  {isEditing ? (
                    <div className="history-edit-team">
                      {edit?.team1_ids.map((value, index) => (
                        <select
                          key={`team1-${index}`}
                          aria-label={`Lag A spelare ${index + 1}`}
                          value={value || ""}
                          onChange={(event) => updateTeam("team1_ids", index, event.target.value)}
                        >
                          <option value="">Välj spelare</option>
                          {playerOptions.map(option => (
                            <option key={option.id} value={option.id}>
                              {option.name}
                            </option>
                          ))}
                        </select>
                      ))}
                    </div>
                  ) : (
                    <ul className="history-team-list">
                      {teamAEntries.map(entry => {
                        const delta = entry.id ? matchDeltas[entry.id] : undefined;
                        const currentElo = entry.id ? eloRatingByMatch[m.id]?.[entry.id] : undefined;
                        return (
                          <li key={`${m.id}-team1-${entry.name}`}>
                            <div className="history-player-info">
                              <span>{entry.name}</span>
                              {/* Note for non-coders: this label shows the player's rating after this match. */}
                              <span className="history-player-elo muted">ELO efter denna match {formatElo(currentElo)}</span>
                            </div>
                            <span className={`elo-delta ${getDeltaClass(delta)}`}>{formatDelta(delta)}</span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                <div className="history-card-team">
                  <div className="history-card-label">Lag B</div>
                  {isEditing ? (
                    <div className="history-edit-team">
                      {edit?.team2_ids.map((value, index) => (
                        <select
                          key={`team2-${index}`}
                          aria-label={`Lag B spelare ${index + 1}`}
                          value={value || ""}
                          onChange={(event) => updateTeam("team2_ids", index, event.target.value)}
                        >
                          <option value="">Välj spelare</option>
                          {playerOptions.map(option => (
                            <option key={option.id} value={option.id}>
                              {option.name}
                            </option>
                          ))}
                        </select>
                      ))}
                    </div>
                  ) : (
                    <ul className="history-team-list">
                      {teamBEntries.map(entry => {
                        const delta = entry.id ? matchDeltas[entry.id] : undefined;
                        const currentElo = entry.id ? eloRatingByMatch[m.id]?.[entry.id] : undefined;
                        return (
                          <li key={`${m.id}-team2-${entry.name}`}>
                            <div className="history-player-info">
                              <span>{entry.name}</span>
                              {/* Note for non-coders: this is the updated rating; the delta on the right is the change from before. */}
                              <span className="history-player-elo muted">ELO efter denna match {formatElo(currentElo)}</span>
                            </div>
                            <span className={`elo-delta ${getDeltaClass(delta)}`}>{formatDelta(delta)}</span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>

              <div className="history-card-actions">
                {isEditing ? (
                  <div className="history-edit-actions">
                    <button type="button" onClick={() => saveEdit(m.id)}>
                      Spara
                    </button>
                    <button type="button" className="ghost-button" onClick={cancelEdit}>
                      Avbryt
                    </button>
                  </div>
                ) : (
                  <div className="history-actions">
                    {canEdit ? (
                      <button type="button" onClick={() => startEdit(m)}>
                        Redigera
                      </button>
                    ) : null}
                    {canDelete(m) ? (
                      <button type="button" onClick={() => deleteMatch(m.id)}>
                        Radera
                      </button>
                    ) : !canEdit ? (
                      <span style={{ opacity: 0.6 }}>—</span>
                    ) : null}
                  </div>
                )}
              </div>

            </article>
          );
        })}
      </div>

      {canLoadMore ? (
        <div className="history-load-more">
          {/* Note for non-coders: pressing this button reveals 10 more cards below. */}
          <button type="button" onClick={() => setVisibleCount(count => count + 10)}>
            Ladda fler matcher
          </button>
        </div>
      ) : null}

      <p style={{ fontSize: 12, opacity: 0.7 }}>
        * Rättigheter styrs av databasen (RLS). Endast admin kan redigera matcher.
      </p>
    </div>
  );
}
