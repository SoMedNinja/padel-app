import {
  Box,
  Typography,
  Chip,
  Grid,
  Button,
  Paper,
} from "@mui/material";
import {
  Balance as BalanceIcon,
  Groups as GroupsIcon,
} from "@mui/icons-material";
import { toast } from "sonner";
import {
  getFairnessScore,
  getWinProbability,
  buildRotationSchedule,
  getTeamAverageElo,
} from "../../utils/rotation";
import { getIdDisplayName } from "../../utils/profileMap";
import { MatchSuggestion, Profile } from "../../types";
import PlayerGrid from "./PlayerGrid";
import { GUEST_ID } from "../../utils/guest";

interface MatchmakerStepProps {
  pool: string[];
  setPool: React.Dispatch<React.SetStateAction<string[]>>;
  matchSuggestion: MatchSuggestion | null;
  setMatchSuggestion: (suggestion: MatchSuggestion | null) => void;
  profileMap: Map<string, Profile>;
  eloMap: Record<string, number>;
  setTeam1: (team: string[]) => void;
  setTeam2: (team: string[]) => void;
  setStep: React.Dispatch<React.SetStateAction<number>>;
  selectablePlayers: Profile[];
  registeredPlayerCount: number;
  query: string;
  setQuery: (query: string) => void;
}

export default function MatchmakerStep({
  pool,
  setPool,
  matchSuggestion,
  setMatchSuggestion,
  profileMap,
  eloMap,
  setTeam1,
  setTeam2,
  setStep,
  selectablePlayers,
  registeredPlayerCount,
  query,
  setQuery,
}: MatchmakerStepProps) {

  const togglePlayerInPool = (playerId: string) => {
    navigator.vibrate?.(10);
    if (playerId === GUEST_ID) {
      setPool((prev) => [...prev, GUEST_ID]);
      return;
    }
    setPool((prev) =>
      prev.includes(playerId)
        ? prev.filter((id) => id !== playerId)
        : [...prev, playerId]
    );
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
      .map((option) => {
        const teamAElo = getTeamAverageElo(option.teamA, eloMap);
        const teamBElo = getTeamAverageElo(option.teamB, eloMap);
        const winProbability = getWinProbability(teamAElo, teamBElo);
        const fairness = getFairnessScore(winProbability);
        return { ...option, teamAElo, teamBElo, winProbability, fairness };
      })
      .sort((a, b) => b.fairness - a.fairness);

    const best = scored[0];
    navigator.vibrate?.(10);
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

    navigator.vibrate?.(10);
    setMatchSuggestion({
      mode: "rotation",
      rounds: rotation.rounds,
      fairness: rotation.averageFairness,
      targetGames: rotation.targetGames,
    });
    toast.success("Rotationsschema genererat!");
  };

  if (matchSuggestion) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="subtitle1" fontWeight={800}>
            Förslag
          </Typography>
          <Button size="small" onClick={() => setMatchSuggestion(null)}>
            Ändra spelare
          </Button>
        </Box>

        <Chip
          label={`${
            matchSuggestion.mode === "rotation" ? "Rotation" : "Balansering"
          } ${matchSuggestion.fairness}%`}
          color="success"
          variant="outlined"
          sx={{ mb: 1 }}
        />

        {matchSuggestion.mode === "rotation" && matchSuggestion.rounds ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {matchSuggestion.rounds.map((round) => (
              <Paper key={round.round} variant="outlined" sx={{ p: 2 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mb: 1,
                  }}
                >
                  <Typography variant="subtitle2" fontWeight={800}>
                    Runda {round.round}
                  </Typography>
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
                    <Typography variant="caption" color="text.secondary">
                      Lag A
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {round.teamA
                        .map((id: string) => getIdDisplayName(id, profileMap))
                        .join(" & ")}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="text.secondary">
                      Lag B
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {round.teamB
                        .map((id: string) => getIdDisplayName(id, profileMap))
                        .join(" & ")}
                    </Typography>
                  </Grid>
                </Grid>
                {round.rest.length > 0 && (
                  <Typography
                    variant="caption"
                    sx={{ mt: 1, display: "block", fontStyle: "italic" }}
                  >
                    Vilar:{" "}
                    {round.rest
                      .map((id: string) => getIdDisplayName(id, profileMap))
                      .join(", ")}
                  </Typography>
                )}
              </Paper>
            ))}
          </Box>
        ) : (
          <Paper variant="outlined" sx={{ p: 2, bgcolor: "grey.50" }}>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid size={{ xs: 6 }}>
                <Typography variant="caption" color="text.secondary">
                  Lag A
                </Typography>
                <Typography variant="body1" fontWeight={600}>
                  {matchSuggestion.teamA
                    ?.map((id: string) => getIdDisplayName(id, profileMap))
                    .join(" & ")}
                </Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant="caption" color="text.secondary">
                  Lag B
                </Typography>
                <Typography variant="body1" fontWeight={600}>
                  {matchSuggestion.teamB
                    ?.map((id: string) => getIdDisplayName(id, profileMap))
                    .join(" & ")}
                </Typography>
              </Grid>
            </Grid>
            <Button
              variant="contained"
              fullWidth
              onClick={() => {
                setTeam1(matchSuggestion.teamA || []);
                setTeam2(matchSuggestion.teamB || []);
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
            ? `Mål: ${matchSuggestion.targetGames?.toFixed(
                1
              )} matcher per spelare.`
            : `Förväntad vinstchans Lag A: ${Math.round(
                (matchSuggestion.winProbability || 0) * 100
              )}%`}
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
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
      <PlayerGrid
        selectablePlayers={selectablePlayers}
        registeredPlayerCount={registeredPlayerCount}
        query={query}
        setQuery={setQuery}
        onSelect={togglePlayerInPool}
        selectedIds={pool}
      />
    </Box>
  );
}
