import { useEffect, useMemo, useState } from "react";
import { profileService } from "../services/profileService";
import { getProfileDisplayName } from "../utils/profileMap";
import { stripBadgeLabelFromName } from "../utils/profileName";
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
  CircularProgress,
  Chip,
  IconButton,
  Stack,
  Grid,
  Avatar,
  Tooltip,
  Tabs,
  Tab,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  Save as SaveIcon,
  Delete as DeleteIcon,
  CheckCircle as ApproveIcon,
  Cancel as RevokeIcon,
  AdminPanelSettings as AdminIcon,
  People as PeopleIcon,
  HourglassEmpty as PendingIcon,
  Email as EmailIcon,
  Assessment as ReportsIcon,
  HowToReg as RegularIcon,
} from "@mui/icons-material";
import EmailPreviews from "./Admin/EmailPreviews";
import ReportsSection from "./Admin/ReportsSection";

interface AdminPanelProps {
  user: any;
  profiles?: Profile[];
  initialTab?: number;
  onProfileUpdate?: (profile: Profile) => void;
  onProfileDelete?: (profile: Profile) => void;
}

export default function AdminPanel({ user, profiles = [], initialTab = 0, onProfileUpdate, onProfileDelete }: AdminPanelProps) {
  // Note for non-coders: this lets URLs open a specific admin tab (for example, "/admin/email").
  const [tab, setTab] = useState(initialTab);
  const [editNames, setEditNames] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [toggleId, setToggleId] = useState<string | null>(null);
  const [regularToggleId, setRegularToggleId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

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
    const nextName = stripBadgeLabelFromName(
      editNames[profile.id] ?? profile.name ?? "",
      profile.featured_badge_id
    );
    // Note for non-coders: this strips any badge tag so the database only stores the plain name.
    if (!nextName) return alert("Ange ett namn.");

    setSavingId(profile.id);
    try {
      const data = await profileService.updateProfile(profile.id, { name: nextName });
      onProfileUpdate?.(data);
    } catch (error: any) {
      alert(error.message || "Kunde inte uppdatera profilen.");
    } finally {
      setSavingId(null);
    }
  };

  const toggleApproval = async (profile: Profile) => {
    const nextApproved = profile.is_approved !== true;
    setToggleId(profile.id);
    try {
      const data = await profileService.updateProfile(profile.id, { is_approved: nextApproved });
      onProfileUpdate?.(data);
    } catch (error: any) {
      alert(error.message || "Kunde inte uppdatera profilen.");
    } finally {
      setToggleId(null);
    }
  };



  const toggleRegular = async (profile: Profile) => {
    const nextRegular = profile.is_regular !== true;
    setRegularToggleId(profile.id);
    try {
      const data = await profileService.updateProfile(profile.id, { is_regular: nextRegular });
      onProfileUpdate?.(data);
    } catch (error: any) {
      alert(error.message || "Kunde inte uppdatera ordinarie-status.");
    } finally {
      setRegularToggleId(null);
    }
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
    try {
      const data = await profileService.updateProfile(profile.id, {
        is_deleted: true,
        name: "deleted user",
        is_approved: false,
        is_admin: false,
        is_regular: false,
        avatar_url: null,
      });
      onProfileDelete?.(data);
    } catch (error: any) {
      alert(error.message || "Kunde inte radera profilen.");
    } finally {
      setDeleteId(null);
    }
  };

  const stats = useMemo(() => {
    const total = sortedProfiles.length;
    const pending = sortedProfiles.filter(p => !p.is_approved).length;
    const admins = sortedProfiles.filter(p => p.is_admin).length;
    const regular = sortedProfiles.filter(p => p.is_regular).length;
    return { total, pending, admins, regular };
  }, [sortedProfiles]);

  return (
    <Box component="section" sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>Administration</Typography>
        <Typography variant="body1" color="text.secondary">
          Hantera användare, godkänn nya medlemmar och administrera systemet.
        </Typography>
      </Box>

      <Paper sx={{ borderRadius: 3, bgcolor: 'background.paper', mb: 2 }}>
        <Tabs
          value={tab}
          onChange={(_, newValue) => setTab(newValue)}
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
          aria-label="Admin-alternativ"
        >
          <Tab icon={<PeopleIcon />} label="Användare" iconPosition="start" sx={{ py: 2, fontWeight: 700 }} />
          <Tab icon={<ReportsIcon />} label="Rapporter" iconPosition="start" sx={{ py: 2, fontWeight: 700 }} />
          <Tab icon={<EmailIcon />} label="E-post" iconPosition="start" sx={{ py: 2, fontWeight: 700 }} />
        </Tabs>
      </Paper>

      {tab === 0 && (
        <>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card variant="outlined" sx={{ bgcolor: 'primary.light', color: 'primary.contrastText' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
                <PeopleIcon />
              </Avatar>
              <Box>
                <Typography variant="h4" fontWeight={800}>{stats.total}</Typography>
                <Typography variant="body2">Totala användare</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card variant="outlined" sx={{ bgcolor: stats.pending > 0 ? 'warning.light' : 'success.light', color: stats.pending > 0 ? 'warning.contrastText' : 'success.contrastText' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
                {stats.pending > 0 ? <PendingIcon /> : <ApproveIcon />}
              </Avatar>
              <Box>
                <Typography variant="h4" fontWeight={800}>{stats.pending}</Typography>
                <Typography variant="body2">Väntar på godkännande</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card variant="outlined">
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'primary.main', color: '#fff' }}>
                <AdminIcon />
              </Avatar>
              <Box>
                <Typography variant="h4" fontWeight={800} color="primary.main">{stats.admins}</Typography>
                <Typography variant="body2" color="text.secondary">Administratörer • Ordinarie: {stats.regular}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card variant="outlined" sx={{ borderRadius: 4, overflow: 'hidden' }}>
        <TableContainer sx={{ overflow: 'auto' }}>
          <Table sx={{ minWidth: 800 }}>
            <TableHead sx={{ bgcolor: 'grey.50' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, pl: 3 }}>Användare</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Roll & Status</TableCell>
                <TableCell sx={{ fontWeight: 700, pr: 3 }} align="right">Åtgärder</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedProfiles.map(profile => {
                const currentName = editNames[profile.id] ?? profile.name ?? "";
                const hasNameChange = currentName.trim() !== (profile.name ?? "") && currentName.trim() !== "";
                const isSelf = profile.id === user?.id;

                return (
                  <TableRow
                    key={profile.id}
                    hover
                    sx={{
                      '&:last-child td, &:last-child th': { border: 0 },
                      bgcolor: isSelf ? (theme) => alpha(theme.palette.primary.main, 0.08) : 'transparent',
                    }}
                  >
                    <TableCell sx={{ pl: 3 }}>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar src={profile.avatar_url || ''}>{profile.name?.charAt(0)}</Avatar>
                        <Box sx={{ flex: 1 }}>
                          <TextField
                            fullWidth
                            size="small"
                            variant="standard"
                            placeholder="Namn"
                            value={currentName}
                            onChange={(e) => handleNameChange(profile.id, e.target.value)}
                            helperText={`${currentName.length}/50`}
                            FormHelperTextProps={{
                              sx: {
                                color: currentName.length >= 50 ? 'error.main' : 'inherit',
                                fontWeight: currentName.length >= 50 ? 700 : 'inherit',
                              }
                            }}
                            slotProps={{
                              htmlInput: {
                                maxLength: 50,
                                "aria-label": `Ändra namn för ${profile.name || "användare"}`,
                              },
                            }}
                            sx={{
                              '& .MuiInput-root': { fontWeight: 600 },
                              maxWidth: 250
                            }}
                            InputProps={{
                              endAdornment: hasNameChange && (
                                <Tooltip title="Spara namn">
                                  <span>
                                    <IconButton
                                      size="small"
                                      color="primary"
                                      onClick={() => saveName(profile)}
                                      disabled={savingId === profile.id}
                                      aria-label="Spara namnändring"
                                    >
                                      {savingId === profile.id ? (
                                        <CircularProgress size={16} color="inherit" />
                                      ) : (
                                        <SaveIcon fontSize="small" />
                                      )}
                                    </IconButton>
                                  </span>
                                </Tooltip>
                              )
                            }}
                          />
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            ID: {profile.id.slice(0, 8)}...
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Chip
                          label={profile.is_admin ? "Admin" : "Spelare"}
                          size="small"
                          icon={profile.is_admin ? <AdminIcon sx={{ fontSize: '1rem !important' }} /> : undefined}
                          color={profile.is_admin ? "primary" : "default"}
                          variant="outlined"
                        />
                        <Chip
                          label={profile.is_approved ? "Godkänd" : "Väntar"}
                          size="small"
                          color={profile.is_approved ? "success" : "warning"}
                          variant={profile.is_approved ? "filled" : "outlined"}
                          sx={{ fontWeight: 600 }}
                        />
                        <Chip
                          label={profile.is_regular ? "Ordinarie" : "Ej ordinarie"}
                          size="small"
                          color={profile.is_regular ? "info" : "default"}
                          variant={profile.is_regular ? "filled" : "outlined"}
                          icon={profile.is_regular ? <RegularIcon sx={{ fontSize: '1rem !important' }} /> : undefined}
                          sx={{ fontWeight: 600 }}
                        />
                        {isSelf && <Chip label="Du" size="small" variant="filled" color="secondary" sx={{ fontWeight: 700 }} />}
                      </Stack>
                    </TableCell>
                    <TableCell align="right" sx={{ pr: 3 }}>
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button
                          size="small"
                          variant={profile.is_approved ? "outlined" : "contained"}
                          color={profile.is_approved ? "inherit" : "primary"}
                          startIcon={toggleId === profile.id ? <CircularProgress size={16} color="inherit" /> : (profile.is_approved ? <RevokeIcon /> : <ApproveIcon />)}
                          onClick={() => toggleApproval(profile)}
                          disabled={toggleId === profile.id}
                        >
                          {toggleId === profile.id ? "Sparar..." : (profile.is_approved ? "Återkalla" : "Godkänn")}
                        </Button>
                        <Button
                          size="small"
                          variant={profile.is_regular ? "outlined" : "contained"}
                          color={profile.is_regular ? "info" : "primary"}
                          startIcon={regularToggleId === profile.id ? <CircularProgress size={16} color="inherit" /> : <RegularIcon />}
                          onClick={() => toggleRegular(profile)}
                          disabled={regularToggleId === profile.id}
                        >
                          {regularToggleId === profile.id ? "Sparar..." : (profile.is_regular ? "Gör ej ordinarie" : "Gör ordinarie")}
                        </Button>
                        <Tooltip title="Radera profil">
                          <span>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => deleteProfile(profile)}
                              disabled={deleteId === profile.id || isSelf}
                              aria-label={`Radera profilen för ${profile.name}`}
                              sx={{ border: '1px solid', borderColor: 'divider' }}
                            >
                              {deleteId === profile.id ? (
                                <CircularProgress size={16} color="inherit" />
                              ) : (
                                <DeleteIcon fontSize="small" />
                              )}
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
      </>
      )}

      {tab === 1 && (
        <ReportsSection />
      )}

      {tab === 2 && (
        <EmailPreviews currentUserId={user?.id} />
      )}
    </Box>
  );
}
