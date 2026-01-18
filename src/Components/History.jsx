import { useEffect, useMemo, useState } from "react";
import { getProfileDisplayName, idsToNames, makeProfileMap } from "../utils/profileMap";
import { supabase } from "../supabaseClient";
import { GUEST_ID, GUEST_NAME } from "../utils/guest";

export default function History({ matches = [], profiles = [], user }) {
  const profileMap = useMemo(() => makeProfileMap(profiles), [profiles]);

  const [editingId, setEditingId] = useState(null);
  const [edit, setEdit] = useState(null);
  const [page, setPage] = useState(1);

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

  const selectablePlayers = useMemo(() => {
    const hasGuest = profiles.some(player => player.id === GUEST_ID);
    return hasGuest ? profiles : [...profiles, { id: GUEST_ID, name: GUEST_NAME }];
  }, [profiles]);

  if (!matches.length) return <div>Inga matcher ännu.</div>;

  const startEdit = (m) => {
    setEditingId(m.id);
    setEdit({
      team1_ids: [...(m.team1_ids || [])],
      team2_ids: [...(m.team2_ids || [])],
      team1_sets: String(m.team1_sets ?? ""),
      team2_sets: String(m.team2_sets ?? ""),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEdit(null);
  };

  const canManage = (m) => {
    // Admin/creator-kontroll görs främst i databasen (RLS),
    // men vi döljer knappar i UI om du inte "borde" kunna.
    return user?.id && (m.created_by === user.id || user?.is_admin === true);
  };

  const saveEdit = async (matchId) => {
    if (!edit) return;

    const { error } = await supabase
      .from("matches")
      .update({
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

  const renderTeamSelect = (teamKey, i) => (
    <select
      value={edit?.[teamKey]?.[i] || ""}
      onChange={(e) => {
        const next = { ...edit };
        const arr = [...next[teamKey]];
        arr[i] = e.target.value;
        next[teamKey] = arr;
        setEdit(next);
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
    <div className="history-section">
      <h2>Tidigare matcher</h2>
      <table>
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
            const isEditing = editingId === m.id;

            const teamA = idsToNames(m.team1_ids || [], profileMap).join(" & ");
            const teamB = idsToNames(m.team2_ids || [], profileMap).join(" & ");
            const date = m.created_at?.slice(0, 10);

            return (
              <tr key={m.id}>
                <td>{date}</td>

                <td>
                  {isEditing ? (
                    <>
                      {renderTeamSelect("team1_ids", 0)} {renderTeamSelect("team1_ids", 1)}
                    </>
                  ) : (
                    teamA
                  )}
                </td>

                <td>
                  {isEditing ? (
                    <>
                      {renderTeamSelect("team2_ids", 0)} {renderTeamSelect("team2_ids", 1)}
                    </>
                  ) : (
                    teamB
                  )}
                </td>

                <td>
                  {isEditing ? (
                    <>
                      <input
                        style={{ width: 40 }}
                        value={edit.team1_sets}
                        onChange={(e) => setEdit({ ...edit, team1_sets: e.target.value.replace(/\D/g, "") })}
                      />
                      {" – "}
                      <input
                        style={{ width: 40 }}
                        value={edit.team2_sets}
                        onChange={(e) => setEdit({ ...edit, team2_sets: e.target.value.replace(/\D/g, "") })}
                      />
                    </>
                  ) : (
                    <>
                      {m.team1_sets} – {m.team2_sets}
                    </>
                  )}
                </td>

                <td>
                  {canManage(m) ? (
                    isEditing ? (
                      <>
                        <button onClick={() => saveEdit(m.id)}>Spara</button>{" "}
                        <button onClick={cancelEdit}>Avbryt</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEdit(m)}>Redigera</button>{" "}
                        <button onClick={() => deleteMatch(m.id)}>Radera</button>
                      </>
                    )
                  ) : (
                    <span style={{ opacity: 0.6 }}>—</span>
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
        * Rättigheter styrs av databasen (RLS). Om du inte är admin/skapare kan knappar saknas.
      </p>
    </div>
  );
}
