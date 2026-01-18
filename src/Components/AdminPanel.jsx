import { useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import { getProfileDisplayName } from "../utils/profileMap";

export default function AdminPanel({ user, profiles = [], onProfileUpdate, onProfileDelete }) {
  const [editNames, setEditNames] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [toggleId, setToggleId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const sortedProfiles = useMemo(() => {
    return [...profiles].sort((a, b) => {
      const nameA = getProfileDisplayName(a).toLowerCase();
      const nameB = getProfileDisplayName(b).toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [profiles]);

  const handleNameChange = (id, value) => {
    setEditNames(prev => ({ ...prev, [id]: value }));
  };

  const saveName = async (profile) => {
    const nextName = (editNames[profile.id] ?? profile.name ?? "").trim();
    if (!nextName) return alert("Ange ett namn.");

    setSavingId(profile.id);
    const { data, error } = await supabase
      .from("profiles")
      .update({ name: nextName })
      .eq("id", profile.id)
      .select();

    setSavingId(null);
    if (error) return alert(error.message);
    if (!data?.length) return alert("Kunde inte uppdatera profilen.");

    onProfileUpdate?.(data[0]);
  };

  const toggleApproval = async (profile) => {
    const nextApproved = profile.is_approved !== true;
    setToggleId(profile.id);
    const { data, error } = await supabase
      .from("profiles")
      .update({ is_approved: nextApproved })
      .eq("id", profile.id)
      .select();

    setToggleId(null);
    if (error) return alert(error.message);
    if (!data?.length) return alert("Kunde inte uppdatera profilen.");

    onProfileUpdate?.(data[0]);
  };

  const deleteProfile = async (profile) => {
    if (profile.id === user?.id) {
      return alert("Du kan inte radera din egen adminprofil.");
    }

    const confirmed = window.confirm(
      `Är du säker på att du vill radera ${getProfileDisplayName(profile)}?`
    );
    if (!confirmed) return;

    setDeleteId(profile.id);
    const { error } = await supabase.from("profiles").delete().eq("id", profile.id);
    setDeleteId(null);
    if (error) return alert(error.message);

    onProfileDelete?.(profile.id);
  };

  return (
    <section className="player-section admin-panel">
      <h2>Admin</h2>
      <p className="muted">
        Godkänn användare innan de får åtkomst till appen. Du kan även uppdatera namn
        eller ta bort profiler.
      </p>

      <div className="admin-table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Namn</th>
              <th>Admin</th>
              <th>Status</th>
              <th>Åtgärder</th>
            </tr>
          </thead>
          <tbody>
            {sortedProfiles.map(profile => {
              const currentName = editNames[profile.id] ?? profile.name ?? "";
              const hasNameChange = currentName.trim() !== (profile.name ?? "");
              const isSelf = profile.id === user?.id;

              return (
                <tr key={profile.id}>
                  <td className="admin-name-cell">
                    <input
                      value={currentName}
                      onChange={(event) => handleNameChange(profile.id, event.target.value)}
                      aria-label={`Namn för ${getProfileDisplayName(profile)}`}
                    />
                    {isSelf && <span className="chip chip-neutral">Du</span>}
                  </td>
                  <td>{profile.is_admin ? "Ja" : "Nej"}</td>
                  <td>
                    <span
                      className={`chip ${profile.is_approved ? "chip-success" : "chip-warning"}`}
                    >
                      {profile.is_approved ? "Godkänd" : "Väntar"}
                    </span>
                  </td>
                  <td>
                    <div className="admin-actions">
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={() => toggleApproval(profile)}
                        disabled={toggleId === profile.id}
                      >
                        {profile.is_approved ? "Återkalla" : "Godkänn"}
                      </button>
                      <button
                        type="button"
                        onClick={() => saveName(profile)}
                        disabled={!hasNameChange || savingId === profile.id}
                      >
                        {savingId === profile.id ? "Sparar..." : "Spara namn"}
                      </button>
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={() => deleteProfile(profile)}
                        disabled={deleteId === profile.id || isSelf}
                      >
                        {deleteId === profile.id ? "Raderar..." : "Radera"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
