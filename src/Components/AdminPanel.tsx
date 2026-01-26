import { useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import { getProfileDisplayName } from "../utils/profileMap";
import { Profile } from "../types";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Button,
  Chip,
  IconButton,
  Stack,
} from "@mui/material";
import {
  Save as SaveIcon,
  Delete as DeleteIcon,
  CheckCircle as ApproveIcon,
  Cancel as RevokeIcon,
} from "@mui/icons-material";

interface AdminPanelProps {
  user: any;
  profiles?: Profile[];
  onProfileUpdate?: (profile: Profile) => void;
  onProfileDelete?: (profile: Profile) => void;
}

export default function AdminPanel({ user, profiles = [], onProfileUpdate, onProfileDelete }: AdminPanelProps) {
  const [editNames, setEditNames] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [toggleId, setToggleId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const sortedProfiles = useMemo(() => {
    return [...profiles]
      .filter(profile => !profile.is_deleted)
      .sort((a, b) => {
        const nameA = getProfileDisplayName(a).toLowerCase();
        const nameB = getProfileDisplayName(b).toLowerCase();
        return nameA.localeCompare(nameB);
      });
  }, [profiles]);

  const handleNameChange = (id: string, value: string) => {
    setEditNames(prev => ({ ...prev, [id]: value }));
  };

  const saveName = async (profile: Profile) => {
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

  const toggleApproval = async (profile: Profile) => {
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

  const deleteProfile = async (profile: Profile) => {
    if (profile.id === user?.id) {
      return alert("Du kan inte radera din egen adminprofil.");
    }

    const confirmed = window.confirm(
      `Är du säker på att du vill radera ${getProfileDisplayName(profile)}?`
    );
    if (!confirmed) return;

    setDeleteId(profile.id);
    const { data, error } = await supabase
      .from("profiles")
      .update({
        is_deleted: true,
        name: "deleted user",
        is_approved: false,
        is_admin: false,
        avatar_url: null,
      })
      .eq("id", profile.id)
      .select();
    setDeleteId(null);
    if (error) return alert(error.message);
    if (!data?.length) return alert("Kunde inte uppdatera profilen.");

    onProfileDelete?.(data[0]);
  };

  return (
    <Box component="section" sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="h5" sx={{ fontWeight: 800 }}>Administration</Typography>
      <Typography variant="body2" color="text.secondary">
        Godkänn användare innan de får åtkomst till appen. Du kan även uppdatera namn eller ta bort profiler.
      </Typography>

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3, overflow: 'auto' }}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead sx={{ bgcolor: 'grey.50' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Namn</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Admin</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">Åtgärder</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedProfiles.map(profile => {
              const currentName = editNames[profile.id] ?? profile.name ?? "";
              const hasNameChange = currentName.trim() !== (profile.name ?? "");
              const isSelf = profile.id === user?.id;

              return (
                <TableRow key={profile.id} hover>
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <TextField
                        size="small"
                        value={currentName}
                        onChange={(e) => handleNameChange(profile.id, e.target.value)}
                        sx={{ minWidth: 200 }}
                      />
                      {isSelf && <Chip label="Du" size="small" variant="outlined" />}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={profile.is_admin ? "Ja" : "Nej"}
                      size="small"
                      color={profile.is_admin ? "primary" : "default"}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={profile.is_approved ? "Godkänd" : "Väntar"}
                      size="small"
                      color={profile.is_approved ? "success" : "warning"}
                      sx={{ fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={profile.is_approved ? <RevokeIcon /> : <ApproveIcon />}
                        onClick={() => toggleApproval(profile)}
                        disabled={toggleId === profile.id}
                      >
                        {profile.is_approved ? "Återkalla" : "Godkänn"}
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<SaveIcon />}
                        onClick={() => saveName(profile)}
                        disabled={!hasNameChange || savingId === profile.id}
                      >
                        Spara
                      </Button>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => deleteProfile(profile)}
                        disabled={deleteId === profile.id || isSelf}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
