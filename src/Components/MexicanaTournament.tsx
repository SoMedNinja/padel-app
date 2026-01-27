import React, { useEffect, useMemo, useState } from "react";
import {
  Skeleton,
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  TextField,
  MenuItem,
  Stack,
  Divider,
  Chip,
  Checkbox,
  FormControlLabel,
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
// Note for non-coders: these imports bring in ready-made table UI pieces so the browser
// recognizes names like TableContainer and can render the standings tables.
import {
  Add as AddIcon,
  PlayArrow as StartIcon,
  Delete as DeleteIcon,
  Stop as StopIcon,
  CheckCircle as CompleteIcon,
  Visibility as ViewIcon,
  VisibilityOff as HideIcon,
} from "@mui/icons-material";
import { toast } from "sonner";
import { supabase } from "../supabaseClient";
import { GUEST_ID, GUEST_NAME } from "../utils/guest";
import { useTournaments, useTournamentDetails } from "../hooks/useTournamentData";
import { useQueryClient } from "@tanstack/react-query";
import TournamentBracket from "./TournamentBracket";
import {
  getProfileDisplayName,
  getIdDisplayName,
  idsToNames,
  makeProfileMap,
} from "../utils/profileMap";
import {
  getTournamentState,
  getNextSuggestion,
  generateAmericanoRounds,
} from "../utils/tournamentLogic";
import { Profile, PlayerStats, TournamentRound } from "../types";
import { queryKeys } from "../utils/queryKeys";

const POINTS_OPTIONS = [16, 21, 24, 31];
const SCORE_TARGET_DEFAULT = 24;

const formatDate = (value: string | undefined) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
};

const toDateInput = (value: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const getTournamentStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    draft: "Utkast",
    in_progress: "Pågår",
    completed: "Avslutad",
    abandoned: "Avbruten",
  };
  return labels[status] || "Okänd";
};

interface MexicanaTournamentProps {
  user: any;
  profiles?: Profile[];
  eloPlayers?: PlayerStats[];
  isGuest?: boolean;
  onTournamentSync?: () => void;
}

export default function MexicanaTournament({
  user,
  profiles = [],
  isGuest = false,
  onTournamentSync,
}: MexicanaTournamentProps) {
  const queryClient = useQueryClient();
  const [activeTournamentId, setActiveTournamentId] = useState("");
  const { data: tournaments = [], isLoading: isLoadingTournaments } = useTournaments();
  const { data: tournamentData, isLoading: isLoadingDetails } = useTournamentDetails(activeTournamentId);

  const [participants, setParticipants] = useState<string[]>([]);
  const [rounds, setRounds] = useState<TournamentRound[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const isLoading = isLoadingTournaments || (!!activeTournamentId && isLoadingDetails);

  const [newTournament, setNewTournament] = useState({
    name: "",
    scheduled_at: toDateInput(new Date().toISOString()),
    location: "",
    score_target: SCORE_TARGET_DEFAULT,
    tournament_type: "americano",
  });

  const [recordingRound, setRecordingRound] = useState<any>(null);
  const [showPreviousGames, setShowPreviousGames] = useState(false);

  // Add Guest to selectable profiles
  const selectableProfiles = useMemo(() => {
    const hasGuest = profiles.some(p => p.id === GUEST_ID);
    if (hasGuest) return profiles;
    return [...profiles, { id: GUEST_ID, name: GUEST_NAME } as Profile];
  }, [profiles]);

  const profileMap = useMemo(() => makeProfileMap(selectableProfiles), [selectableProfiles]);

  const activeTournament = useMemo(
    () => tournaments.find(t => t.id === activeTournamentId) || null,
    [tournaments, activeTournamentId]
  );

  const tournamentMode = activeTournament?.tournament_type || "americano";

  const { standings } = useMemo(() => {
    return getTournamentState(rounds, participants);
  }, [rounds, participants]);

  const sortedStandings = useMemo(() => {
    return Object.values(standings).sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      const diffA = a.pointsFor - a.pointsAgainst;
      const diffB = b.pointsFor - b.pointsAgainst;
      if (diffB !== diffA) return diffB - diffA;
      return b.wins - a.wins;
    });
  }, [standings]);

  const currentSuggestion = useMemo(() => {
    if (participants.length < 4) return null;
    return getNextSuggestion(rounds, participants, tournamentMode as any);
  }, [rounds, participants, tournamentMode]);


  useEffect(() => {
    if (tournamentData) {
      setParticipants(tournamentData.participants);
      setRounds(tournamentData.rounds);
    } else if (!activeTournamentId) {
      setParticipants([]);
      setRounds([]);
    }
  }, [tournamentData, activeTournamentId]);

  const createTournament = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newTournament.name.trim()) {
      toast.error("Ange ett namn för turneringen.");
      return;
    }
    if (isGuest || !user?.id) {
      toast.error("Logga in för att skapa en turnering.");
      return;
    }
    setIsSaving(true);
    const { data, error } = await supabase
      .from("mexicana_tournaments")
      .insert({
        name: newTournament.name.trim(),
        scheduled_at: newTournament.scheduled_at || null,
        location: newTournament.location || null,
        score_target: Number(newTournament.score_target) || SCORE_TARGET_DEFAULT,
        tournament_type: newTournament.tournament_type,
        status: "draft",
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      toast.error(error.message);
    } else {
      queryClient.invalidateQueries({ queryKey: queryKeys.tournaments() });
      setActiveTournamentId(data.id);
      toast.success("Turneringen är skapad.");
    }
    setIsSaving(false);
  };

  const toggleParticipant = (profileId: string) => {
    if (isGuest || activeTournament?.status === "completed") return;
    setParticipants(prev =>
      prev.includes(profileId) ? prev.filter(id => id !== profileId) : [...prev, profileId]
    );
  };

  const saveRoster = async () => {
    if (!activeTournamentId || isGuest || !user?.id) return;
    if (participants.length < 4 || participants.length > 8) {
      toast.error("Välj 4 till 8 spelare.");
      return;
    }
    setIsSaving(true);
    await supabase.from("mexicana_participants").delete().eq("tournament_id", activeTournamentId);
    const { error } = await supabase.from("mexicana_participants").insert(
      participants.map(profileId => ({
        tournament_id: activeTournamentId,
        profile_id: profileId === GUEST_ID ? null : profileId,
      }))
    );
    if (error) {
        toast.error(error.message);
        setIsSaving(false);
        return false;
    }
    else {
      queryClient.invalidateQueries({ queryKey: queryKeys.tournamentDetails(activeTournamentId) });
      toast.success("Roster sparad.");
      setIsSaving(false);
      return true;
    }
  };

  const hasValidRoundNumber = (value: unknown) => typeof value === "number" && Number.isFinite(value);
  // Note for non-coders: the database requires a round number for every saved round,
  // so this helper prevents us from sending empty or invalid values.

  const startTournament = async () => {
    if (!activeTournamentId || isGuest) return;

    // Auto-save roster before starting
    const saved = await saveRoster();
    if (!saved) return;

    setIsSaving(true);

    if (tournamentMode === 'americano') {
      const generatedRounds = generateAmericanoRounds(participants);
      const roundsPayload = generatedRounds.map(r => ({
        tournament_id: activeTournamentId,
        round_number: r.round_number,
        team1_ids: r.team1_ids.map(id => id === GUEST_ID ? null : id),
        team2_ids: r.team2_ids.map(id => id === GUEST_ID ? null : id),
        resting_ids: r.resting_ids.map(id => id === GUEST_ID ? null : id),
        mode: 'americano',
      }));

      const missingRoundNumber = roundsPayload.some(round => !hasValidRoundNumber(round.round_number));
      if (missingRoundNumber) {
        toast.error("Kan inte starta turneringen eftersom en rond saknar nummer.");
        setIsSaving(false);
        return;
      }

      const { error: roundError } = await supabase
        .from("mexicana_rounds")
        .insert(roundsPayload);

      if (roundError) {
        toast.error(roundError.message);
        setIsSaving(false);
        return;
      }
    }

    const { error } = await supabase
      .from("mexicana_tournaments")
      .update({ status: "in_progress" })
      .eq("id", activeTournamentId);

    if (error) {
      toast.error(error.message);
    } else {
      queryClient.invalidateQueries({ queryKey: queryKeys.tournaments() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tournamentDetails(activeTournamentId) });
      toast.success("Turneringen har startat.");
    }
    setIsSaving(false);
  };

  const handleRecordRound = () => {
    if (!currentSuggestion) return;
    setRecordingRound({
      ...currentSuggestion,
      team1_score: "",
      team2_score: "",
      mode: tournamentMode,
    });
  };

  const saveRound = async () => {
    if (!recordingRound || isGuest || !user?.id) return;
    const s1 = Number(recordingRound.team1_score);
    const s2 = Number(recordingRound.team2_score);
    if (!Number.isFinite(s1) || !Number.isFinite(s2)) {
      toast.error("Fyll i poäng för båda lagen.");
      return;
    }

    setIsSaving(true);
    const nextRoundNumber = rounds.length + 1;
    if (!hasValidRoundNumber(nextRoundNumber)) {
      toast.error("Kan inte spara rond utan ett giltigt nummer.");
      setIsSaving(false);
      return;
    }

    const activeIds = new Set([...recordingRound.team1_ids, ...recordingRound.team2_ids]);
    const restingIds = participants.filter(id => !activeIds.has(id));

    // Map GUEST_ID to null for database
    const t1Ids = recordingRound.team1_ids.map((id: string) => id === GUEST_ID ? null : id);
    const t2Ids = recordingRound.team2_ids.map((id: string) => id === GUEST_ID ? null : id);
    const rIds = restingIds.map(id => id === GUEST_ID ? null : id);

    const { error } = await supabase
      .from("mexicana_rounds")
      .insert({
        tournament_id: activeTournamentId,
        round_number: nextRoundNumber,
        team1_ids: t1Ids,
        team2_ids: t2Ids,
        resting_ids: rIds,
        team1_score: s1,
        team2_score: s2,
        mode: recordingRound.mode,
      });

    if (error) toast.error(error.message);
    else {
      queryClient.invalidateQueries({ queryKey: queryKeys.tournamentDetails(activeTournamentId) });
      setRecordingRound(null);
      toast.success(`Rond ${nextRoundNumber} sparad.`);
    }
    setIsSaving(false);
  };

  const deleteTournament = async (tournament: any) => {
    if (!tournament?.id || isGuest || !user?.id) return;
    if (!window.confirm(`Ta bort turneringen "${tournament.name}"?`)) return;
    setIsSaving(true);

    // Explicitly delete matches first to handle FK constraint if migration hasn't run yet
    await supabase.from("matches").delete().eq("source_tournament_id", tournament.id);

    const { error } = await supabase.from("mexicana_tournaments").delete().eq("id", tournament.id);
    if (error) toast.error(error.message);
    else {
      queryClient.invalidateQueries({ queryKey: queryKeys.tournaments() });
      if (activeTournamentId === tournament.id) setActiveTournamentId("");
      toast.success("Turneringen borttagen.");
    }
    setIsSaving(false);
  };

  const markAbandoned = async () => {
    if (!activeTournamentId || isGuest) return;
    if (!window.confirm("Markera turneringen som avbruten?")) return;
    setIsSaving(true);
    const { error } = await supabase.from("mexicana_tournaments").update({ status: "abandoned" }).eq("id", activeTournamentId);
    if (error) toast.error(error.message);
    else {
      queryClient.invalidateQueries({ queryKey: queryKeys.tournaments() });
      toast.success("Turneringen avbruten.");
    }
    setIsSaving(false);
  };

  const completeTournament = async () => {
    if (!activeTournament || isGuest) return;
    setIsSaving(true);

    const roundScorePayload = rounds
      .filter(round => Number.isFinite(round.team1_score) && Number.isFinite(round.team2_score))
      .map(round => ({
        id: round.id,
        team1_score: Number(round.team1_score),
        team2_score: Number(round.team2_score),
      }));
    // Note for non-coders: this saves the round scores in the database so the finished
    // tournament can show the same numbers later, even after refreshing the page.
    if (roundScorePayload.length) {
      const missingRoundIds = roundScorePayload.some(round => !round.id);
      if (missingRoundIds) {
        toast.error("Kan inte spara resultat eftersom en rond saknar ID.");
        setIsSaving(false);
        return;
      }

      const updateResults = await Promise.all(
        roundScorePayload.map(round =>
          supabase
            .from("mexicana_rounds")
            .update({
              team1_score: round.team1_score,
              team2_score: round.team2_score,
            })
            .eq("id", round.id)
        )
      );
      const roundScoreError = updateResults.find(result => result.error)?.error;
      if (roundScoreError) {
        toast.error(roundScoreError.message);
        setIsSaving(false);
        return;
      }
    }

    // Sync to matches
    const matchPayload = rounds.map(round => ({
      team1: idsToNames(round.team1_ids, profileMap),
      team2: idsToNames(round.team2_ids, profileMap),
      team1_ids: round.team1_ids.map((id: string) => id === GUEST_ID ? null : id),
      team2_ids: round.team2_ids.map((id: string) => id === GUEST_ID ? null : id),
      team1_sets: Number(round.team1_score),
      team2_sets: Number(round.team2_score),
      score_type: "points",
      score_target: activeTournament.score_target,
      source_tournament_id: activeTournament.id,
      source_tournament_type: activeTournament.tournament_type || "mexicana",
      team1_serves_first: true,
      created_by: user.id,
    }));

    const { error: matchError } = await supabase.from("matches").insert(matchPayload);
    if (matchError) {
      toast.error(matchError.message);
      setIsSaving(false);
      return;
    }

    const resultsPayload = sortedStandings.map((res, index) => ({
      tournament_id: activeTournament.id,
      profile_id: res.id === GUEST_ID ? null : res.id,
      rank: index + 1,
      points_for: res.pointsFor,
      points_against: res.pointsAgainst,
      matches_played: res.gamesPlayed,
      wins: res.wins,
      losses: res.losses,
    }));

    const { error: resultError } = await supabase.from("mexicana_results").insert(resultsPayload);
    if (resultError) {
      toast.error(resultError.message);
      setIsSaving(false);
      return;
    }

    const { error: tournamentError } = await supabase
      .from("mexicana_tournaments")
      .update({ status: "completed", completed_at: new Date().toISOString(), synced_to_matches: true })
      .eq("id", activeTournament.id);

    if (tournamentError) toast.error(tournamentError.message);
    else {
      queryClient.invalidateQueries({ queryKey: queryKeys.tournaments() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tournamentResultsHistory() });
      onTournamentSync?.();
      toast.success("Turneringen slutförd.");
    }
    setIsSaving(false);
  };

  const handleScoreChange = (team: "team1_score" | "team2_score", val: string) => {
    const score = val === "" ? "" : parseInt(val, 10);
    const target = activeTournament?.score_target || SCORE_TARGET_DEFAULT;
    setRecordingRound((prev: any) => {
      const next = { ...prev, [team]: score };
      if (typeof score === 'number' && score >= 0 && score <= target) {
        const otherTeam = team === 'team1_score' ? 'team2_score' : 'team1_score';
        next[otherTeam] = target - score;
      }
      return next;
    });
  };

  const updateRoundInDb = async (roundId: string, s1: any, s2: any) => {
    if (isGuest || !user?.id) return;
    setIsSaving(true);
    const { error } = await supabase
      .from("mexicana_rounds")
      .update({
        team1_score: Number(s1),
        team2_score: Number(s2),
      })
      .eq("id", roundId);

    if (error) {
      toast.error(error.message);
    } else {
      queryClient.invalidateQueries({ queryKey: queryKeys.tournamentDetails(activeTournamentId) });
      toast.success("Resultat sparat.");
    }
    setIsSaving(false);
  };

  const handleScoreChangeInList = (roundId: string, team: "team1_score" | "team2_score", val: string) => {
    const score = val === "" ? "" : parseInt(val, 10);
    const target = activeTournament?.score_target || SCORE_TARGET_DEFAULT;

    setRounds(prev => prev.map(r => {
      if (r.id !== roundId) return r;
      const next = { ...r, [team]: score };
      if (typeof score === 'number' && score >= 0 && score <= target) {
        const otherTeam = team === 'team1_score' ? 'team2_score' : 'team1_score';
        next[otherTeam] = target - score;
      }
      return next;
    }));
  };

  const rosterCard = activeTournament && activeTournament.status === 'draft' && (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>Deltagare ({participants.length})</Typography>
        <Box sx={{ maxHeight: '240px', overflowY: 'auto', mb: 2 }}>
          <Grid container spacing={1}>
            {selectableProfiles.map(p => (
              <Grid key={p.id} size={{ xs: 12 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={participants.includes(p.id)}
                      onChange={() => toggleParticipant(p.id)}
                      disabled={activeTournament.status !== 'draft'}
                    />
                  }
                  label={getProfileDisplayName(p)}
                />
              </Grid>
            ))}
          </Grid>
        </Box>
        {activeTournament.status === 'draft' && (
          <Stack direction="row" spacing={1}>
            <Button variant="contained" onClick={saveRoster} disabled={isSaving}>
              Spara roster
            </Button>
            {participants.length >= 4 && (
              <Button variant="outlined" startIcon={<StartIcon />} onClick={startTournament} disabled={isSaving}>
                Starta turnering
              </Button>
            )}
          </Stack>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Box component="section" sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>Turnering</Typography>
          <Typography variant="body2" color="text.secondary">
            Stöd för Americano (rättvisa) och Mexicano (jämna matcher).
          </Typography>
        </Box>
        {activeTournament && (
          <Chip
            label={getTournamentStatusLabel(activeTournament.status)}
            color={
              activeTournament.status === 'completed' ? 'success' :
              activeTournament.status === 'in_progress' ? 'primary' :
              'default'
            }
            sx={{ fontWeight: 700 }}
          />
        )}
      </Box>

      {activeTournament && (activeTournament.status === 'in_progress' || activeTournament.status === 'completed') && (
        <TournamentBracket
          rounds={rounds}
          profileMap={profileMap}
          activeTournament={activeTournament}
        />
      )}

      {isLoading ? (
        <Stack spacing={2}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 3 }} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 3 }} />
            </Grid>
          </Grid>
          <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 3 }} />
        </Stack>
      ) : (
      <>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: activeTournament?.status === 'draft' ? 6 : 12 }}>
          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Välj eller skapa turnering</Typography>
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
                onChange={e => setActiveTournamentId(e.target.value)}
                sx={{ mb: 2 }}
              >
                <MenuItem value="">-- Välj turnering / Skapa ny --</MenuItem>
                {tournaments.map(t => (
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
                      onChange={e => setNewTournament({ ...newTournament, name: e.target.value })}
                      disabled={isSaving}
                    />
                    <TextField
                      label="Plats (valfritt)"
                      value={newTournament.location}
                      onChange={e => setNewTournament({ ...newTournament, location: e.target.value })}
                      disabled={isSaving}
                    />
                    <TextField
                      label="Datum"
                      type="date"
                      value={newTournament.scheduled_at}
                      onChange={e => setNewTournament({ ...newTournament, scheduled_at: e.target.value })}
                      disabled={isSaving}
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                    <TextField
                      select
                      label="Turneringstyp"
                      value={newTournament.tournament_type}
                      onChange={e => setNewTournament({ ...newTournament, tournament_type: e.target.value })}
                      disabled={isSaving}
                    >
                      <MenuItem value="americano">Americano</MenuItem>
                      <MenuItem value="mexicano">Mexicano</MenuItem>
                    </TextField>

                    <Alert severity="info" sx={{ py: 0 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>
                        {newTournament.tournament_type === 'americano' ? 'Americano' : 'Mexicano'}:
                      </Typography>
                      <Typography variant="caption">
                        {newTournament.tournament_type === 'americano'
                          ? 'Alla spelar med och mot alla. Lagen är förutbestämda.'
                          : 'Laguppställningar baseras på poäng för att skapa jämna matcher.'}
                      </Typography>
                    </Alert>

                    <TextField
                      select
                      label="Målpoäng"
                      value={newTournament.score_target}
                      onChange={e => setNewTournament({ ...newTournament, score_target: e.target.value })}
                      disabled={isSaving}
                    >
                      {POINTS_OPTIONS.map(p => <MenuItem key={p} value={p}>{p} poäng</MenuItem>)}
                    </TextField>

                    <Button type="submit" variant="contained" disabled={isSaving}>
                      Skapa turnering
                    </Button>
                  </Stack>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {activeTournament?.status === 'draft' && (
          <Grid size={{ xs: 12, md: 6 }}>
            {rosterCard}
          </Grid>
        )}
      </Grid>

      {activeTournament?.status === 'in_progress' && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card variant="outlined" sx={{ borderRadius: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Spela ronder</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Läge: <Chip label={tournamentMode === 'americano' ? 'Americano' : 'Mexicano'} size="small" sx={{ fontWeight: 700 }} />
                </Typography>

                {tournamentMode === 'mexicano' && (
                  <Box sx={{ mb: 4 }}>
                    {!recordingRound ? (
                      <Stack spacing={2} sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Föreslagen nästa match:</Typography>
                        {currentSuggestion ? (
                          <>
                            <Typography variant="body1" sx={{ fontWeight: 800 }}>
                              {idsToNames(currentSuggestion.team1_ids, profileMap).join(" & ")} vs {idsToNames(currentSuggestion.team2_ids, profileMap).join(" & ")}
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
                          <Typography variant="body2" color="text.secondary">Välj minst 4 spelare.</Typography>
                        )}
                      </Stack>
                    ) : (
                      <Box sx={{ p: 2, border: 1, borderColor: 'primary.light', borderRadius: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Registrera resultat (Rond {rounds.length + 1})</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>Lag A (vänster) börjar serva.</Typography>

                        <Grid container spacing={2} alignItems="center">
                          <Grid size={{ xs: 5 }}>
                            <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>{idsToNames(recordingRound.team1_ids, profileMap).join(" & ")}</Typography>
                            <TextField
                              fullWidth
                              type="number"
                              size="small"
                              label="Poäng"
                              value={recordingRound.team1_score}
                              onChange={e => handleScoreChange('team1_score', e.target.value)}
                            />
                          </Grid>
                          <Grid size={{ xs: 2 }} sx={{ textAlign: 'center' }}>
                            <Typography sx={{ fontWeight: 800 }}>VS</Typography>
                          </Grid>
                          <Grid size={{ xs: 5 }}>
                            <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>{idsToNames(recordingRound.team2_ids, profileMap).join(" & ")}</Typography>
                            <TextField
                              fullWidth
                              type="number"
                              size="small"
                              label="Poäng"
                              value={recordingRound.team2_score}
                              onChange={e => handleScoreChange('team2_score', e.target.value)}
                            />
                          </Grid>
                        </Grid>

                        <Stack direction="row" spacing={1} sx={{ mt: 3 }}>
                          <Button variant="contained" onClick={saveRound} disabled={isSaving}>Spara rond</Button>
                          <Button variant="outlined" onClick={() => setRecordingRound(null)}>Avbryt</Button>
                        </Stack>
                      </Box>
                    )}
                  </Box>
                )}

                {tournamentMode === 'americano' && (
                  <Box sx={{ mb: 4 }}>
                    <Typography variant="body2" sx={{ mb: 2 }}>Alla ronder är förutbestämda. Fyll i poäng allt eftersom ni spelar.</Typography>
                    <Stack spacing={2}>
                      {rounds.map(round => {
                        const isPlayed = Number.isFinite(round.team1_score) && Number.isFinite(round.team2_score);
                        return (
                          <Paper key={round.id} variant="outlined" sx={{ p: 2, bgcolor: isPlayed ? 'action.hover' : 'background.paper' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Rond {round.round_number}</Typography>
                              {round.resting_ids && round.resting_ids.length > 0 && (
                                <Chip label={`Vilar: ${idsToNames(round.resting_ids, profileMap).join(", ")}`} size="small" variant="outlined" />
                              )}
                            </Box>

                            <Grid container spacing={2} alignItems="center">
                              <Grid size={{ xs: 5 }}>
                                <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>{idsToNames(round.team1_ids, profileMap).join(" & ")}</Typography>
                                <TextField
                                  fullWidth
                                  type="number"
                                  size="small"
                                  value={round.team1_score ?? ""}
                                  onChange={e => handleScoreChangeInList(round.id, 'team1_score', e.target.value)}
                                />
                              </Grid>
                              <Grid size={{ xs: 2 }} sx={{ textAlign: 'center' }}>
                                <Typography sx={{ fontWeight: 700 }}>–</Typography>
                              </Grid>
                              <Grid size={{ xs: 5 }}>
                                <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>{idsToNames(round.team2_ids, profileMap).join(" & ")}</Typography>
                                <TextField
                                  fullWidth
                                  type="number"
                                  size="small"
                                  value={round.team2_score ?? ""}
                                  onChange={e => handleScoreChangeInList(round.id, 'team2_score', e.target.value)}
                                />
                              </Grid>
                            </Grid>

                            <Button
                              variant="outlined"
                              size="small"
                              fullWidth
                              sx={{ mt: 2 }}
                              onClick={() => updateRoundInDb(round.id, round.team1_score, round.team2_score)}
                              disabled={isSaving || !Number.isFinite(round.team1_score) || !Number.isFinite(round.team2_score)}
                            >
                              {isPlayed ? "Uppdatera resultat" : "Spara resultat"}
                            </Button>
                          </Paper>
                        );
                      })}
                    </Stack>
                  </Box>
                )}

                {tournamentMode === 'mexicano' && rounds.length > 0 && (
                  <Box sx={{ mt: 4, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Tidigare matcher ({rounds.length})</Typography>
                      <IconButton onClick={() => setShowPreviousGames(!showPreviousGames)}>
                        {showPreviousGames ? <HideIcon /> : <ViewIcon />}
                      </IconButton>
                    </Box>

                    {showPreviousGames && (
                      <Stack spacing={1}>
                        {[...rounds].reverse().map(round => (
                          <Paper key={round.id} variant="outlined" sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="caption" sx={{ fontWeight: 800 }}>Rond {round.round_number}</Typography>
                            <Typography variant="body2">
                              {idsToNames(round.team1_ids, profileMap).join(" & ")} ({round.team1_score}) - ({round.team2_score}) {idsToNames(round.team2_ids, profileMap).join(" & ")}
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
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Poängställning</Typography>
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, overflow: 'auto' }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: 'grey.50' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Plac.</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Namn</TableCell>
                        <TableCell sx={{ fontWeight: 700 }} align="center">Poäng</TableCell>
                        <TableCell sx={{ fontWeight: 700 }} align="center">Matcher</TableCell>
                        <TableCell sx={{ fontWeight: 700 }} align="center">V/O/F</TableCell>
                        <TableCell sx={{ fontWeight: 700 }} align="center">Diff</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sortedStandings.map((res, i) => (
                        <TableRow key={res.id} hover>
                          <TableCell sx={{ fontWeight: 700 }}>{i + 1}</TableCell>
                          <TableCell>{getIdDisplayName(res.id, profileMap)}</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700 }}>{res.totalPoints}</TableCell>
                          <TableCell align="center">{res.gamesPlayed}</TableCell>
                          <TableCell align="center">{res.wins}/{res.ties}/{res.losses}</TableCell>
                          <TableCell align="center">{res.pointsFor - res.pointsAgainst}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Stack direction="row" spacing={1} sx={{ mt: 3 }}>
                   <Button variant="outlined" color="error" startIcon={<StopIcon />} onClick={markAbandoned}>Avbryt</Button>
                   <Button variant="contained" color="success" startIcon={<CompleteIcon />} onClick={completeTournament} disabled={rounds.length === 0}>
                     Slutför & synka
                   </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {activeTournament?.status === 'completed' && (
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <CardContent>
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>Resultat</Typography>
            <Typography variant="body2" sx={{ mb: 3 }}>
              <strong>{activeTournament.name}</strong> slutfördes {formatDate(activeTournament.completed_at)}.
            </Typography>

            <Grid container spacing={2} sx={{ mb: 4 }}>
              {sortedStandings.slice(0, 3).map((res, i) => (
                <Grid key={res.id} size={{ xs: 12, sm: 4 }}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: i === 0 ? 'primary.light' : 'background.paper', color: i === 0 ? 'primary.contrastText' : 'text.primary', border: 1, borderColor: 'divider' }}>
                    <Typography variant="h4" sx={{ fontWeight: 900 }}>{i + 1}</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>{getIdDisplayName(res.id, profileMap)}</Typography>
                    <Typography variant="body2">{res.totalPoints} poäng</Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>

            <TableContainer component={Paper} variant="outlined" sx={{ mb: 4, borderRadius: 2, overflow: 'auto' }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: 'grey.50' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Plac.</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Namn</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="center">Poäng</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="center">Matcher</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="center">V/O/F</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="center">Diff</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="center">Snitt</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedStandings.map((res, i) => (
                    <TableRow key={res.id} hover>
                      <TableCell sx={{ fontWeight: 700 }}>{i + 1}</TableCell>
                      <TableCell>{getIdDisplayName(res.id, profileMap)}</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>{res.totalPoints}</TableCell>
                      <TableCell align="center">{res.gamesPlayed}</TableCell>
                      <TableCell align="center">{res.wins}/{res.ties}/{res.losses}</TableCell>
                      <TableCell align="center">{res.pointsFor - res.pointsAgainst}</TableCell>
                      <TableCell align="center">{(res.totalPoints / (res.gamesPlayed || 1)).toFixed(1)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Divider sx={{ mb: 3 }} />

            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Matchresultat</Typography>
            <Stack spacing={1}>
              {rounds.map(round => (
                <Paper key={round.id} variant="outlined" sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" sx={{ fontWeight: 800 }}>Rond {round.round_number}</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {idsToNames(round.team1_ids, profileMap).join(" & ")}
                    <Chip label={`${round.team1_score} – ${round.team2_score}`} size="small" sx={{ mx: 2, fontWeight: 800 }} />
                    {idsToNames(round.team2_ids, profileMap).join(" & ")}
                  </Typography>
                </Paper>
              ))}
            </Stack>

            <Button variant="outlined" fullWidth sx={{ mt: 4 }} onClick={() => setActiveTournamentId("")}>
              Tillbaka till alla turneringar
            </Button>
          </CardContent>
        </Card>
      )}

      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Historik</Typography>
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, overflow: 'auto' }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: 'grey.50' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Turnering</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Typ</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Datum</TableCell>
                  <TableCell align="right"></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tournaments.map(t => (
                  <TableRow key={t.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{t.name}</TableCell>
                    <TableCell sx={{ textTransform: 'capitalize' }}>{t.tournament_type}</TableCell>
                    <TableCell>
                      <Chip
                        label={getTournamentStatusLabel(t.status)}
                        size="small"
                        color={t.status === 'completed' ? 'success' : 'default'}
                        sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                      />
                    </TableCell>
                    <TableCell>{formatDate(t.scheduled_at)}</TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button size="small" variant="outlined" onClick={() => setActiveTournamentId(t.id)}>Visa</Button>
                        <IconButton size="small" color="error" onClick={() => deleteTournament(t)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
      </>
      )}
    </Box>
  );
}
