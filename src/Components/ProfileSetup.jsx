import { useState } from "react";
import padelPlaceholder from "../assets/padel-placeholder.svg";
import { supabase } from "../supabaseClient";

export default function ProfileSetup({ user, initialName = "", onComplete }) {
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const avatarStorageKey = user?.id ? `padel-avatar:${user.id}` : null;
  const [avatarUrl, setAvatarUrl] = useState(() =>
    avatarStorageKey ? localStorage.getItem(avatarStorageKey) : null
  );

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file || !avatarStorageKey) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        localStorage.setItem(avatarStorageKey, reader.result);
        setAvatarUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return alert("Spelarnamn krävs.");
    if (!user?.id) return;

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, name: trimmed }, { onConflict: "id" });

    setSaving(false);
    if (error) return alert(error.message);

    onComplete?.({ name: trimmed });
  };

  return (
    <section className="player-section profile-setup">
      <h2>Skapa din profil</h2>
      <p className="muted">
        Välj spelarnamn och lägg till en profilbild för att komma igång.
      </p>

      <form className="profile-setup-form" onSubmit={handleSubmit}>
        <div className="player-header">
          <div className="player-avatar-wrap">
            <img
              className="player-avatar"
              src={avatarUrl || padelPlaceholder}
              alt="Profilbild"
            />
          </div>

          <div className="player-details">
            <label className="form-label">
              Spelarnamn
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Skriv ditt namn"
                required
              />
            </label>

            <label className="file-input">
              Välj profilbild
              <input type="file" accept="image/*" onChange={handleAvatarChange} />
            </label>
          </div>
        </div>

        <button type="submit" disabled={saving}>
          {saving ? "Sparar..." : "Spara och fortsätt"}
        </button>
      </form>
    </section>
  );
}
