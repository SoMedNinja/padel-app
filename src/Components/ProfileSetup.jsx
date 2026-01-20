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
  const [avatarNotice, setAvatarNotice] = useState("");

  const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

  const isAvatarColumnMissing = (error) =>
    error?.message?.includes("avatar_url") && error.message.includes("schema cache");

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file || !avatarStorageKey) return;
    setAvatarNotice("");
    if (!ALLOWED_TYPES.includes(file.type)) {
      setAvatarNotice("Endast JPG, PNG eller WEBP stöds.");
      return;
    }
    if (file.size > MAX_AVATAR_SIZE) {
      setAvatarNotice("Bilden är för stor (max 2 MB).");
      return;
    }

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
      if (user?.id) {
        const { error } = await supabase
          .from("profiles")
          .upsert({ id: user.id, avatar_url: cropped }, { onConflict: "id" });
        if (error && !isAvatarColumnMissing(error)) {
          alert(error.message || "Kunde inte spara profilbilden.");
        }
      }
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

  const removeAvatar = () => {
    if (!avatarStorageKey) return;
    localStorage.removeItem(avatarStorageKey);
    setAvatarUrl(null);
    setPendingAvatar(null);
    setAvatarZoom(1);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return alert("Spelarnamn krävs.");
    if (!user?.id) return;

    setSaving(true);
    const payload = { id: user.id, name: trimmed };
    if (avatarUrl) {
      payload.avatar_url = avatarUrl;
    }
    let { data, error } = await supabase
      .from("profiles")
      .upsert(payload, { onConflict: "id" })
      .select()
      .single();
    if (error && isAvatarColumnMissing(error) && payload.avatar_url) {
      ({ data, error } = await supabase
        .from("profiles")
        .upsert({ id: user.id, name: trimmed }, { onConflict: "id" })
        .select()
        .single());
    }

    setSaving(false);
    if (error) return alert(error.message);

    onComplete?.(data || { name: trimmed, avatar_url: avatarUrl });
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
            {avatarNotice && <p className="inline-alert">{avatarNotice}</p>}
            {avatarUrl && !pendingAvatar && (
              <button type="button" className="ghost-button" onClick={removeAvatar}>
                Ta bort profilbild
              </button>
            )}
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
