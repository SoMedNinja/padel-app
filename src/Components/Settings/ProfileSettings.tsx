import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Box,
  Typography,
  Button,
  TextField,
  Stack,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Slider,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText
} from "@mui/material";
import {
  Edit as EditIcon,
  PhotoCamera as PhotoIcon,
  Delete as DeleteIcon,
  CameraAlt as CameraIcon,
  MoreHoriz as MoreIcon
} from "@mui/icons-material";
import Cropper, { Area } from "react-easy-crop";
import Avatar from "../Avatar";
import { Profile } from "../../types";
import { profileService } from "../../services/profileService";
import {
  getStoredAvatar,
  removeStoredAvatar,
  setStoredAvatar,
  getCroppedImg
} from "../../utils/avatar";
import { getProfileDisplayName } from "../../utils/profileMap";
import { stripBadgeLabelFromName } from "../../utils/profileName";

interface ProfileSettingsProps {
  user: any;
  profile: Profile | undefined;
  onProfileUpdate?: (profile: Profile) => void;
}

export default function ProfileSettings({
  user,
  profile,
  onProfileUpdate,
}: ProfileSettingsProps) {
  const playerName = profile
    ? getProfileDisplayName(profile)
    : user?.email || "Din profil";

  const [isEditingName, setIsEditingName] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [editedName, setEditedName] = useState(playerName);

  // Anchor for avatar menu
  const [avatarMenuAnchor, setAvatarMenuAnchor] = useState<null | HTMLElement>(null);

  useEffect(() => {
    setEditedName(playerName);
  }, [playerName]);

  const handleNameSave = async () => {
    if (!user?.id) return;
    const cleanedName = stripBadgeLabelFromName(editedName, profile?.featured_badge_id);
    if (!cleanedName) {
      toast.error("Spelarnamn krävs.");
      return;
    }
    setIsSavingName(true);
    try {
      const data = await profileService.updateProfile(user.id, { name: cleanedName });
      setIsEditingName(false);
      onProfileUpdate?.(data);
      toast.success("Namnet har uppdaterats!");
    } catch (error: any) {
      toast.error(error.message || "Kunde inte uppdatera namnet.");
    } finally {
      setIsSavingName(false);
    }
  };

  const avatarStorageId = user?.id || null;
  const [avatarUrl, setAvatarUrl] = useState<string | null>(() =>
    avatarStorageId ? getStoredAvatar(avatarStorageId) : null
  );
  const [pendingAvatar, setPendingAvatar] = useState<string | null>(null);
  const [avatarZoom, setAvatarZoom] = useState<number>(1);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [savingAvatar, setSavingAvatar] = useState<boolean>(false);

  useEffect(() => {
    if (!avatarStorageId || !user?.id) return;
    const stored = getStoredAvatar(avatarStorageId);
    const serverAvatar = profile?.avatar_url || null;

    if (serverAvatar) {
      if (stored !== serverAvatar) {
        setStoredAvatar(avatarStorageId, serverAvatar);
      }
      setAvatarUrl(serverAvatar);
      return;
    }

    if (stored) {
      setAvatarUrl(stored);
      // Sync local storage to DB if missing
      profileService.updateProfile(user.id, { avatar_url: stored })
        .then((data) => {
          if (data) onProfileUpdate?.(data);
        })
        .catch(err => console.error("Failed to sync avatar to DB", err));
    }
  }, [avatarStorageId, profile?.avatar_url, user?.id, onProfileUpdate]);

  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !avatarStorageId) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPendingAvatar(reader.result);
        setAvatarZoom(1);
      }
    };
    reader.readAsDataURL(file);
    setAvatarMenuAnchor(null); // Close menu
    // Reset file input value
    event.target.value = '';
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
          const data = await profileService.updateProfile(user.id, { avatar_url: cropped });
          onProfileUpdate?.(data);
          toast.success("Profilbilden har sparats!");
        } catch (error: any) {
          toast.error(error.message || "Kunde inte spara profilbilden.");
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Kunde inte beskära bilden.");
    } finally {
      setSavingAvatar(false);
    }
  };

  const cancelAvatar = () => {
    setPendingAvatar(null);
    setAvatarZoom(1);
    setCrop({ x: 0, y: 0 });
  };

  const resetAvatar = async () => {
    if (!avatarStorageId) return;
    if (!window.confirm("Är du säker på att du vill återställa din profilbild?")) return;

    removeStoredAvatar(avatarStorageId);
    setAvatarUrl(null);
    setPendingAvatar(null);
    setAvatarMenuAnchor(null); // Close menu

    if (user?.id) {
      try {
        const data = await profileService.updateProfile(user.id, { avatar_url: null });
        onProfileUpdate?.(data);
        toast.success("Profilbilden har återställts.");
      } catch (error: any) {
        toast.error(error.message || "Kunde inte återställa profilbilden.");
      }
    }
  };

  return (
    <>
      <Stack spacing={3}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar
            sx={{ width: 64, height: 64, fontSize: '1.5rem' }}
            src={avatarUrl}
            name={playerName}
          />

          <Box>
            <Button
              variant="outlined"
              size="small"
              startIcon={<CameraIcon />}
              onClick={(e) => setAvatarMenuAnchor(e.currentTarget)}
            >
              Redigera bild
            </Button>
            <Menu
              anchorEl={avatarMenuAnchor}
              open={Boolean(avatarMenuAnchor)}
              onClose={() => setAvatarMenuAnchor(null)}
            >
              <MenuItem component="label">
                <ListItemIcon><PhotoIcon fontSize="small" /></ListItemIcon>
                <ListItemText>Välj ny bild</ListItemText>
                <input type="file" hidden accept="image/*" onChange={handleAvatarChange} />
              </MenuItem>
              <MenuItem onClick={resetAvatar} sx={{ color: 'error.main' }}>
                <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
                <ListItemText>Ta bort bild</ListItemText>
              </MenuItem>
            </Menu>
          </Box>
        </Box>

        {isEditingName ? (
          <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
            <TextField
              size="small"
              label="Spelarnamn"
              fullWidth
              value={editedName}
              onChange={(e) => {
                const val = e.target.value;
                if (val.length === 50 && editedName.length < 50) {
                  navigator.vibrate?.(20);
                }
                setEditedName(val);
              }}
              helperText={`${editedName.length}/50`}
              FormHelperTextProps={{
                sx: {
                  color: editedName.length >= 50 ? 'error.main' : 'inherit',
                  fontWeight: editedName.length >= 50 ? 700 : 'inherit',
                }
              }}
              slotProps={{
                htmlInput: {
                  maxLength: 50,
                  "aria-required": "true",
                }
              }}
              disabled={isSavingName}
            />
            <Button
              variant="contained"
              onClick={handleNameSave}
              disabled={isSavingName}
              startIcon={isSavingName ? <CircularProgress size={16} color="inherit" /> : null}
              sx={{ mt: 0.5, minWidth: 80 }}
            >
              Spara
            </Button>
            <Button
              variant="outlined"
              onClick={() => setIsEditingName(false)}
              disabled={isSavingName}
              sx={{ mt: 0.5 }}
            >
              Avbryt
            </Button>
          </Stack>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {playerName}
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setIsEditingName(true)}
            >
              Redigera namn
            </Button>
          </Box>
        )}
      </Stack>

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
          <Typography variant="caption" color="text.secondary" id="zoom-label">Zoom</Typography>
          <Slider
            value={avatarZoom}
            min={1}
            max={3}
            step={0.1}
            onChange={(_, val) => setAvatarZoom(val as number)}
            aria-labelledby="zoom-label"
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
    </>
  );
}
