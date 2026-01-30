import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { matchService } from "../services/matchService";
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
  ButtonBase,
  Tooltip,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  ArrowBack as ArrowBackIcon,
  Close as CloseIcon,
  Groups as GroupsIcon,
  Scoreboard as ScoreboardIcon,
  Balance as BalanceIcon,
  CheckCircle as CheckCircleIcon,
  PersonAdd as PersonAddIcon,
  Share as ShareIcon,
  ArrowForward as ArrowForwardIcon,
} from "@mui/icons-material";
import { GUEST_ID, GUEST_NAME } from "../utils/guest";
import {
  getExpectedScore,
  getMarginMultiplier,
  getMatchWeight,
  buildPlayerDelta,
  ELO_BASELINE,
} from "../utils/elo";
import {
  getIdDisplayName,
  getProfileDisplayName,
  idsToNames,
  makeNameToIdMap,
  makeProfileMap,
  resolveTeamIds,
} from "../utils/profileMap";
import ProfileName from "./ProfileName";
import {
  buildRotationSchedule,
  getTeamAverageElo,
  getWinProbability,
  getFairnessScore,
} from "../utils/rotation";
import {
  Match,
  PlayerStats,
  Profile,
  AppUser,
  MatchRecap,
  EveningRecap,
  MatchSuggestion,
  MatchRecapPlayer,
  EveningRecapLeader,
} from "../types";
import TheShareable from "./Shared/TheShareable";
import { formatFullDate, formatScore } from "../utils/format";


interface MatchFormProps {
  user: AppUser;
  profiles: Profile[];
  matches: Match[];
  eloPlayers: PlayerStats[];
  mode?: "1v1" | "2v2";
}

export default function MatchForm({
  user,
  profiles = [],
  matches = [],
  eloPlayers = [],
  mode = "2v2",
}: MatchFormProps) {
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
  const eloMap = useMemo(() => {
    const map: Record<string, number> = { [GUEST_ID]: ELO_BASELINE };
    eloPlayers.forEach(player => {
      map[player.id] = Math.round(player.elo ?? ELO_BASELINE);
    });
    return map;
  }, [eloPlayers]);

  const resetWizard = (silent = false) => {
    const hasProgress = team1.some(id => id !== "") || team2.some(id => id !== "") || pool.length > 0;
    if (!silent && hasProgress && !window.confirm("Är du säker på att du vill rensa matchen och börja om?")) return;
    setStep(0);
    setTeam1(Array(teamSize).fill(""));
    setTeam2(Array(teamSize).fill(""));
    setA("");
    setB("");
    setPool([]);
    setMatchSuggestion(null);
    setShowExtraScores(false);
  };

  const togglePlayerInPool = (playerId: string) => {
    if (playerId === GUEST_ID) {
      setPool(prev => [...prev, GUEST_ID]);
      return;
    }
    setPool(prev =>
      prev.includes(playerId)
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    );
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
    const currentTeam = team === 1 ? team1 : team2;
    const setTeam = team === 1 ? setTeam1 : setTeam2;
    const newTeam = [...currentTeam];
    newTeam[index] = "";
    setTeam(newTeam);
  };

  const getBadgeIdForName = (name: string) => badgeNameMap.get(name) || null;

  const isSameDay = (aDate: Date, bDate: Date) =>
    aDate.getFullYear() === bDate.getFullYear() &&
    aDate.getMonth() === bDate.getMonth() &&
    aDate.getDate() === bDate.getDate();

  const buildEveningRecap = (allMatches: Match[], latestMatch: Match) => {
    const now = new Date();
    const normalizedMatches = [...allMatches, latestMatch].map(match => {
      const team1Ids = resolveTeamIds(match.team1_ids, match.team1, nameToIdMap);
      const team2Ids = resolveTeamIds(match.team2_ids, match.team2, nameToIdMap);
      return {
        ...match,
        team1_ids: team1Ids,
        team2_ids: team2Ids,
      };
    });

    const eveningMatches = normalizedMatches.filter(match => {
      const stamp = match.created_at ? new Date(match.created_at) : now;
      return !Number.isNaN(stamp.valueOf()) && isSameDay(stamp, now);
    });

    if (!eveningMatches.length) {
      setEveningRecap(null);
      return;
    }

    const stats: Record<string, EveningRecapLeader & { partners: Set<string>; opponentElos: number[] }> = {};
    let totalSets = 0;

    eveningMatches.forEach(match => {
      const team1Ids = (match.team1_ids || []) as string[];
      const team2Ids = (match.team2_ids || []) as string[];
      const team1Sets = Number(match.team1_sets || 0);
      const team2Sets = Number(match.team2_sets || 0);
      const team1Won = team1Sets > team2Sets;
      totalSets += team1Sets + team2Sets;

      const team1Elo = getTeamAverageElo(team1Ids, eloMap);
      const team2Elo = getTeamAverageElo(team2Ids, eloMap);

      const recordTeam = (teamIds: string[], opponentIds: string[], opponentElo: number, didWin: boolean, setsFor: number, setsAgainst: number) => {
        teamIds.forEach(id => {
          if (!id || id === GUEST_ID) return;
          if (!stats[id]) {
            stats[id] = {
              id,
              name: getIdDisplayName(id, profileMap),
              games: 0,
              wins: 0,
              losses: 0,
              setsFor: 0,
              setsAgainst: 0,
              rotations: 0,
              avgEloOpponents: 0,
              winRate: 0,
              partners: new Set(),
              opponentElos: [],
            };
          }
          stats[id].games += 1;
          stats[id].wins += didWin ? 1 : 0;
          stats[id].losses += didWin ? 0 : 1;
          stats[id].setsFor += setsFor;
          stats[id].setsAgainst += setsAgainst;
          stats[id].opponentElos.push(opponentElo);

          teamIds.forEach(partnerId => {
            if (partnerId && partnerId !== id) {
              stats[id].partners.add(partnerId);
            }
          });
        });
      };

      recordTeam(team1Ids, team2Ids, team2Elo, team1Won, team1Sets, team2Sets);
      recordTeam(team2Ids, team1Ids, team1Elo, !team1Won, team2Sets, team1Sets);
    });

    const players = Object.values(stats).map(p => ({
      ...p,
      rotations: p.partners.size,
      avgEloOpponents: p.opponentElos.length ? p.opponentElos.reduce((a, b) => a + b, 0) / p.opponentElos.length : 0,
      winRate: p.games ? p.wins / p.games : 0,
    }));
    const mvp = players
      .slice()
      .sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        const winPctA = a.games ? a.wins / a.games : 0;
        const winPctB = b.games ? b.wins / b.games : 0;
        if (winPctB !== winPctA) return winPctB - winPctA;
        return b.games - a.games;
      })[0];

    const leaders = (players as EveningRecapLeader[])
      .slice()
      .sort((a, b) => b.wins - a.wins)
      .slice(0, 3);

    const mostRotations = [...players].sort((a, b) => b.rotations - a.rotations).slice(0, 3);
    const strongest = players.filter(p => p.games >= 2).sort((a, b) => b.winRate - a.winRate).slice(0, 3);
    const marathon = [...players].sort((a, b) => (b.setsFor + b.setsAgainst) - (a.setsFor + a.setsAgainst))[0] || null;

    setEveningRecap({
      dateLabel: formatFullDate(now),
      matches: eveningMatches.length,
      totalSets,
      mvp,
      leaders,
      funFacts: {
        mostRotations,
        strongest,
        marathon: marathon ? { name: marathon.name, sets: marathon.setsFor + marathon.setsAgainst } : null
      }
    });
  };

  const createRecap = (teamAIds: string[], teamBIds: string[], scoreA: number, scoreB: number) => {
    const teamAElo = getTeamAverageElo(teamAIds, eloMap);
    const teamBElo = getTeamAverageElo(teamBIds, eloMap);
    const winProbability = getExpectedScore(teamAElo, teamBElo);
    const teamAWon = scoreA > scoreB;
    const marginMultiplier = getMarginMultiplier(scoreA, scoreB);
    const matchWeight = getMatchWeight({
      team1_sets: scoreA,
      team2_sets: scoreB,
      score_type: "sets",
    } as any);

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
      team1ServesFirst: true, // Standard for now
    };

    setMatchRecap(recap);
    setShowRecap(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      team1.includes("") ||
      team2.includes("") ||
      team1.some(p => team2.includes(p))
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
    try {
      await matchService.createMatch({
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
        team1_serves_first: true,
        created_by: user.id,
      });
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
      created_at: new Date().toISOString(),
    };

    createRecap(team1, team2, scoreA, scoreB);
    buildEveningRecap(matches, newMatch);
    resetWizard(true);
    setRecapMode("evening");
    setShowRecap(true);
    setIsSubmitting(false);
    toast.success(`Match sparad: ${team1Label} vs ${team2Label} (${scoreA}–${scoreB})`);
  };

  const suggestBalancedMatch = () => {
    const uniquePool = Array.from(new Set(pool)).filter(Boolean);
    if (uniquePool.length !== 4) {
      toast.error("Välj exakt 4 spelare för balansering.");
      return;
    }

    const [p1, p2, p3, p4] = uniquePool;
    const options = [
      { teamA: [p1, p2], teamB: [p3, p4] },
      { teamA: [p1, p3], teamB: [p2, p4] },
      { teamA: [p1, p4], teamB: [p2, p3] },
    ];

    const scored = options
      .map(option => {
        const teamAElo = getTeamAverageElo(option.teamA, eloMap);
        const teamBElo = getTeamAverageElo(option.teamB, eloMap);
        const winProbability = getWinProbability(teamAElo, teamBElo);
        const fairness = getFairnessScore(winProbability);
        return { ...option, teamAElo, teamBElo, winProbability, fairness };
      })
      .sort((a, b) => b.fairness - a.fairness);

    const best = scored[0];
    setMatchSuggestion({
      mode: "single",
      fairness: best.fairness,
      winProbability: best.winProbability,
      teamA: best.teamA,
      teamB: best.teamB,
    });
    toast.success("Mest balanserade matchen hittad!");
  };

  const suggestRotation = () => {
    const uniquePool = Array.from(new Set(pool)).filter(Boolean);
    if (uniquePool.length < 4 || uniquePool.length > 8) {
      toast.error("Välj 4–8 spelare för rotationsschema.");
      return;
    }

    const rotation = buildRotationSchedule(uniquePool, eloMap);
    if (!rotation.rounds.length) {
      toast.error("Kunde inte skapa rotation. Prova med färre spelare.");
      return;
    }

    setMatchSuggestion({
      mode: "rotation",
      rounds: rotation.rounds,
      fairness: rotation.averageFairness,
      targetGames: rotation.targetGames,
    });
    toast.success("Rotationsschema genererat!");
  };




  const renderPlayerGrid = (
    onSelect: (id: string) => void,
    selectedIds: string[] = [],
    excludeIds: string[] = []
  ) => {
    // Sort players: Guest first, then alphabetical
    const sortedPlayers = [...selectablePlayers].sort((a, b) => {
      if (a.id === GUEST_ID) return -1;
      if (b.id === GUEST_ID) return 1;
      return a.name.localeCompare(b.name);
    });

    return (
      <Grid container spacing={1}>
        {sortedPlayers.map(p => {
          const isSelected = selectedIds.includes(p.id) && p.id !== GUEST_ID;
          const isExcluded = excludeIds.includes(p.id) && p.id !== GUEST_ID;

          return (
            <Grid key={p.id} size={{ xs: 4, sm: 3 }}>
              <ButtonBase
                component={Paper}
                elevation={isSelected ? 4 : 1}
                aria-pressed={isSelected}
                aria-label={`Välj ${p.id === GUEST_ID ? GUEST_NAME : getProfileDisplayName(p)}`}
                disabled={isExcluded}
                sx={{
                  p: 1.5,
                  width: '100%',
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  bgcolor: isSelected ? "primary.light" : "background.paper",
                  color: isSelected ? "primary.contrastText" : "text.primary",
                  opacity: isExcluded ? 0.5 : 1,
                  border: isSelected ? "2px solid" : "1px solid",
                  borderColor: isSelected ? "primary.main" : "divider",
                  transition: "all 0.2s",
                  borderRadius: 1,
                  "&:hover": {
                    bgcolor: isExcluded ? "" : isSelected ? "primary.light" : "action.hover",
                  },
                }}
                onClick={() => onSelect(p.id)}
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
                  <CheckCircleIcon
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
    );
  };

  const renderScoreButtons = (value: string, onChange: (val: string) => void) => {
    const mainScores = ["0", "1", "2", "3", "4", "5", "6", "7"];
    const extraScores = ["8", "9", "10", "11", "12"];

    return (
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, justifyContent: "center" }}>
        {mainScores.map(s => (
          <Button
            key={s}
            variant={value === s ? "contained" : "outlined"}
            onClick={() => onChange(s)}
            aria-label={`Välj resultat: ${s}`}
            sx={{
              minWidth: 50,
              height: 50,
              fontSize: "1.2rem",
              borderRadius: "50%",
            }}
          >
            {s}
          </Button>
        ))}
        {showExtraScores && extraScores.map(s => (
          <Button
            key={s}
            variant={value === s ? "contained" : "outlined"}
            onClick={() => onChange(s)}
            aria-label={`Välj resultat: ${s}`}
            sx={{
              minWidth: 50,
              height: 50,
              fontSize: "1.2rem",
              borderRadius: "50%",
            }}
          >
            {s}
          </Button>
        ))}
        {!showExtraScores ? (
          <Button
            variant="outlined"
            onClick={() => setShowExtraScores(true)}
            aria-label="Visa fler poängalternativ"
            sx={{
              minWidth: 50,
              height: 50,
              fontSize: "0.8rem",
              borderRadius: "50%",
              textTransform: "none"
            }}
          >
            Mer...
          </Button>
        ) : (
          <Button
            variant="outlined"
            onClick={() => setShowExtraScores(false)}
            aria-label="Visa färre poängalternativ"
            sx={{
              minWidth: 50,
              height: 50,
              fontSize: "0.8rem",
              borderRadius: "50%",
              textTransform: "none"
            }}
          >
            Göm
          </Button>
        )}
      </Box>
    );
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
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
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
                <IconButton onClick={resetWizard} size="small" color="error" aria-label="Stäng och rensa">
                  <CloseIcon />
                </IconButton>
              </Tooltip>
            )}
          </Box>

          <Divider sx={{ mb: 2 }} />

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
                {renderPlayerGrid(id => selectPlayerForTeam(id, 1), team1)}
                {team1.every(id => id !== "") && (
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={() => setStep(1)}
                    endIcon={<ArrowForwardIcon />}
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
                {renderPlayerGrid(id => selectPlayerForTeam(id, 2), team2, team1)}
                {team2.every(id => id !== "") && (
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={() => setStep(2)}
                    endIcon={<ArrowForwardIcon />}
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
                  {renderScoreButtons(a, setA)}
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
                  {renderScoreButtons(b, setB)}
                </Box>
                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  disabled={a === "" || b === ""}
                  onClick={() => setStep(3)}
                  endIcon={<ArrowForwardIcon />}
                  sx={{ mt: 2, height: 56, fontSize: "1.1rem" }}
                >
                  Fortsätt
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
                  Spara match
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
              <Box>
                {!matchSuggestion ? (
                  <>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Välj 4–8 spelare för att generera jämna lag eller rotationsschema.
                    </Typography>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mb: 2 }}>
                      {pool.map((id, idx) => (
                        <Chip
                          key={`${id}-${idx}`}
                          label={getIdDisplayName(id, profileMap)}
                          onDelete={() => {
                            const newPool = [...pool];
                            newPool.splice(idx, 1);
                            setPool(newPool);
                          }}
                          size="small"
                          color="primary"
                        />
                      ))}
                      {pool.length === 0 && (
                        <Typography variant="caption" sx={{ fontStyle: "italic", p: 1 }}>
                          Inga spelare valda...
                        </Typography>
                      )}
                    </Box>
                    <Grid container spacing={1} sx={{ mb: 3 }}>
                      <Grid size={{ xs: 6 }}>
                        <Button
                          variant="contained"
                          fullWidth
                          disabled={pool.length !== 4}
                          onClick={suggestBalancedMatch}
                          startIcon={<BalanceIcon />}
                          sx={{ height: 48, fontSize: "0.85rem" }}
                        >
                          Balansera lag
                        </Button>
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <Button
                          variant="contained"
                          fullWidth
                          disabled={pool.length < 4 || pool.length > 8}
                          onClick={suggestRotation}
                          startIcon={<GroupsIcon />}
                          sx={{ height: 48, fontSize: "0.85rem" }}
                        >
                          Skapa rotation
                        </Button>
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <Button
                          variant="outlined"
                          color="error"
                          fullWidth
                          onClick={() => {
                            setPool([]);
                            setMatchSuggestion(null);
                          }}
                        >
                          Rensa val ({pool.length})
                        </Button>
                      </Grid>
                    </Grid>
                    {renderPlayerGrid(togglePlayerInPool, pool)}
                  </>
                ) : (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Typography variant="subtitle1" fontWeight={800}>Förslag</Typography>
                      <Button size="small" onClick={() => setMatchSuggestion(null)}>Ändra spelare</Button>
                    </Box>

                    <Chip
                      label={`${matchSuggestion.mode === "rotation" ? "Rotation" : "Balansering"} ${matchSuggestion.fairness}%`}
                      color="success"
                      variant="outlined"
                      sx={{ mb: 1 }}
                    />

                    {matchSuggestion.mode === "rotation" && matchSuggestion.rounds ? (
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        {matchSuggestion.rounds.map((round) => (
                          <Paper key={round.round} variant="outlined" sx={{ p: 2 }}>
                            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                              <Typography variant="subtitle2" fontWeight={800}>Runda {round.round}</Typography>
                              <Button
                                size="small"
                                variant="contained"
                                onClick={() => {
                                  setTeam1(round.teamA);
                                  setTeam2(round.teamB);
                                  setMatchSuggestion(null);
                                  setStep(2);
                                }}
                              >
                                Starta
                              </Button>
                            </Box>
                            <Grid container spacing={1}>
                              <Grid size={{ xs: 6 }}>
                                <Typography variant="caption" color="text.secondary">Lag A</Typography>
                                <Typography variant="body2" fontWeight={600}>{round.teamA.map((id: string) => getIdDisplayName(id, profileMap)).join(" & ")}</Typography>
                              </Grid>
                              <Grid size={{ xs: 6 }}>
                                <Typography variant="caption" color="text.secondary">Lag B</Typography>
                                <Typography variant="body2" fontWeight={600}>{round.teamB.map((id: string) => getIdDisplayName(id, profileMap)).join(" & ")}</Typography>
                              </Grid>
                            </Grid>
                            {round.rest.length > 0 && (
                              <Typography variant="caption" sx={{ mt: 1, display: "block", fontStyle: "italic" }}>
                                Vilar: {round.rest.map((id: string) => getIdDisplayName(id, profileMap)).join(", ")}
                              </Typography>
                            )}
                          </Paper>
                        ))}
                      </Box>
                    ) : (
                      <Paper variant="outlined" sx={{ p: 2, bgcolor: "grey.50" }}>
                        <Grid container spacing={2} sx={{ mb: 2 }}>
                          <Grid size={{ xs: 6 }}>
                            <Typography variant="caption" color="text.secondary">Lag A</Typography>
                            <Typography variant="body1" fontWeight={600}>{matchSuggestion.teamA.map((id: string) => getIdDisplayName(id, profileMap)).join(" & ")}</Typography>
                          </Grid>
                          <Grid size={{ xs: 6 }}>
                            <Typography variant="caption" color="text.secondary">Lag B</Typography>
                            <Typography variant="body1" fontWeight={600}>{matchSuggestion.teamB.map((id: string) => getIdDisplayName(id, profileMap)).join(" & ")}</Typography>
                          </Grid>
                        </Grid>
                        <Button
                          variant="contained"
                          fullWidth
                          onClick={() => {
                            setTeam1(matchSuggestion.teamA);
                            setTeam2(matchSuggestion.teamB);
                            setMatchSuggestion(null);
                            setStep(2);
                          }}
                        >
                          Använd dessa lag
                        </Button>
                      </Paper>
                    )}
                    <Typography variant="caption" color="text.secondary" align="center">
                      {matchSuggestion.mode === "rotation"
                        ? `Mål: ${matchSuggestion.targetGames.toFixed(1)} matcher per spelare.`
                        : `Förväntad vinstchans Lag A: ${Math.round(matchSuggestion.winProbability * 100)}%`}
                    </Typography>
                  </Box>
                )}
              </Box>
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
        <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 4, display: "flex", flexDirection: "column", gap: 2 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 2, flexWrap: "wrap" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Avatar src="/icon-192.png" variant="rounded" sx={{ width: 48, height: 48, border: "1px solid", borderColor: "divider" }} />
              <Box>
                <Typography variant="subtitle1" fontWeight={800}>{recapMode === "evening" ? "Kvällsrecap" : "Match‑recap"}</Typography>
                <Typography variant="caption" color="text.secondary">Redo att dela höjdpunkter.</Typography>
              </Box>
            </Box>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button
                variant={recapMode === "evening" ? "contained" : "outlined"}
                size="small"
                onClick={() => setRecapMode("evening")}
                disabled={!eveningRecap}
              >
                Kväll
              </Button>
              <Button
                variant={recapMode === "match" ? "contained" : "outlined"}
                size="small"
                onClick={() => setRecapMode("match")}
                disabled={!matchRecap}
              >
                Match
              </Button>
              {recapMode === "evening" && (
                <IconButton size="small" onClick={() => setShowRecap(false)} aria-label="Stäng">
                  <CloseIcon />
                </IconButton>
              )}
            </Box>
          </Box>

          <Divider />

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {recapMode === "evening" && eveningRecap ? (
              <>
                {/* Note for non-coders: A softer background makes the recap text easier to read. */}
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    textAlign: "center",
                    bgcolor: (theme) => alpha(theme.palette.primary.light, 0.2),
                    color: "text.primary",
                  }}
                >
                  <Typography variant="h6" fontWeight={800}>{eveningRecap.dateLabel}</Typography>
                  <Typography variant="body2">{eveningRecap.matches} matcher · {eveningRecap.totalSets} sets</Typography>
                  <Box sx={{ mt: 1, display: "flex", justifyContent: "center", alignItems: "center", gap: 1 }}>
                    <Chip label="MVP" color="success" size="small" sx={{ fontWeight: 800 }} />
                    <ProfileName
                      name={eveningRecap.mvp?.name || "—"}
                      badgeId={getBadgeIdForName(eveningRecap.mvp?.name || "")}
                    />
                  </Box>
                </Paper>
                <Box>
                  <Typography variant="subtitle2" fontWeight={700} gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <GroupsIcon fontSize="small" /> Topp vinster
                  </Typography>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                            {eveningRecap.leaders.map((player: EveningRecapLeader) => (
                      <Paper key={player.id} variant="outlined" sx={{ px: 2, py: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <ProfileName
                          name={player.name}
                          badgeId={getBadgeIdForName(player.name)}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {player.wins} V · {player.games} M
                        </Typography>
                      </Paper>
                    ))}
                  </Box>
                </Box>
              </>
            ) : null}

            {recapMode === "match" && matchRecap ? (
              <>
                <Paper variant="outlined" sx={{ p: 2, textAlign: "center", bgcolor: "grey.50" }}>
                  <Typography variant="h4" fontWeight={900}>{matchRecap.scoreline}</Typography>
                  <Chip
                    label={matchRecap.teamAWon ? (mode === "1v1" ? "Vinst Spelare A" : "Vinst Lag A") : (mode === "1v1" ? "Vinst Spelare B" : "Vinst Lag B")}
                    color={matchRecap.teamAWon ? "success" : "warning"}
                    sx={{ fontWeight: 800, mt: 1 }}
                  />
                </Paper>

                <Grid container spacing={2}>
                  {[
                    { title: mode === "1v1" ? "Spelare A" : "Lag A", won: matchRecap.teamAWon, players: matchRecap.teamA.players },
                    { title: mode === "1v1" ? "Spelare B" : "Lag B", won: !matchRecap.teamAWon, players: matchRecap.teamB.players }
                  ].map((team, idx) => (
                    <Grid key={idx} size={{ xs: 12, sm: 6 }}>
                      <Paper variant="outlined" sx={{ p: 1.5 }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                          <Typography variant="subtitle2" fontWeight={800}>{team.title}</Typography>
                          <Chip
                            label={team.won ? "Vinst" : "Förlust"}
                            size="small"
                            color={team.won ? "success" : "error"}
                            variant="outlined"
                          />
                        </Box>
                        {team.players.map((player: any) => (
                          <Box key={player.id} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
                            <ProfileName name={player.name} badgeId={getBadgeIdForName(player.name)} />
                            <Typography variant="caption" sx={{ fontWeight: 600 }}>
                              {player.delta >= 0 ? "+" : ""}{player.delta}
                            </Typography>
                          </Box>
                        ))}
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </>
            ) : null}
          </Box>

          <Divider />

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {recapMode === "match" && matchRecap && (
              <Typography variant="caption" color="text.secondary" align="center">
                Fairness: {matchRecap.fairness}% · {mode === "1v1" ? "Vinstchans A" : "Vinstchans Lag A"}: {Math.round(matchRecap.winProbability * 100)}%
              </Typography>
            )}
            <Tooltip title="Exportera resultatet som en bild för att dela" arrow>
              <Button
                variant="contained"
                fullWidth
                size="large"
                startIcon={<ShareIcon />}
                onClick={() => setShareOpen(true)}
                sx={{ py: 1.5, borderRadius: 2, fontWeight: 700 }}
              >
                Dela recap
              </Button>
            </Tooltip>
          </Box>
        </Paper>
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
    </Box>
  );
}
