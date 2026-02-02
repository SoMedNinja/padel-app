import { useState, useCallback } from "react";
import Avatar from "./Avatar";
import { profileService } from "../services/profileService";
import Cropper, { Area } from "react-easy-crop";
import {
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
  Stepper,
  Step,
  StepLabel,
  Divider,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  PhotoCamera as PhotoIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { stripBadgeLabelFromName } from "../utils/profileName";
import { getCroppedImg } from "../utils/image";

export default function ProfileSetup({ user, initialName = "", onComplete }) {
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const avatarStorageId = user?.id || null;
  const [avatarUrl, setAvatarUrl] = useState(() =>
    avatarStorageId ? getStoredAvatar(avatarStorageId) : null
  );
  const [pendingAvatar, setPendingAvatar] = useState<string | null>(null);
  const [avatarZoom, setAvatarZoom] = useState(1);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [avatarNotice, setAvatarNotice] = useState("");

  const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

  // Note for non-coders: the stepper highlights what's left to finish the profile.
  const cleanedName = stripBadgeLabelFromName(name, null).trim();
  const hasName = Boolean(cleanedName);
  const hasAvatar = Boolean(avatarUrl);
  const activeStep = hasName ? (hasAvatar ? 2 : 1) : 0;
  const steps = ["Ditt namn", "Profilbild", "Klar att köra"];
  const stepDescriptions = [
    "Ditt namn behövs för att visa resultat, statistik och topplistor.",
    "En profilbild gör det lättare för andra att känna igen dig.",
    "Allt ser bra ut! Spara för att börja spela.",
  ];

  const isAvatarColumnMissing = (error) =>
    error?.message?.includes("avatar_url") && error.message.includes("schema cache");

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
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
    if (!pendingAvatar || !avatarStorageId || !croppedAreaPixels) return;
    setSavingAvatar(true);
    try {
      const cropped = await getCroppedImg(pendingAvatar, croppedAreaPixels);
      setStoredAvatar(avatarStorageId, cropped);
      setAvatarUrl(cropped);
      setPendingAvatar(null);
      if (user?.id) {
        try {
          await profileService.upsertProfile({ id: user.id, avatar_url: cropped });
        } catch (error: any) {
          if (!isAvatarColumnMissing(error)) {
            alert(error.message || "Kunde inte spara profilbilden.");
          }
        }
      }
    } catch (error: any) {
      alert(error.message || "Kunde inte beskära bilden.");
    } finally {
      setSavingAvatar(false);
    }
  };

  const cancelAvatar = () => {
    setPendingAvatar(null);
    setAvatarZoom(1);
    setCrop({ x: 0, y: 0 });
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
    const trimmed = name.trim();
    // Note for non-coders: we clean the name here so badge tags aren't saved as part of it.
    if (!trimmed) return alert("Spelarnamn krävs.");
    if (trimmed.length > 50) return alert("Spelarnamn får vara max 50 tecken.");
    if (!user?.id) return;

    setSaving(true);
    const payload: any = { id: user.id, name: trimmed };
    if (avatarUrl) {
      payload.avatar_url = avatarUrl;
    }

    try {
      let data;
      try {
        data = await profileService.upsertProfile(payload);
      } catch (error: any) {
        if (isAvatarColumnMissing(error) && payload.avatar_url) {
          data = await profileService.upsertProfile({ id: user.id, name: trimmed });
        } else {
          throw error;
        }
      }
      onComplete?.(data || { name: trimmed, avatar_url: avatarUrl });
    } catch (error: any) {
      alert(error.message || "Kunde inte spara profilen.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: 4 }}>
          <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 2 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {stepDescriptions[activeStep]}
          </Typography>
          <Divider sx={{ mb: 3 }} />
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
                    helperText={`${name.length}/50`}
                    slotProps={{ htmlInput: { maxLength: 50, "aria-required": "true" } }}
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

              <Dialog open={Boolean(pendingAvatar)} onClose={cancelAvatar} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 800 }}>Justera profilbild</DialogTitle>
                <DialogContent>
                  <Box sx={{ position: 'relative', width: '100%', height: 300, bgcolor: '#333', borderRadius: 2, overflow: 'hidden', mb: 2 }}>
                    {pendingAvatar && (
                      <Cropper
                        image={pendingAvatar}
                        crop={crop}
                        zoom={avatarZoom}
                        aspect={1}
                        onCropChange={setCrop}
                        onZoomChange={setAvatarZoom}
                        onCropComplete={onCropComplete}
                        cropShape="round"
                        showGrid={false}
                      />
                    )}
                  </Box>
                  <Typography variant="caption" color="text.secondary">Zoom</Typography>
                  <Slider
                    value={avatarZoom}
                    min={1}
                    max={3}
                    step={0.1}
                    onChange={(_, val) => setAvatarZoom(val as number)}
                  />
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                  <Button onClick={cancelAvatar} color="inherit">Avbryt</Button>
                  <Button
                    variant="contained"
                    onClick={saveAvatar}
                    disabled={savingAvatar}
                    startIcon={savingAvatar ? <CircularProgress size={16} color="inherit" /> : null}
                  >
                    Använd bild
                  </Button>
                </DialogActions>
              </Dialog>

              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={saving}
                startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
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
