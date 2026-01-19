import { useEffect, useMemo, useState } from "react";
import {
  getProfileDisplayName,
  idsToNames,
  makeNameToIdMap,
  makeProfileMap,
  resolveTeamNames,
} from "../utils/profileMap";
import { GUEST_ID, GUEST_NAME } from "../utils/guest";
import { supabase } from "../supabaseClient";

const normalizeName = (name) => name?.trim().toLowerCase();
const toDateTimeInput = (value) =>
  value ? new Date(value).toISOString().slice(0, 16) : "";

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

  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState(null);
  const [edit, setEdit] = useState(null);

  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(matches.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedMatches = matches.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

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
      alert("Välj datum och tid.");
      return;
    }

    if (edit.team1_ids.some(id => !id) || edit.team2_ids.some(id => !id)) {
      alert("Välj spelare för alla positioner.");
      return;
    }

    if (hasDuplicatePlayers(edit.team1_ids, edit.team2_ids)) {
      alert("Samma spelare kan inte vara med i båda lagen.");
      return;
    }

    const { error } = await supabase
      .from("matches")
      .update({
        created_at: new Date(edit.created_at).toISOString(),
        team1: idsToNames(edit.team1_ids, profileMap),
        team2: idsToNames(edit.team2_ids, profileMap),
        team1_ids: edit.team1_ids,
        team2_ids: edit.team2_ids,
        team1_sets: Number(edit.team1_sets),
        team2_sets: Number(edit.team2_sets),
      })
      .eq("id", matchId);

    if (error) alert(error.message);
    else cancelEdit();
  };

  const deleteMatch = async (matchId) => {
    if (!window.confirm("Radera matchen?")) return;

    const { error } = await supabase.from("matches").delete().eq("id", matchId);
    if (error) alert(error.message);
  };

  return (
    <div className="history-section table-card">
      <h2>Tidigare matcher</h2>
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
          {paginatedMatches.map(m => {
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
                        value={edit?.team1_sets ?? 0}
                        onChange={(event) =>
                          setEdit(prev => (prev ? { ...prev, team1_sets: event.target.value } : prev))
                        }
                      />
                      <span>–</span>
                      <input
                        type="number"
                        min="0"
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

      <div className="pagination">
        <button
          type="button"
          className="ghost-button"
          onClick={() => setPage(p => Math.max(1, p - 1))}
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
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
        >
          Nästa
        </button>
      </div>

      <p style={{ fontSize: 12, opacity: 0.7 }}>
        * Rättigheter styrs av databasen (RLS). Endast admin kan redigera matcher.
      </p>
    </div>
  );
}
