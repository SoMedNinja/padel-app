import { useMemo, useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { invalidateStatsData } from "../data/queryInvalidation";
import {
  CircularProgress,
  Box,
  Typography,
  Button,
  Grid,
  Avatar,
  Chip,
  Paper,
  IconButton,
  Divider,
  Stepper,
  Step,
  StepLabel,
  StepButton,
  Tooltip,
  LinearProgress,
  Select,
  MenuItem,
  FormControl,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  ArrowBack as ArrowBackIcon,
  Close as CloseIcon,
  Balance as BalanceIcon,
  CheckCircle as CheckCircleIcon,
  ArrowForward as ArrowForwardIcon,
  PersonAdd as PersonAddIcon,
} from "@mui/icons-material";
import { GUEST_ID, GUEST_NAME } from "../utils/guest";
import {
  getExpectedScore,
  getMarginMultiplier,
  getMatchWeight,
  getSinglesAdjustedMatchWeight,
  buildPlayerDelta,
  ELO_BASELINE,
} from "../utils/elo";
import {
  getIdDisplayName,
  getProfileDisplayName,
  idsToNames,
  makeNameToIdMap,
  makeProfileMap,
} from "../utils/profileMap";
import {
  getTeamAverageElo,
  getFairnessScore,
} from "../utils/rotation";
import { calculateEveningStats } from "../utils/reportLogic";
import {
  Match,
  PlayerStats,
  Profile,
  AppUser,
  MatchRecap,
  EveningRecap,
  MatchSuggestion,
} from "../types";
import TheShareable from "./Shared/TheShareable";
import { formatScore } from "../utils/format";
import { useCreateMatch } from "../hooks/useMatchMutations";
import PlayerGrid from "./MatchForm/PlayerGrid";
import ScoreSelector from "./MatchForm/ScoreSelector";
import MatchmakerStep from "./MatchForm/MatchmakerStep";
import RecapView from "./MatchForm/RecapView";

interface MatchFormProps {
  user: AppUser;
  profiles: Profile[];
  matches: Match[];
  eloPlayers: PlayerStats[];
  eloDeltaByMatch?: Record<string, Record<string, number>>;
  mode?: "1v1" | "2v2";
  setMode?: (mode: "1v1" | "2v2") => void;
}

export default function MatchForm({
  user,
  profiles = [],
  matches = [],
  eloPlayers = [],
  eloDeltaByMatch = {},
  mode = "2v2",
  setMode,
}: MatchFormProps) {
  const queryClient = useQueryClient();
  const teamSize = mode === "1v1" ? 1 : 2;
  const [step, setStep] = useState(0); // 0: Start/TeamA, 1: TeamB, 2: Score, 3: Review, 10: Pool Selection (Matchmaker)
  const [team1, setTeam1] = useState<string[]>(Array(teamSize).fill(""));
  const [team2, setTeam2] = useState<string[]>(Array(teamSize).fill(""));

  useEffect(() => {
    setTeam1(Array(teamSize).fill(""));
    setTeam2(Array(teamSize).fill(""));
    setStep(0);
  }, [mode, teamSize]);
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [pool, setPool] = useState<string[]>([]);
  const [matchSuggestion, setMatchSuggestion] = useState<MatchSuggestion | null>(null);
  const [matchRecap, setMatchRecap] = useState<MatchRecap | null>(null);
  const [eveningRecap, setEveningRecap] = useState<EveningRecap | null>(null);
  const [recapMode, setRecapMode] = useState("evening");
  const [showRecap, setShowRecap] = useState(true);
  const [showExtraScores, setShowExtraScores] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCeremonyActive, setIsCeremonyActive] = useState(false);
  const [query, setQuery] = useState("");
  useEffect(() => { setQuery(""); }, [step]);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const createMatchMutation = useCreateMatch();
  const wizardSteps = ["Lag A", "Lag B", "Resultat", "Granska"];
  const activeWizardStep = step >= 0 && step <= 3 ? step : 0;
  // Note for non-coders: "activeWizardStep" tells the Stepper which stage we're on so the UI can show progress.

  const stepHeaderRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (stepHeaderRef.current) {
      stepHeaderRef.current.focus();
    }
  }, [step]);

  const handleWizardStepClick = (targetStep: number) => {
    if (step !== 10 && targetStep <= activeWizardStep) {
      setStep(targetStep);
    }
  };
  // Note for non-coders: we only allow clicking backwards to already completed steps, not skipping ahead.

  const registeredPlayerCount = useMemo(
    () => profiles.filter(player => player.id !== GUEST_ID).length,
    [profiles]
  );
  // Note for non-coders: we count only real registered players here (not the "Gästspelare")
  // so the search field appears only when the player list is large enough to need filtering.
  const selectablePlayers = useMemo(() => {
    const hasGuest = profiles.some(player => player.id === GUEST_ID);
    return hasGuest ? profiles : [...profiles, { id: GUEST_ID, name: GUEST_NAME } as Profile];
  }, [profiles]);
  const profileMap = useMemo(() => makeProfileMap(selectablePlayers), [selectablePlayers]);
  const nameToIdMap = useMemo(
    () => makeNameToIdMap(selectablePlayers),
    [selectablePlayers]
  );
  const badgeNameMap = useMemo(() => {
    const map = new Map<string, string | null>();
    profiles.forEach(profile => {
      map.set(getProfileDisplayName(profile), profile.featured_badge_id || null);
    });
    return map;
  }, [profiles]);
  const serveFirstLabel = mode === "1v1" ? "Spelare A" : "Lag A";
  const nextServeFirst = useMemo(() => {
    const matchType = mode === "1v1" ? "standalone_1v1" : "standalone";
    const recentStandaloneMatches = matches
      .filter(match => match.source_tournament_type === matchType)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const lastServeFirst = recentStandaloneMatches[0]?.team1_serves_first;
    // Note for non-coders: "team1" is the A-side in the UI. We flip who serves first each match,
    // when possible, to keep serving fair across standalone 1v1/2v2 games.
    if (typeof lastServeFirst !== "boolean") return true;
    return !lastServeFirst;
  }, [matches, mode]);
  const eloMap = useMemo(() => {
    const map: Record<string, number> = { [GUEST_ID]: ELO_BASELINE };
    eloPlayers.forEach(player => {
      map[player.id] = Math.round(player.elo ?? ELO_BASELINE);
    });
    return map;
  }, [eloPlayers]);

  const simulatorStats = useMemo(() => {
    const hasEmpty = team1.some(id => !id) || team2.some(id => !id);
    if (hasEmpty) return null;

    const teamAElo = getTeamAverageElo(team1, eloMap);
    const teamBElo = getTeamAverageElo(team2, eloMap);
    const winProb = getExpectedScore(teamAElo, teamBElo);
    const fairness = Math.round((1 - Math.abs(0.5 - winProb) * 2) * 100);

    return {
      winProb: Math.round(winProb * 100),
      fairness
    };
  }, [team1, team2, eloMap]);

  const performReset = () => {
    setStep(0);
    setTeam1(Array(teamSize).fill(""));
    setTeam2(Array(teamSize).fill(""));
    setA("");
    setB("");
    setPool([]);
    setMatchSuggestion(null);
    setShowExtraScores(false);
  };

  const handleConfirmReset = () => {
    navigator.vibrate?.(10);
    performReset();
    setResetConfirmOpen(false);
  };

  const resetWizard = (silent = false) => {
    const hasProgress = team1.some(id => id !== "") || team2.some(id => id !== "") || pool.length > 0;
    if (!silent && hasProgress) {
      setResetConfirmOpen(true);
      return;
    }
    performReset();
  };

  const selectPlayerForTeam = (playerId: string, team: 1 | 2) => {
    const currentTeam = team === 1 ? team1 : team2;
    const otherTeam = team === 1 ? team2 : team1;
    const setTeam = team === 1 ? setTeam1 : setTeam2;
    const setOtherTeam = team === 1 ? setTeam2 : setTeam1;

    // Prevent duplicate selection of same non-guest player in same team
    if (playerId !== GUEST_ID && currentTeam.includes(playerId)) {
      toast.error("Spelaren är redan vald.");
      return;
    }

    // Remove from other team if already there (and not guest)
    if (playerId !== GUEST_ID && otherTeam.includes(playerId)) {
      setOtherTeam(otherTeam.map(id => id === playerId ? "" : id));
    }

    // Find first empty slot
    const emptyIndex = currentTeam.indexOf("");
    if (emptyIndex !== -1) {
      navigator.vibrate?.(10);
      const newTeam = [...currentTeam];
      newTeam[emptyIndex] = playerId;
      setTeam(newTeam);

      // Auto-advance if team is full
      if (emptyIndex === teamSize - 1) {
        setStep(prev => (prev === 10 ? 2 : prev + 1));
      }
    }
  };

  const removePlayerFromTeam = (index: number, team: 1 | 2) => {
    navigator.vibrate?.(10);
    const currentTeam = team === 1 ? team1 : team2;
    const setTeam = team === 1 ? setTeam1 : setTeam2;
    const newTeam = [...currentTeam];
    newTeam[index] = "";
    setTeam(newTeam);
  };

  const getBadgeIdForName = (name: string) => badgeNameMap.get(name) || null;

  const buildEveningRecap = (allMatches: Match[], latestMatch: Match) => {
    const now = new Date();
    // Optimization: Pass pre-calculated ELO players and deltas to avoid O(M) re-calculation.
    const stats = calculateEveningStats(
      [...allMatches, latestMatch],
      now,
      eloMap,
      profileMap,
      nameToIdMap,
      eloPlayers,
      eloDeltaByMatch
    );
    setEveningRecap(stats);
  };

  const createRecap = (teamAIds: string[], teamBIds: string[], scoreA: number, scoreB: number) => {
    const teamAElo = getTeamAverageElo(teamAIds, eloMap);
    const teamBElo = getTeamAverageElo(teamBIds, eloMap);
    const winProbability = getExpectedScore(teamAElo, teamBElo);
    const teamAWon = scoreA > scoreB;
    const marginMultiplier = getMarginMultiplier(scoreA, scoreB);

    const teamAActiveCount = teamAIds.filter(id => id && id !== GUEST_ID).length;
    const teamBActiveCount = teamBIds.filter(id => id && id !== GUEST_ID).length;
    // Note for non-coders: ELO calculation treats a match as "singles" only if exactly one registered player is on each side.
    const isSinglesMatch = teamAActiveCount === 1 && teamBActiveCount === 1;

    const tempMatch = {
      team1_sets: scoreA,
      team2_sets: scoreB,
      score_type: "sets",
      score_target: null,
      source_tournament_id: null,
    } as unknown as Match;

    const matchWeight = getSinglesAdjustedMatchWeight(tempMatch, isSinglesMatch);

    const mapPlayers = (ids: string[], teamAverageElo: number, expected: number, didWin: boolean) =>
      ids
        .filter(Boolean)
        .map(id => {
          const playerStats = eloPlayers.find(p => p.id === id);
          const games = playerStats?.games ?? 0;
          const currentElo = eloMap[id] ?? ELO_BASELINE;
          const delta = id === GUEST_ID ? 0 : buildPlayerDelta({
            playerElo: currentElo,
            playerGames: games,
            teamAverageElo,
            expectedScore: expected,
            didWin,
            marginMultiplier,
            matchWeight,
          });
          return {
            id,
            name: getIdDisplayName(id, profileMap),
            elo: currentElo,
            delta,
          };
        });

    const teamAPlayers = mapPlayers(teamAIds, teamAElo, winProbability, teamAWon);
    const teamBPlayers = mapPlayers(teamBIds, teamBElo, 1 - winProbability, !teamAWon);

    const recap = {
      createdAt: new Date().toISOString(),
      scoreline: formatScore(scoreA, scoreB),
      teamAWon,
      fairness: getFairnessScore(winProbability),
      winProbability,
      teamA: {
        ids: teamAIds,
        averageElo: Math.round(teamAElo),
        players: teamAPlayers,
      },
      teamB: {
        ids: teamBIds,
        averageElo: Math.round(teamBElo),
        players: teamBPlayers,
      },
      team1ServesFirst: nextServeFirst,
    };

    setMatchRecap(recap);
    setShowRecap(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      team1.includes("") ||
      team2.includes("") ||
      team1.some(p => p !== GUEST_ID && team2.includes(p))
    ) {
      toast.error("Ogiltiga lag.");
      return;
    }

    const scoreA = Number(a);
    const scoreB = Number(b);
    const team1Label = team1.map(id => getIdDisplayName(id, profileMap)).join(" & ");
    const team2Label = team2.map(id => getIdDisplayName(id, profileMap)).join(" & ");

    const team1IdsForDb = team1.map(id => (id === GUEST_ID ? null : id));
    const team2IdsForDb = team2.map(id => (id === GUEST_ID ? null : id));
    const team1Names = idsToNames(team1, profileMap);
    const team2Names = idsToNames(team2, profileMap);

    // Database constraint 'matches_team_arrays_length' requires exactly 2 elements.
    // For 1v1, we pad IDs with null and names with empty string.
    if (mode === "1v1") {
      team1IdsForDb.push(null);
      team2IdsForDb.push(null);
      team1Names.push("");
      team2Names.push("");
    }

    setIsSubmitting(true);
    let createResult;
    try {
      createResult = await createMatchMutation.mutateAsync({
        team1: team1Names,
        team2: team2Names,
        team1_ids: team1IdsForDb,
        team2_ids: team2IdsForDb,
        team1_sets: scoreA,
        team2_sets: scoreB,
        score_type: "sets",
        score_target: null,
        source_tournament_id: null,
        source_tournament_type: mode === "1v1" ? "standalone_1v1" : "standalone",
        team1_serves_first: nextServeFirst,
        created_by: user.id,
      });

      if (createResult.status === "conflict") {
        toast.error(createResult.message);
        setIsSubmitting(false);
        return;
      }

      invalidateStatsData(queryClient);
    } catch (error: any) {
      toast.error(error.message || "Kunde inte spara matchen.");
      setIsSubmitting(false);
      return;
    }

    const newMatch: Match = {
      id: "temp",
      team1: team1Names,
      team2: team2Names,
      team1_ids: team1IdsForDb,
      team2_ids: team2IdsForDb,
      team1_sets: scoreA,
      team2_sets: scoreB,
      team1_serves_first: nextServeFirst,
      created_at: new Date().toISOString(),
    };

    navigator.vibrate?.(50);
    createRecap(team1, team2, scoreA, scoreB);
    buildEveningRecap(matches, newMatch);
    resetWizard(true);
    setRecapMode("match");
    setIsCeremonyActive(true);
    setShowRecap(true);
    setIsSubmitting(false);
    if (createResult?.status === "pending") {
      // Note for non-coders: pending means we stored your match safely on this device until internet comes back.
      toast.warning(`${createResult.message} (${team1Label} vs ${team2Label})`);
    } else {
      toast.success(`Match sparad: ${team1Label} vs ${team2Label} (${scoreA}–${scoreB})`);
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {/* Wizard Paper */}
      {!showRecap || (!matchRecap && !eveningRecap) ? (
        <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 4 }}>
          {/* Header */}
          <Box sx={{ display: "flex", alignItems: "center", mb: 2, justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {step > 0 && (
                <Tooltip title="Gå tillbaka" arrow>
                  <IconButton onClick={() => setStep(step === 10 ? 0 : prev => prev - 1)} size="small" aria-label="Gå tillbaka">
                    <ArrowBackIcon />
                  </IconButton>
                </Tooltip>
              )}
              <Typography
                variant="h6"
                sx={{ fontWeight: 800, outline: 'none' }}
                ref={stepHeaderRef}
                tabIndex={-1}
              >
                {step === 0 && (mode === "1v1" ? "Välj Spelare A" : "Välj Lag A")}
                {step === 1 && (mode === "1v1" ? "Välj Spelare B" : "Välj Lag B")}
                {step === 2 && "Ange resultat"}
                {step === 3 && "Granska & Spara"}
                {step === 10 && "Matchmaker: Välj spelare"}
              </Typography>
            </Box>
            {step === 0 && mode === "2v2" && (
              <>
                {/* Note for non-coders: a tooltip is the small helper bubble that appears on hover. */}
                <Tooltip title="Generera jämna lag eller rotationsschema baserat på ELO" arrow>
                  <Button
                    startIcon={<BalanceIcon />}
                    size="small"
                    variant="outlined"
                    onClick={() => setStep(10)}
                    aria-label="Öppna Matchmaker för att skapa lag eller rotationer"
                  >
                    Matchmaker
                  </Button>
                </Tooltip>
              </>
            )}
            {step > 0 && (
              <Tooltip title="Rensa och börja om" arrow>
                <IconButton onClick={() => resetWizard()} size="small" color="error" aria-label="Stäng och rensa">
                  <CloseIcon />
                </IconButton>
              </Tooltip>
            )}
          </Box>

          {(step === 0 || step === 1) && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                bgcolor: (theme) => alpha(theme.palette.text.secondary, 0.08),
                borderRadius: 2.5,
                px: 2,
                py: 1,
                mb: 3
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Spelform
              </Typography>
              <FormControl size="small" variant="standard" sx={{ minWidth: 100 }}>
                <Select
                  value={mode}
                  onChange={(e) => setMode?.(e.target.value as "1v1" | "2v2")}
                  disableUnderline
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    color: 'primary.main',
                    textAlign: 'right',
                    '& .MuiSelect-select': { pr: '24px !important' }
                  }}
                  aria-label="Välj matchtyp"
                >
                  <MenuItem value="2v2">2 mot 2</MenuItem>
                  <MenuItem value="1v1">1 mot 1</MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}

          {step !== 10 && (
            <>
              {/* Note for non-coders: the Stepper is the progress bar that shows which stage of the form you're in. */}
              <Stepper activeStep={activeWizardStep} alternativeLabel sx={{ mb: 2 }}>
                {wizardSteps.map((label, index) => {
                  const isClickable = index <= activeWizardStep;
                  return (
                    <Step key={label} completed={index < activeWizardStep}>
                      <StepButton
                        onClick={() => isClickable && handleWizardStepClick(index)}
                        disabled={!isClickable}
                        icon={null} // Use default icon logic from Step
                        sx={{
                          p: 0,
                          '& .MuiStepButton-touchRipple': { display: isClickable ? 'block' : 'none' },
                        }}
                      >
                        <StepLabel
                          sx={{
                            cursor: isClickable ? "pointer" : "default",
                          }}
                        >
                          {label}
                        </StepLabel>
                      </StepButton>
                    </Step>
                  );
                })}
              </Stepper>
            </>
          )}

          <Divider sx={{ mb: 2 }} />
          {/* Note for non-coders: this short line tells players who serves first before they pick scores. */}
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
            {serveFirstLabel} börjar serva. Serven alternerar mellan matcherna så långt det går.
          </Typography>

          {/* Step Content */}
          <Box sx={{ minHeight: 200 }}>
            {/* Step 0: Team A */}
            {step === 0 && (
              <Box>
                <Box sx={{ display: "flex", gap: 1, mb: 3 }}>
                  {Array.from({ length: teamSize }).map((_, idx) => (
                    <Chip
                      key={idx}
                      label={team1[idx] ? getIdDisplayName(team1[idx], profileMap) : `Spelare ${idx + 1}`}
                      onDelete={team1[idx] ? () => removePlayerFromTeam(idx, 1) : undefined}
                      color={team1[idx] ? "primary" : "default"}
                      variant={team1[idx] ? "filled" : "outlined"}
                      sx={{ flex: 1, height: 40, fontWeight: 700 }}
                    />
                  ))}
                </Box>
                <PlayerGrid
                  selectablePlayers={selectablePlayers}
                  registeredPlayerCount={registeredPlayerCount}
                  query={query}
                  setQuery={setQuery}
                  onSelect={id => selectPlayerForTeam(id, 1)}
                  selectedIds={team1}
                />
                {team1.every(id => id !== "") && (
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={() => setStep(1)}
                    endIcon={<ArrowForwardIcon />}
                    aria-label="Nästa steg: Välj spelare för Lag B"
                    sx={{ mt: 3, py: 1.5, fontWeight: 700 }}
                  >
                    Nästa (Välj Lag B)
                  </Button>
                )}
              </Box>
            )}

            {/* Step 1: Team B */}
            {step === 1 && (
              <Box>
                <Box sx={{ display: "flex", gap: 1, mb: 3 }}>
                  {Array.from({ length: teamSize }).map((_, idx) => (
                    <Chip
                      key={idx}
                      label={team2[idx] ? getIdDisplayName(team2[idx], profileMap) : `Spelare ${idx + 1}`}
                      onDelete={team2[idx] ? () => removePlayerFromTeam(idx, 2) : undefined}
                      color={team2[idx] ? "primary" : "default"}
                      variant={team2[idx] ? "filled" : "outlined"}
                      sx={{ flex: 1, height: 40, fontWeight: 700 }}
                    />
                  ))}
                </Box>
                <PlayerGrid
                  selectablePlayers={selectablePlayers}
                  registeredPlayerCount={registeredPlayerCount}
                  query={query}
                  setQuery={setQuery}
                  onSelect={id => selectPlayerForTeam(id, 2)}
                  selectedIds={team2}
                  excludeIds={team1}
                />
                {team2.every(id => id !== "") && (
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={() => setStep(2)}
                    endIcon={<ArrowForwardIcon />}
                    aria-label="Nästa steg: Ange matchresultat"
                    sx={{ mt: 3, py: 1.5, fontWeight: 700 }}
                  >
                    Nästa (Ange resultat)
                  </Button>
                )}
              </Box>
            )}

            {/* Step 2: Score */}
            {step === 2 && (
              <Box sx={{ textAlign: "center" }}>
                <Box sx={{ mb: 4 }}>
                  <Box sx={{ display: "flex", justifyContent: "center", gap: 1, mb: 1 }}>
                    {team1.map((id, i) => (
                      <Chip
                        key={i}
                        size="small"
                        label={getIdDisplayName(id, profileMap)}
                        avatar={
                          <Avatar
                            src={profileMap.get(id)?.avatar_url || ""}
                            name={getIdDisplayName(id, profileMap)}
                          />
                        }
                      />
                    ))}
                  </Box>
                  <ScoreSelector
                    value={a}
                    onChange={setA}
                    showExtraScores={showExtraScores}
                    setShowExtraScores={setShowExtraScores}
                  />
                </Box>
                <Divider sx={{ mb: 4 }}>
                  <Chip label="VS" size="small" />
                </Divider>
                <Box sx={{ mb: 4 }}>
                  <Box sx={{ display: "flex", justifyContent: "center", gap: 1, mb: 1 }}>
                    {team2.map((id, i) => (
                      <Chip
                        key={i}
                        size="small"
                        label={getIdDisplayName(id, profileMap)}
                        avatar={
                          <Avatar
                            src={profileMap.get(id)?.avatar_url || ""}
                            name={getIdDisplayName(id, profileMap)}
                          />
                        }
                      />
                    ))}
                  </Box>
                  <ScoreSelector
                    value={b}
                    onChange={setB}
                    showExtraScores={showExtraScores}
                    setShowExtraScores={setShowExtraScores}
                  />
                </Box>
                {simulatorStats && (
                  <Box sx={{ mt: 2, mb: 4, px: 1 }}>
                    <Grid container spacing={3}>
                      <Grid size={{ xs: 6 }}>
                        <Typography variant="caption" sx={{ fontWeight: 800, display: 'block', mb: 0.5, textAlign: 'left', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          Rättvisa: {simulatorStats.fairness}%
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={simulatorStats.fairness}
                          sx={{
                            height: 6,
                            borderRadius: 3,
                            bgcolor: alpha('#4caf50', 0.1),
                            '& .MuiLinearProgress-bar': { bgcolor: '#4caf50', borderRadius: 3 }
                          }}
                        />
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <Typography variant="caption" sx={{ fontWeight: 800, display: 'block', mb: 0.5, textAlign: 'right', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          Vinstchans {mode === '1v1' ? 'A' : 'Lag A'}: {simulatorStats.winProb}%
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={simulatorStats.winProb}
                          sx={{
                            height: 6,
                            borderRadius: 3,
                            bgcolor: alpha('#d32f2f', 0.1),
                            '& .MuiLinearProgress-bar': { bgcolor: '#d32f2f', borderRadius: 3 }
                          }}
                        />
                      </Grid>
                    </Grid>
                  </Box>
                )}

                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  disabled={a === "" || b === ""}
                  onClick={() => setStep(3)}
                  endIcon={<ArrowForwardIcon />}
                  aria-label="Nästa steg: Granska och spara match"
                  sx={{ mt: 2, height: 56, fontSize: "1.1rem", borderRadius: 3, fontWeight: 800, textTransform: 'none' }}
                >
                  Nästa
                </Button>
              </Box>
            )}

            {/* Step 3: Review */}
            {step === 3 && (
              <Box sx={{ textAlign: "center" }}>
                <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: "grey.50" }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid size={{ xs: 5 }}>
                      <Typography variant="h6" fontWeight={800}>{a}</Typography>
                      <Typography variant="body2">
                        {/* Note for non-coders: we add separators so names don't run together. */}
                        {idsToNames(team1, profileMap).join(" & ")}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 2 }}>
                      <Typography variant="h4" color="text.secondary">—</Typography>
                    </Grid>
                    <Grid size={{ xs: 5 }}>
                      <Typography variant="h6" fontWeight={800}>{b}</Typography>
                      <Typography variant="body2">
                        {/* Note for non-coders: we add separators so names don't run together. */}
                        {idsToNames(team2, profileMap).join(" & ")}
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>

                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  onClick={submit}
                  disabled={isSubmitting}
                  startIcon={isSubmitting ? <CircularProgress size={20} /> : <CheckCircleIcon />}
                  sx={{ height: 56, fontSize: "1.1rem" }}
                >
                  {isSubmitting ? "Sparar..." : "Spara match"}
                </Button>
                <Button
                  variant="text"
                  fullWidth
                  onClick={() => setStep(2)}
                  sx={{ mt: 1 }}
                >
                  Ändra resultat
                </Button>
              </Box>
            )}

            {/* Step 10: Pool Selection & Matchmaker */}
            {step === 10 && (
              <MatchmakerStep
                pool={pool}
                setPool={setPool}
                matchSuggestion={matchSuggestion}
                setMatchSuggestion={setMatchSuggestion}
                profileMap={profileMap}
                eloMap={eloMap}
                setTeam1={setTeam1}
                setTeam2={setTeam2}
                setStep={setStep}
                selectablePlayers={selectablePlayers}
                registeredPlayerCount={registeredPlayerCount}
                query={query}
                setQuery={setQuery}
              />
            )}
          </Box>
        </Paper>
      ) : (
        <Button
          variant="outlined"
          fullWidth
          startIcon={<PersonAddIcon />}
          onClick={() => setShowRecap(false)}
          sx={{ py: 2, borderRadius: 3, borderWidth: 2, fontWeight: 700 }}
        >
          Registrera ny match
        </Button>
      )}

      {showRecap && (matchRecap || eveningRecap) && (
        <RecapView
          recapMode={recapMode}
          setRecapMode={setRecapMode}
          matchRecap={matchRecap}
          eveningRecap={eveningRecap}
          isCeremonyActive={isCeremonyActive}
          setIsCeremonyActive={setIsCeremonyActive}
          setShowRecap={setShowRecap}
          setShareOpen={setShareOpen}
          mode={mode}
          getBadgeIdForName={getBadgeIdForName}
        />
      )}

      <TheShareable
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        type={recapMode === "evening" ? "recap-evening" : "recap-match"}
        data={{
          recap: recapMode === "evening" ? eveningRecap : matchRecap,
          profileMap: Object.fromEntries(
            selectablePlayers.map(p => [p.id, getProfileDisplayName(p)])
          )
        }}
      />

      <Dialog
        open={resetConfirmOpen}
        onClose={() => setResetConfirmOpen(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle id="alert-dialog-title" sx={{ fontWeight: 800 }}>Starta om?</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Är du säker på att du vill rensa matchen och börja om? All inmatad data kommer att gå förlorad.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setResetConfirmOpen(false)} sx={{ fontWeight: 700 }} color="inherit">
            Avbryt
          </Button>
          <Button onClick={handleConfirmReset} variant="contained" color="error" autoFocus sx={{ fontWeight: 700 }}>
            Rensa och börja om
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
