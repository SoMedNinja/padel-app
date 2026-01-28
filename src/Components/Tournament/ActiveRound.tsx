import React from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  TextField,
  Stack,
  Chip,
  IconButton,
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import {
  Stop as StopIcon,
  CheckCircle as CompleteIcon,
  Visibility as ViewIcon,
  VisibilityOff as HideIcon,
} from "@mui/icons-material";
import { idsToNames, getIdDisplayName } from "../../utils/profileMap";

interface ActiveRoundProps {
  activeTournament: any;
  tournamentMode: string;
  rounds: any[];
  recordingRound: any;
  setRecordingRound: (r: any) => void;
  currentSuggestion: any;
  handleRecordRound: () => void;
  handleScoreChange: (team: "team1_score" | "team2_score", val: string) => void;
  saveRound: () => void;
  updateRoundInDb: (id: string, s1: any, s2: any) => void;
  handleScoreChangeInList: (id: string, team: "team1_score" | "team2_score", val: string) => void;
  nextRoundToPlay: any;
  showPreviousGames: boolean;
  setShowPreviousGames: (show: boolean) => void;
  sortedStandings: any[];
  markAbandoned: () => void;
  completeTournament: () => void;
  isSaving: boolean;
  profileMap: Map<string, any>;
  isMobile: boolean;
}

export default function ActiveRound({
  activeTournament,
  tournamentMode,
  rounds,
  recordingRound,
  setRecordingRound,
  currentSuggestion,
  handleRecordRound,
  handleScoreChange,
  saveRound,
  updateRoundInDb,
  handleScoreChangeInList,
  nextRoundToPlay,
  showPreviousGames,
  setShowPreviousGames,
  sortedStandings,
  markAbandoned,
  completeTournament,
  isSaving,
  profileMap,
  isMobile,
}: ActiveRoundProps) {
  if (!activeTournament || activeTournament.status !== "in_progress") {
    return (
      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent>
          <Typography variant="body2" color="text.secondary">
            Välj en turnering och starta den för att registrera ronder.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 6 }}>
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              Spela ronder
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Läge:{" "}
              <Chip
                label={tournamentMode === "americano" ? "Americano" : "Mexicano"}
                size="small"
                sx={{ fontWeight: 700 }}
              />
            </Typography>

            {tournamentMode === "mexicano" && (
              <Box sx={{ mb: 4 }}>
                {!recordingRound ? (
                  <Stack spacing={2} sx={{ p: 2, bgcolor: "grey.50", borderRadius: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      Föreslagen nästa match:
                    </Typography>
                    {currentSuggestion ? (
                      <>
                        <Typography variant="body1" sx={{ fontWeight: 800 }}>
                          {idsToNames(currentSuggestion.team1_ids, profileMap).join(" & ")} vs{" "}
                          {idsToNames(currentSuggestion.team2_ids, profileMap).join(" & ")}
                        </Typography>
                        {currentSuggestion.resting_ids.length > 0 && (
                          <Typography variant="caption" color="text.secondary">
                            Vilar: {idsToNames(currentSuggestion.resting_ids, profileMap).join(", ")}
                          </Typography>
                        )}
                        <Button variant="contained" onClick={handleRecordRound}>
                          Starta rond {rounds.length + 1}
                        </Button>
                      </>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Välj minst 4 spelare.
                      </Typography>
                    )}
                  </Stack>
                ) : (
                  <Box sx={{ p: 2, border: 1, borderColor: "primary.light", borderRadius: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                      Registrera resultat (Rond {rounds.length + 1})
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
                      Lag A (vänster) börjar serva.
                    </Typography>

                    <Grid container spacing={2} alignItems="center">
                      <Grid size={{ xs: 5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
                          {idsToNames(recordingRound.team1_ids, profileMap).join(" & ")}
                        </Typography>
                        <TextField
                          fullWidth
                          type="number"
                          size="small"
                          label="Poäng"
                          value={recordingRound.team1_score}
                          onChange={(e) => handleScoreChange("team1_score", e.target.value)}
                        />
                      </Grid>
                      <Grid size={{ xs: 2 }} sx={{ textAlign: "center" }}>
                        <Typography sx={{ fontWeight: 800 }}>VS</Typography>
                      </Grid>
                      <Grid size={{ xs: 5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
                          {idsToNames(recordingRound.team2_ids, profileMap).join(" & ")}
                        </Typography>
                        <TextField
                          fullWidth
                          type="number"
                          size="small"
                          label="Poäng"
                          value={recordingRound.team2_score}
                          onChange={(e) => handleScoreChange("team2_score", e.target.value)}
                        />
                      </Grid>
                    </Grid>

                    <Stack direction="row" spacing={1} sx={{ mt: 3 }}>
                      <Button variant="contained" onClick={saveRound} disabled={isSaving}>
                        Spara rond
                      </Button>
                      <Button variant="outlined" onClick={() => setRecordingRound(null)}>
                        Avbryt
                      </Button>
                    </Stack>
                  </Box>
                )}
              </Box>
            )}

            {tournamentMode === "americano" && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="body2" sx={{ mb: 3, color: "text.secondary" }}>
                  Americano: Alla spelar med alla. Fyll i poäng för respektive rond nedan.
                </Typography>

                {nextRoundToPlay && (
                  <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
                    <Typography variant="subtitle2" fontWeight={800}>
                      Nästa att spela: Rond {nextRoundToPlay.round_number}
                    </Typography>
                    <Typography variant="body2">
                      {idsToNames(nextRoundToPlay.team1_ids, profileMap).join(" & ")} vs{" "}
                      {idsToNames(nextRoundToPlay.team2_ids, profileMap).join(" & ")}
                    </Typography>
                  </Alert>
                )}

                <Stack spacing={2.5}>
                  {rounds.map((round) => {
                    const isPlayed =
                      Number.isFinite(round.team1_score) && Number.isFinite(round.team2_score);
                    const isNext = nextRoundToPlay?.id === round.id;

                    return (
                      <Paper
                        key={round.id}
                        variant="outlined"
                        sx={{
                          p: 2.5,
                          bgcolor: isPlayed ? "rgba(0,0,0,0.02)" : "background.paper",
                          border: isNext ? 2 : 1,
                          borderColor: isNext ? "primary.main" : "divider",
                          boxShadow: isNext ? "0 4px 12px rgba(211, 47, 47, 0.1)" : "none",
                          position: "relative",
                          transition: "all 0.2s",
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            mb: 2,
                          }}
                        >
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography
                              variant="subtitle2"
                              sx={{
                                fontWeight: 900,
                                color: isPlayed ? "text.secondary" : "text.primary",
                              }}
                            >
                              ROND {round.round_number}
                            </Typography>
                            {isPlayed && (
                              <Chip
                                label="Spelad"
                                size="small"
                                color="success"
                                variant="outlined"
                                sx={{ height: 20, fontSize: "0.65rem", fontWeight: 800 }}
                              />
                            )}
                            {isNext && (
                              <Chip
                                label="PÅGÅR"
                                size="small"
                                color="primary"
                                sx={{ height: 20, fontSize: "0.65rem", fontWeight: 800 }}
                              />
                            )}
                          </Stack>
                          {round.resting_ids && round.resting_ids.length > 0 && (
                            <Typography
                              variant="caption"
                              sx={{ fontStyle: "italic", color: "text.secondary" }}
                            >
                              Vilar: {idsToNames(round.resting_ids, profileMap).join(", ")}
                            </Typography>
                          )}
                        </Box>

                        <Grid container spacing={3} alignItems="center">
                          <Grid size={{ xs: 5 }}>
                            <Box sx={{ mb: 1.5, textAlign: "center" }}>
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: 700,
                                  minHeight: "3em",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                {idsToNames(round.team1_ids, profileMap).join(" & ")}
                              </Typography>
                            </Box>
                            <TextField
                              fullWidth
                              type="number"
                              size="small"
                              placeholder="0"
                              value={round.team1_score ?? ""}
                              onChange={(e) =>
                                handleScoreChangeInList(round.id, "team1_score", e.target.value)
                              }
                              inputProps={{
                                style: { textAlign: "center", fontWeight: 800, fontSize: "1.1rem" },
                              }}
                            />
                          </Grid>
                          <Grid size={{ xs: 2 }} sx={{ textAlign: "center" }}>
                            <Typography sx={{ fontWeight: 900, color: "text.disabled" }}>
                              VS
                            </Typography>
                          </Grid>
                          <Grid size={{ xs: 5 }}>
                            <Box sx={{ mb: 1.5, textAlign: "center" }}>
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: 700,
                                  minHeight: "3em",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                {idsToNames(round.team2_ids, profileMap).join(" & ")}
                              </Typography>
                            </Box>
                            <TextField
                              fullWidth
                              type="number"
                              size="small"
                              placeholder="0"
                              value={round.team2_score ?? ""}
                              onChange={(e) =>
                                handleScoreChangeInList(round.id, "team2_score", e.target.value)
                              }
                              inputProps={{
                                style: { textAlign: "center", fontWeight: 800, fontSize: "1.1rem" },
                              }}
                            />
                          </Grid>
                        </Grid>

                        <Button
                          variant={isPlayed ? "text" : "contained"}
                          size="small"
                          fullWidth
                          sx={{ mt: 2.5, py: 1, fontWeight: 700 }}
                          onClick={() =>
                            updateRoundInDb(round.id, round.team1_score, round.team2_score)
                          }
                          disabled={
                            isSaving ||
                            !Number.isFinite(round.team1_score) ||
                            !Number.isFinite(round.team2_score)
                          }
                        >
                          {isPlayed ? "Uppdatera resultat" : "Spara resultat"}
                        </Button>
                      </Paper>
                    );
                  })}
                </Stack>
              </Box>
            )}

            {tournamentMode === "mexicano" && rounds.length > 0 && (
              <Box sx={{ mt: 4, pt: 2, borderTop: 1, borderColor: "divider" }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Tidigare matcher ({rounds.length})
                  </Typography>
                  <IconButton
                    onClick={() => setShowPreviousGames(!showPreviousGames)}
                    aria-label={showPreviousGames ? "Dölj tidigare matcher" : "Visa tidigare matcher"}
                  >
                    {showPreviousGames ? <HideIcon /> : <ViewIcon />}
                  </IconButton>
                </Box>

                {showPreviousGames && (
                  <Stack spacing={1}>
                    {[...rounds].reverse().map((round) => (
                      <Paper
                        key={round.id}
                        variant="outlined"
                        sx={{
                          p: 1.5,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Typography variant="caption" sx={{ fontWeight: 800 }}>
                          Rond {round.round_number}
                        </Typography>
                        <Typography variant="body2">
                          {idsToNames(round.team1_ids, profileMap).join(" & ")} (
                          {round.team1_score}) - ({round.team2_score}){" "}
                          {idsToNames(round.team2_ids, profileMap).join(" & ")}
                        </Typography>
                      </Paper>
                    ))}
                  </Stack>
                )}
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              Poängställning
            </Typography>
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, overflow: "auto" }}>
              <Table size="small" sx={{ minWidth: isMobile ? 520 : 640 }}>
                <TableHead sx={{ bgcolor: "grey.50" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Plac.</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Namn</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="center">
                      Poäng
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="center">
                      Matcher
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="center">
                      V/O/F
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="center">
                      Diff
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedStandings.map((res, i) => (
                    <TableRow key={res.id} hover>
                      <TableCell sx={{ fontWeight: 700 }}>{i + 1}</TableCell>
                      <TableCell>{getIdDisplayName(res.id, profileMap)}</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>
                        {res.totalPoints}
                      </TableCell>
                      <TableCell align="center">{res.gamesPlayed}</TableCell>
                      <TableCell align="center">
                        {res.wins}/{res.ties}/{res.losses}
                      </TableCell>
                      <TableCell align="center">{res.pointsFor - res.pointsAgainst}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 3 }}>
              <Button variant="outlined" color="error" startIcon={<StopIcon />} onClick={markAbandoned}>
                Avbryt
              </Button>
              <Button
                variant="contained"
                color="success"
                startIcon={<CompleteIcon />}
                onClick={completeTournament}
                disabled={rounds.length === 0}
              >
                Slutför & synka
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
