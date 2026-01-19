import { useEffect, useMemo, useState } from "react";
import { idsToNames, makeProfileMap } from "../utils/profileMap";
import { supabase } from "../supabaseClient";

export default function History({ matches = [], profiles = [], user }) {
  const profileMap = useMemo(() => makeProfileMap(profiles), [profiles]);

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

  if (!matches.length) return <div>Inga matcher ännu.</div>;

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
            const teamA = idsToNames(m.team1_ids || [], profileMap).join(" & ");
            const teamB = idsToNames(m.team2_ids || [], profileMap).join(" & ");
            const date = m.created_at?.slice(0, 10);

            return (
              <tr key={m.id}>
                <td>{date}</td>

                <td>{teamA}</td>

                <td>{teamB}</td>

                <td>
                  {m.team1_sets} – {m.team2_sets}
                </td>

                <td>
                  {canManage(m) ? (
                    <button onClick={() => deleteMatch(m.id)}>Radera</button>
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
