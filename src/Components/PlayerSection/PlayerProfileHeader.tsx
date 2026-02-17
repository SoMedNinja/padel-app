import { useState, useEffect } from "react";
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
} from "@mui/material";
import {
  Edit as EditIcon,
  PhotoCamera as PhotoIcon,
  Delete as DeleteIcon,
  EmojiEvents as TrophyIcon,
} from "@mui/icons-material";
import Cropper, { Area } from "react-easy-crop";
import Avatar from "../Avatar";
import ProfileName from "../ProfileName";
import BadgeGallery from "../BadgeGallery";
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

interface PlayerProfileHeaderProps {
  user: any;
  profile: Profile | undefined;
  profiles: Profile[]; // Needed for BadgeGallery
  currentPlayerBadgeStats: any;
  allPlayerBadgeStats: any;
  currentEloDisplay: number;
  onProfileUpdate?: (profile: Profile) => void;
}

export default function PlayerProfileHeader({
  user,
  profile,
  profiles,
  currentPlayerBadgeStats,
  allPlayerBadgeStats,
  currentEloDisplay,
  onProfileUpdate,
}: PlayerProfileHeaderProps) {
  const playerName = profile
    ? getProfileDisplayName(profile)
    : user?.email || "Din profil";

  const [isEditingName, setIsEditingName] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [editedName, setEditedName] = useState(playerName);

  useEffect(() => {
    setEditedName(playerName);
  }, [playerName]);

  const [selectedBadgeId, setSelectedBadgeId] = useState<string | null>(
    profile?.featured_badge_id || null
  );
  const [badgeGalleryOpen, setBadgeGalleryOpen] = useState(false);

  useEffect(() => {
    setSelectedBadgeId(profile?.featured_badge_id || null);
  }, [profile?.featured_badge_id]);

  const handleBadgeSelect = async (badgeId: string | null) => {
    if (!user?.id) return;
    try {
      const data = await profileService.updateProfile(user.id, { featured_badge_id: badgeId });
      setSelectedBadgeId(badgeId);
      setBadgeGalleryOpen(false);
      onProfileUpdate?.(data);
      toast.success("Meriten har uppdaterats!");
    } catch (error: any) {
      toast.error(error.message || "Kunde inte uppdatera meriten.");
    }
  };

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
      profileService.updateProfile(user.id, { avatar_url: stored })
        .then((data) => {
          if (data) onProfileUpdate?.(data);
        })
        .catch(err => console.error("Failed to sync avatar to DB", err));
    }
  }, [avatarStorageId, profile?.avatar_url, user?.id, onProfileUpdate]);

  const onCropComplete = (croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

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
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'center', mb: 4 }}>
        <Avatar
          sx={{ width: 100, height: 100, fontSize: '2.5rem' }}
          src={avatarUrl}
          name={playerName}
        />

        <Box sx={{ flex: 1, minWidth: 240 }}>
          {isEditingName ? (
            <Stack direction="row" spacing={1} sx={{ mb: 2, alignItems: "flex-start" }}>
              <TextField
                size="small"
                label="Spelarnamn"
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
                    "aria-label": `Ändra ditt namn, ${editedName.length} av 50 tecken`,
                  }
                }}
                disabled={isSavingName}
              />
              <Button
                variant="contained"
                size="small"
                onClick={handleNameSave}
                disabled={isSavingName}
                startIcon={isSavingName ? <CircularProgress size={16} color="inherit" /> : null}
                sx={{ mt: 0.5 }}
              >
                {isSavingName ? "Sparar..." : "Spara"}
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setIsEditingName(false)}
                disabled={isSavingName}
                sx={{ mt: 0.5 }}
              >
                Avbryt
              </Button>
            </Stack>
          ) : (
            <Box sx={{ mb: 2 }}>
              <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>
                <ProfileName name={playerName} badgeId={selectedBadgeId} />
              </Typography>
              <Typography variant="h6" color="primary" sx={{ fontWeight: 700 }}>
                ELO {currentEloDisplay}
              </Typography>
            </Box>
          )}

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button
              variant="outlined"
              component="label"
              size="small"
              startIcon={<PhotoIcon />}
            >
              Byt bild
              <input type="file" hidden accept="image/*" onChange={handleAvatarChange} />
            </Button>
            {!isEditingName && (
              <>
                <Button variant="outlined" size="small" startIcon={<EditIcon />} onClick={() => setIsEditingName(true)}>
                  Ändra namn
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<TrophyIcon />}
                  onClick={() => setBadgeGalleryOpen(true)}
                >
                  Välj merit
                </Button>
              </>
            )}
            <Button variant="text" size="small" color="error" startIcon={<DeleteIcon />} onClick={resetAvatar}>
              Återställ bild
            </Button>
          </Stack>
        </Box>
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

      <BadgeGallery
        open={badgeGalleryOpen}
        onClose={() => setBadgeGalleryOpen(false)}
        onSelect={handleBadgeSelect}
        currentBadgeId={selectedBadgeId}
        stats={currentPlayerBadgeStats}
        allPlayerStats={allPlayerBadgeStats}
        playerId={user?.id || ""}
      />
    </>
  );
}
