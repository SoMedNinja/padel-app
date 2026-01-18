import { useState } from "react";
import { supabase } from "../supabaseClient";
import Avatar from "./Avatar";
import { cropAvatarImage } from "../utils/avatar";

export default function ProfileSetup({ user, initialName = "", onComplete }) {
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const avatarStorageKey = user?.id ? `padel-avatar:${user.id}` : null;
  const [avatarUrl, setAvatarUrl] = useState(() =>
    avatarStorageKey ? localStorage.getItem(avatarStorageKey) : null
  );
  const [pendingAvatar, setPendingAvatar] = useState(null);
  const [avatarZoom, setAvatarZoom] = useState(1);
  const [savingAvatar, setSavingAvatar] = useState(false);

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file || !avatarStorageKey) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPendingAvatar(reader.result);
        setAvatarZoom(1);
      }
    };
    reader.readAsDataURL(file);
  };

  const saveAvatar = async () => {
    if (!pendingAvatar || !avatarStorageKey) return;
    setSavingAvatar(true);
    try {
      const cropped = await cropAvatarImage(pendingAvatar, avatarZoom);
      localStorage.setItem(avatarStorageKey, cropped);
      setAvatarUrl(cropped);
      setPendingAvatar(null);
    } catch (error) {
      alert(error.message || "Kunde inte beskära bilden.");
    } finally {
      setSavingAvatar(false);
    }
  };

  const cancelAvatar = () => {
    setPendingAvatar(null);
    setAvatarZoom(1);
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
            <Avatar
              className="player-avatar"
              src={avatarUrl}
              name={name || "Profil"}
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

        {pendingAvatar && (
          <div className="avatar-cropper">
            <div
              className="avatar-crop-preview"
              style={{ backgroundImage: `url(${pendingAvatar})`, backgroundSize: `${avatarZoom * 100}%` }}
            />
            <div className="avatar-crop-controls">
              <label className="form-label">
                Zoom
                <input
                  type="range"
                  min="1"
                  max="2.5"
                  step="0.1"
                  value={avatarZoom}
                  onChange={(event) => setAvatarZoom(Number(event.target.value))}
                />
              </label>
              <div className="avatar-crop-actions">
                <button type="button" onClick={saveAvatar} disabled={savingAvatar}>
                  {savingAvatar ? "Sparar..." : "Spara bild"}
                </button>
                <button type="button" className="ghost-button" onClick={cancelAvatar}>
                  Avbryt
                </button>
              </div>
            </div>
          </div>
        )}

        <button type="submit" disabled={saving}>
          {saving ? "Sparar..." : "Spara och fortsätt"}
        </button>
      </form>
    </section>
  );
}
