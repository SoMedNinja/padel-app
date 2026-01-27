import { useState } from "react";
import { supabase } from "../supabaseClient";
import Avatar from "./Avatar";
import {
  cropAvatarImage,
  getStoredAvatar,
  removeStoredAvatar,
  setStoredAvatar
} from "../utils/avatar";
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Stack,
  Slider,
  Container,
  Alert,
} from "@mui/material";
import {
  PhotoCamera as PhotoIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { stripBadgeLabelFromName } from "../utils/profileName";

export default function ProfileSetup({ user, initialName = "", onComplete }) {
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const avatarStorageId = user?.id || null;
  const [avatarUrl, setAvatarUrl] = useState(() =>
    avatarStorageId ? getStoredAvatar(avatarStorageId) : null
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
    if (!file || !avatarStorageId) return;
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
    if (!pendingAvatar || !avatarStorageId) return;
    setSavingAvatar(true);
    try {
      const cropped = await cropAvatarImage(pendingAvatar, avatarZoom);
      setStoredAvatar(avatarStorageId, cropped);
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
    if (!avatarStorageId) return;
    removeStoredAvatar(avatarStorageId);
    setAvatarUrl(null);
    setPendingAvatar(null);
    setAvatarZoom(1);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmed = stripBadgeLabelFromName(name, null);
    // Note for non-coders: we clean the name here so badge tags aren't saved as part of it.
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
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" sx={{ mb: 1, fontWeight: 800 }}>Skapa din profil</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Välj spelarnamn och lägg till en profilbild för att komma igång.
          </Typography>

          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={4}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'center' }}>
                <Avatar
                  sx={{ width: 120, height: 120, fontSize: '3rem' }}
                  src={avatarUrl}
                  name={name || "Profil"}
                />

                <Stack spacing={2} sx={{ flex: 1, minWidth: 200 }}>
                  <TextField
                    fullWidth
                    label="Spelarnamn"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Skriv ditt namn"
                  />

                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="outlined"
                      component="label"
                      startIcon={<PhotoIcon />}
                      size="small"
                    >
                      Välj bild
                      <input type="file" hidden accept="image/*" onChange={handleAvatarChange} />
                    </Button>
                    {avatarUrl && !pendingAvatar && (
                      <Button
                        variant="text"
                        color="error"
                        size="small"
                        startIcon={<DeleteIcon />}
                        onClick={removeAvatar}
                      >
                        Ta bort
                      </Button>
                    )}
                  </Stack>
                  {avatarNotice && <Alert severity="warning" sx={{ py: 0 }}>{avatarNotice}</Alert>}
                </Stack>
              </Box>

              {pendingAvatar && (
                <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 700 }}>Justera bild</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'center' }}>
                    <Box
                      sx={{
                        width: 100,
                        height: 100,
                        borderRadius: '50%',
                        border: 2,
                        borderColor: 'primary.main',
                        backgroundImage: `url(${pendingAvatar})`,
                        backgroundSize: `${avatarZoom * 100}%`,
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat',
                        bgcolor: '#fff'
                      }}
                    />
                    <Box sx={{ flex: 1, minWidth: 200 }}>
                      <Typography variant="caption">Zoom</Typography>
                      <Slider
                        value={avatarZoom}
                        min={1}
                        max={2.5}
                        step={0.1}
                        onChange={(_, val) => setAvatarZoom(val as number)}
                      />
                      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                        <Button
                          variant="contained"
                          size="small"
                          onClick={saveAvatar}
                          disabled={savingAvatar}
                        >
                          Använd
                        </Button>
                        <Button variant="text" size="small" onClick={cancelAvatar}>
                          Avbryt
                        </Button>
                      </Stack>
                    </Box>
                  </Box>
                </Box>
              )}

              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={saving}
                startIcon={<SaveIcon />}
                sx={{ height: 56, fontWeight: 700 }}
              >
                {saving ? "Sparar..." : "Spara och fortsätt"}
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}
