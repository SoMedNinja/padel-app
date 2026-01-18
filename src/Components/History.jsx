import { useMemo, useState } from "react";
import { idsToNames } from "../utils/profileMap";
import { supabase } from "../supabaseClient";

export default function History({ matches = [], profiles = [], user }) {
  const profileMap = useMemo(() => {
    const m = {};
    profiles.forEach(p => (m[p.id] = p.name));
    return m;
  }, [profiles]);

  const [editingId, setEditingId] = useState(null);
  const [edit, setEdit] = useState(null);

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
      {profiles.map(p => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );

  return (
    <div>
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
          {matches.map(m => {
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

      <p style={{ fontSize: 12, opacity: 0.7 }}>
        * Rättigheter styrs av databasen (RLS). Om du inte är admin/skapare kan knappar saknas.
      </p>
    </div>
  );
}
