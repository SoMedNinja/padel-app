import React from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  TextField,
  MenuItem,
  Stack,
  Alert,
  Paper,
  ButtonBase,
  Avatar,
  CircularProgress,
} from "@mui/material";
import {
  Add as AddIcon,
  PlayArrow as StartIcon,
  CheckCircle as CompleteIcon,
  Save as SaveIcon,
} from "@mui/icons-material";
import { GUEST_ID, GUEST_NAME } from "../../utils/guest";
import { getProfileDisplayName, getTournamentStatusLabel } from "../../utils/profileMap";

const POINTS_OPTIONS = [16, 21, 24, 31];

interface TournamentConfigProps {
  activeTournament: any;
  activeTournamentId: string;
  setActiveTournamentId: (id: string) => void;
  tournaments: any[];
  newTournament: any;
  setNewTournament: (t: any) => void;
  createTournament: (e: React.FormEvent) => void;
  participants: string[];
  selectableProfiles: any[];
  toggleParticipant: (id: string) => void;
  saveRoster: () => void;
  startTournament: () => void;
  isSaving: boolean;
  isGuest: boolean;
}

export default function TournamentConfig({
  activeTournament,
  activeTournamentId,
  setActiveTournamentId,
  tournaments,
  newTournament,
  setNewTournament,
  createTournament,
  participants,
  selectableProfiles,
  toggleParticipant,
  saveRoster,
  startTournament,
  isSaving,
}: TournamentConfigProps) {
  const rosterCard = activeTournament && activeTournament.status === "draft" && (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
          Deltagare ({participants.length})
        </Typography>
        <Box sx={{ mb: 2 }}>
          <Grid container spacing={1}>
            {selectableProfiles.map((p) => {
              const isSelected = participants.includes(p.id);
              return (
                <Grid key={p.id} size={{ xs: 4, sm: 3 }}>
                  <ButtonBase
                    component={Paper}
                    elevation={isSelected ? 4 : 1}
                    aria-pressed={isSelected}
                    aria-label={`Välj ${p.id === GUEST_ID ? GUEST_NAME : getProfileDisplayName(p)}`}
                    disabled={activeTournament.status !== "draft"}
                    sx={{
                      p: 1.5,
                      width: "100%",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      bgcolor: isSelected ? "primary.light" : "background.paper",
                      color: isSelected ? "primary.contrastText" : "text.primary",
                      border: isSelected ? "2px solid" : "1px solid",
                      borderColor: isSelected ? "primary.main" : "divider",
                      transition: "all 0.2s",
                      borderRadius: 1,
                      "&:hover": {
                        bgcolor: isSelected ? "primary.light" : "action.hover",
                      },
                    }}
                    onClick={() => toggleParticipant(p.id)}
                  >
                    <Avatar
                      src={p.avatar_url || ""}
                      sx={{
                        width: 48,
                        height: 48,
                        mb: 1,
                        border: isSelected ? "2px solid #fff" : "none",
                      }}
                    >
                      {p.name.charAt(0)}
                    </Avatar>
                    <Typography
                      variant="caption"
                      align="center"
                      sx={{
                        fontWeight: isSelected ? 800 : 500,
                        wordBreak: "break-word",
                        lineHeight: 1.2,
                        height: "2.4em",
                        overflow: "hidden",
                      }}
                    >
                      {p.id === GUEST_ID ? GUEST_NAME : getProfileDisplayName(p)}
                    </Typography>
                    {isSelected && (
                      <CompleteIcon
                        sx={{
                          position: "absolute",
                          top: 4,
                          right: 4,
                          fontSize: 16,
                          color: "primary.main",
                        }}
                      />
                    )}
                  </ButtonBase>
                </Grid>
              );
            })}
          </Grid>
        </Box>
        {activeTournament.status === "draft" && (
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              onClick={saveRoster}
              disabled={isSaving}
              startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
            >
              Spara roster
            </Button>
            {participants.length >= 4 && (
              <Button
                variant="outlined"
                startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : <StartIcon />}
                onClick={startTournament}
                disabled={isSaving}
              >
                Starta turnering
              </Button>
            )}
          </Stack>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: activeTournament?.status === "draft" ? 6 : 12 }}>
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <CardContent>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Välj eller skapa turnering
              </Typography>
              {activeTournamentId && (
                <Button size="small" startIcon={<AddIcon />} onClick={() => setActiveTournamentId("")}>
                  Ny turnering
                </Button>
              )}
            </Box>

            <TextField
              select
              fullWidth
              label="Välj turnering"
              value={activeTournamentId}
              onChange={(e) => setActiveTournamentId(e.target.value)}
              sx={{ mb: 2 }}
            >
              <MenuItem value="">-- Välj turnering / Skapa ny --</MenuItem>
              {tournaments.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  {t.name} ({getTournamentStatusLabel(t.status)})
                </MenuItem>
              ))}
            </TextField>

            {!activeTournamentId && (
              <Box component="form" onSubmit={createTournament}>
                <Stack spacing={2}>
                  <TextField
                    label="Namn"
                    required
                    value={newTournament.name}
                    onChange={(e) => setNewTournament({ ...newTournament, name: e.target.value })}
                    disabled={isSaving}
                    helperText={`${newTournament.name.length}/50`}
                    slotProps={{ htmlInput: { maxLength: 50 } }}
                  />
                  <TextField
                    label="Plats (valfritt)"
                    value={newTournament.location}
                    onChange={(e) => setNewTournament({ ...newTournament, location: e.target.value })}
                    disabled={isSaving}
                    helperText={`${newTournament.location.length}/50`}
                    slotProps={{ htmlInput: { maxLength: 50 } }}
                  />
                  <TextField
                    label="Datum"
                    type="date"
                    value={newTournament.scheduled_at}
                    onChange={(e) =>
                      setNewTournament({ ...newTournament, scheduled_at: e.target.value })
                    }
                    disabled={isSaving}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                  <TextField
                    select
                    label="Turneringstyp"
                    value={newTournament.tournament_type}
                    onChange={(e) =>
                      setNewTournament({ ...newTournament, tournament_type: e.target.value })
                    }
                    disabled={isSaving}
                  >
                    <MenuItem value="americano">Americano</MenuItem>
                    <MenuItem value="mexicano">Mexicano</MenuItem>
                  </TextField>

                  <Alert severity="info" sx={{ py: 0 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, display: "block" }}>
                      {newTournament.tournament_type === "americano" ? "Americano" : "Mexicano"}:
                    </Typography>
                    <Typography variant="caption">
                      {newTournament.tournament_type === "americano"
                        ? "Alla spelar med och mot alla. Lagen är förutbestämda."
                        : "Laguppställningar baseras på poäng för att skapa jämna matcher."}
                    </Typography>
                  </Alert>

                  <TextField
                    select
                    label="Målpoäng"
                    value={newTournament.score_target}
                    onChange={(e) =>
                      setNewTournament({ ...newTournament, score_target: e.target.value })
                    }
                    disabled={isSaving}
                  >
                    {POINTS_OPTIONS.map((p) => (
                      <MenuItem key={p} value={p}>
                        {p} poäng
                      </MenuItem>
                    ))}
                  </TextField>

                  <Button
                    type="submit"
                    variant="contained"
                    disabled={isSaving}
                    startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : null}
                  >
                    Skapa turnering
                  </Button>
                </Stack>
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>

      {activeTournament?.status === "draft" && <Grid size={{ xs: 12, md: 6 }}>{rosterCard}</Grid>}
    </Grid>
  );
}
