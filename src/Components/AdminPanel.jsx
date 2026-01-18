import { useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import { getProfileDisplayName } from "../utils/profileMap";

export default function AdminPanel({ user, profiles = [], onProfileUpdate, onProfileDelete }) {
  const [editNames, setEditNames] = useState({});
  const [editRoles, setEditRoles] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [toggleId, setToggleId] = useState(null);
  const [adminToggleId, setAdminToggleId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [seedAction, setSeedAction] = useState(null);
  const [seedMessage, setSeedMessage] = useState("");
  const [seedMessageType, setSeedMessageType] = useState("success");

  const sortedProfiles = useMemo(() => {
    return [...profiles].sort((a, b) => {
      const emailA = (a.email || getProfileDisplayName(a)).toLowerCase();
      const emailB = (b.email || getProfileDisplayName(b)).toLowerCase();
      return emailA.localeCompare(emailB);
    });
  }, [profiles]);

  const handleNameChange = (id, value) => {
    setEditNames(prev => ({ ...prev, [id]: value }));
  };

  const handleRoleChange = (id, value) => {
    setEditRoles(prev => ({ ...prev, [id]: value }));
  };

  const saveProfile = async (profile) => {
    const nextName = (editNames[profile.id] ?? profile.name ?? "").trim();
    const nextRole = (editRoles[profile.id] ?? profile.role ?? "").trim();
    if (!nextName) return alert("Ange ett namn.");

    setSavingId(profile.id);
    const { data, error } = await supabase
      .from("profiles")
      .update({ name: nextName, role: nextRole || null })
      .eq("id", profile.id)
      .select()
      .single();

    setSavingId(null);
    if (error) return alert(error.message);

    onProfileUpdate?.(data);
  };

  const toggleAdmin = async (profile) => {
    if (profile.id === user?.id) {
      return alert("Du kan inte ta bort din egen admin-behörighet.");
    }

    const nextAdmin = profile.is_admin !== true;
    setAdminToggleId(profile.id);
    const { data, error } = await supabase
      .from("profiles")
      .update({ is_admin: nextAdmin })
      .eq("id", profile.id)
      .select()
      .single();

    setAdminToggleId(null);
    if (error) return alert(error.message);

    onProfileUpdate?.(data);
  };

  const toggleApproval = async (profile) => {
    const nextApproved = profile.is_approved !== true;
    setToggleId(profile.id);
    const { data, error } = await supabase
      .from("profiles")
      .update({ is_approved: nextApproved })
      .eq("id", profile.id)
      .select()
      .single();

    setToggleId(null);
    if (error) return alert(error.message);

    onProfileUpdate?.(data);
  };

  const deleteProfile = async (profile) => {
    if (profile.id === user?.id) {
      return alert("Du kan inte radera din egen adminprofil.");
    }

    const emailLabel = profile.email || "den här användaren";
    const confirmed = window.confirm(
      `Är du säker på att du vill radera ${emailLabel}?`
    );
    if (!confirmed) return;

    setDeleteId(profile.id);
    const { error } = await supabase.from("profiles").delete().eq("id", profile.id);
    setDeleteId(null);
    if (error) return alert(error.message);

    onProfileDelete?.(profile.id);
  };

  const runSeedMatches = async () => {
    setSeedAction("seed");
    setSeedMessage("");
    setSeedMessageType("success");
    const { error } = await supabase.rpc("seed_matches");
    setSeedAction(null);

    if (error) {
      setSeedMessageType("error");
      setSeedMessage(`Kunde inte skapa testdata: ${error.message}`);
      return;
    }

    setSeedMessageType("success");
    setSeedMessage("Testdata skapad.");
  };

  const clearSeedMatches = async () => {
    const confirmed = window.confirm(
      "Vill du radera testdata? Detta tar bort matcherna som skapats av seed-funktionen."
    );
    if (!confirmed) return;

    setSeedAction("clear");
    setSeedMessage("");
    setSeedMessageType("success");
    const { error } = await supabase.rpc("clear_seed_matches");
    setSeedAction(null);

    if (error) {
      setSeedMessageType("error");
      setSeedMessage(`Kunde inte radera testdata: ${error.message}`);
      return;
    }

    setSeedMessageType("success");
    setSeedMessage("Testdata raderad.");
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
              <th>E-post</th>
              <th>Namn</th>
              <th>Roll</th>
              <th>Admin</th>
              <th>Status</th>
              <th>Åtgärder</th>
            </tr>
          </thead>
          <tbody>
            {sortedProfiles.map(profile => {
              const currentName = editNames[profile.id] ?? profile.name ?? "";
              const currentRole = editRoles[profile.id] ?? profile.role ?? "";
              const hasNameChange = currentName.trim() !== (profile.name ?? "");
              const hasRoleChange = currentRole.trim() !== (profile.role ?? "");
              const hasChanges = hasNameChange || hasRoleChange;
              const isSelf = profile.id === user?.id;
              const emailLabel = profile.email || "Okänd e-post";

              return (
                <tr key={profile.id}>
                  <td className="admin-email-cell">{emailLabel}</td>
                  <td className="admin-name-cell">
                    <input
                      value={currentName}
                      onChange={(event) => handleNameChange(profile.id, event.target.value)}
                      aria-label={`Namn för ${emailLabel}`}
                      placeholder="Spelarnamn"
                    />
                    {isSelf && <span className="chip chip-neutral">Du</span>}
                  </td>
                  <td className="admin-role-cell">
                    <input
                      value={currentRole}
                      onChange={(event) => handleRoleChange(profile.id, event.target.value)}
                      placeholder="Ex: coach"
                      aria-label={`Roll för ${emailLabel}`}
                    />
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
                        onClick={() => toggleAdmin(profile)}
                        disabled={adminToggleId === profile.id || isSelf}
                        className="ghost-button"
                      >
                        {adminToggleId === profile.id
                          ? "Uppdaterar..."
                          : profile.is_admin
                            ? "Ta bort admin"
                            : "Gör admin"}
                      </button>
                      <button
                        type="button"
                        onClick={() => saveProfile(profile)}
                        disabled={!hasChanges || savingId === profile.id}
                      >
                        {savingId === profile.id ? "Sparar..." : "Spara profil"}
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

      <div className="admin-seed">
        <h3>Testdata</h3>
        <p className="muted">
          Kör seed-funktionen för att skapa slumpade matcher. Kräver SQL-funktionerna
          <code>seed_matches</code> och <code>clear_seed_matches</code>.
        </p>
        <div className="admin-seed-actions">
          <button
            type="button"
            onClick={runSeedMatches}
            disabled={seedAction === "seed"}
          >
            {seedAction === "seed" ? "Skapar..." : "Skapa testmatcher"}
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={clearSeedMatches}
            disabled={seedAction === "clear"}
          >
            {seedAction === "clear" ? "Rensar..." : "Rensa testdata"}
          </button>
        </div>
        {seedMessage && (
          <p className={`admin-seed-status ${seedMessageType}`}>{seedMessage}</p>
        )}
      </div>
    </section>
  );
}
