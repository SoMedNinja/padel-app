import { useEffect, useMemo, useState } from "react";
import {
  getProfileDisplayName,
  idsToNames,
  makeNameToIdMap,
  makeProfileMap,
} from "../utils/profileMap";
import { GUEST_ID, GUEST_NAME } from "../utils/guest";
import { supabase } from "../supabaseClient";

const normalizeName = (name) => name?.trim().toLowerCase();
const toDateTimeInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

export default function History({ matches = [], profiles = [], user }) {
  const profileMap = useMemo(() => makeProfileMap(profiles), [profiles]);
  const nameToIdMap = useMemo(() => makeNameToIdMap(profiles), [profiles]);
  const playerOptions = useMemo(() => {
    const options = profiles.map(profile => ({
      id: profile.id,
      name: getProfileDisplayName(profile),
    }));
    return [{ id: GUEST_ID, name: GUEST_NAME }, ...options];
  }, [profiles]);

  const [editingId, setEditingId] = useState(null);
  const [edit, setEdit] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const totalPages = Math.max(1, Math.ceil(matches.length / pageSize));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  if (!matches.length) return <div>Inga matcher ännu.</div>;

  const canDelete = (m) => {
    return user?.id && (m.created_by === user.id || user?.is_admin === true);
  };

  const canEdit = user?.is_admin === true;

  const getTeamIds = (teamIds, teamNames) => {
    const ids = Array.isArray(teamIds) ? teamIds : [];
    const names = Array.isArray(teamNames) ? teamNames : [];

    return Array.from({ length: 2 }, (_, index) => {
      if (ids[index]) return ids[index];
      const name = names[index];
      if (!name) return "";
      const key = normalizeName(name);
      return nameToIdMap[key] || "";
    });
  };

  const startEdit = (match) => {
    setErrorMessage("");
    setEditingId(match.id);
    setEdit({
      created_at: toDateTimeInput(match.created_at),
      team1_ids: getTeamIds(match.team1_ids, match.team1),
      team2_ids: getTeamIds(match.team2_ids, match.team2),
      team1_sets: match.team1_sets ?? 0,
      team2_sets: match.team2_sets ?? 0,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEdit(null);
    setErrorMessage("");
  };

  const updateTeam = (teamKey, index, value) => {
    setEdit(prev => {
      if (!prev) return prev;
      const nextTeam = [...prev[teamKey]];
      nextTeam[index] = value;
      return { ...prev, [teamKey]: nextTeam };
    });
  };

  const hasDuplicatePlayers = (team1Ids, team2Ids) => {
    const ids = [...team1Ids, ...team2Ids].filter(Boolean);
    return new Set(ids).size !== ids.length;
  };

  const saveEdit = async (matchId) => {
    if (!edit) return;

    if (!edit.created_at) {
      setErrorMessage("Välj datum och tid.");
      return;
    }

    if (edit.team1_ids.some(id => !id) || edit.team2_ids.some(id => !id)) {
      setErrorMessage("Välj spelare för alla positioner.");
      return;
    }

    if (hasDuplicatePlayers(edit.team1_ids, edit.team2_ids)) {
      setErrorMessage("Samma spelare kan inte vara med i båda lagen.");
      return;
    }

    const team1IdsForDb = edit.team1_ids.map(id => (id === GUEST_ID ? null : id));
    const team2IdsForDb = edit.team2_ids.map(id => (id === GUEST_ID ? null : id));

    const { error } = await supabase
      .from("matches")
      .update({
        created_at: new Date(edit.created_at).toISOString(),
        team1: idsToNames(edit.team1_ids, profileMap),
        team2: idsToNames(edit.team2_ids, profileMap),
        team1_ids: team1IdsForDb,
        team2_ids: team2IdsForDb,
        team1_sets: Number(edit.team1_sets),
        team2_sets: Number(edit.team2_sets),
      })
      .eq("id", matchId);

    if (error) {
      setErrorMessage(error.message);
    } else {
      cancelEdit();
    }
  };

  const deleteMatch = async (matchId) => {
    if (!window.confirm("Radera matchen?")) return;

    const { error } = await supabase.from("matches").delete().eq("id", matchId);
    if (error) setErrorMessage(error.message);
  };

  const startIndex = (currentPage - 1) * pageSize;
  const pagedMatches = matches.slice(startIndex, startIndex + pageSize);

  return (
    <div className="history-section table-card">
      <h2>Tidigare matcher</h2>
      {errorMessage && (
        <div className="notice-banner error" role="alert">
          <div>{errorMessage}</div>
          <button type="button" className="ghost-button" onClick={() => setErrorMessage("")}>
            Stäng
          </button>
        </div>
      )}
      <div className="pagination">
        <button
          type="button"
          className="ghost-button"
          onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
          disabled={currentPage === 1}
        >
          Föregående
        </button>
        <span className="pagination-status">
          Sida {currentPage} av {totalPages}
        </span>
        <button
          type="button"
          className="ghost-button"
          onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
          disabled={currentPage === totalPages}
        >
          Nästa
        </button>
      </div>
      <div className="muted" style={{ marginBottom: 12 }}>
        Visar {startIndex + 1}–{Math.min(startIndex + pageSize, matches.length)} av{" "}
        {matches.length} matcher
      </div>
      <div className="table-scroll">
        <div className="table-scroll-inner">
          <table className="styled-table">
          <thead>
            <tr>
              <th>Datum</th>
              <th>Lag A</th>
              <th>Lag B</th>
              <th>Resultat</th>
              <th>Åtgärder</th>
            </tr>
          </thead>

          <tbody>
            {pagedMatches.map(m => {
              const teamAList =
                m.team1_ids?.length ? idsToNames(m.team1_ids, profileMap) : m.team1 || [];
              const teamBList =
                m.team2_ids?.length ? idsToNames(m.team2_ids, profileMap) : m.team2 || [];
              const teamA = teamAList.join(" & ");
              const teamB = teamBList.join(" & ");
              const date = m.created_at?.slice(0, 10);
              const isEditing = editingId === m.id;

              return (
                <tr key={m.id}>
                  <td>
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
                      date
                    )}
                  </td>

                  <td>
                    {isEditing ? (
                      <div className="history-edit-team">
                        {edit?.team1_ids.map((value, index) => (
                          <select
                            key={`team1-${index}`}
                            aria-label={`Lag A spelare ${index + 1}`}
                            value={value}
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
                      teamA
                    )}
                  </td>

                  <td>
                    {isEditing ? (
                      <div className="history-edit-team">
                        {edit?.team2_ids.map((value, index) => (
                          <select
                            key={`team2-${index}`}
                            aria-label={`Lag B spelare ${index + 1}`}
                            value={value}
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
                      teamB
                    )}
                  </td>

                  <td>
                    {isEditing ? (
                      <div className="history-edit-score">
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
                    ) : (
                      `${m.team1_sets} – ${m.team2_sets}`
                    )}
                  </td>

                  <td>
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
                  </td>
                </tr>
              );
            })}
          </tbody>
          </table>
        </div>
      </div>

      <p style={{ fontSize: 12, opacity: 0.7 }}>
        * Rättigheter styrs av databasen (RLS). Endast admin kan redigera matcher.
      </p>
    </div>
  );
}
