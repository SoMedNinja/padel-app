import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
  QuestionMark as QuestionMarkIcon,
} from "@mui/icons-material";
import { alpha } from "@mui/material/styles";
import { useEloStats } from "../hooks/useEloStats";
import SectionCard from "../Components/Shared/SectionCard";
import { useStore } from "../store/useStore";
import {
  getExpectedScore,
  getKFactor,
  getPlayerWeight,
  getSinglesAdjustedMatchWeight,
} from "../shared/elo/math";
import { ELO_BASELINE } from "../shared/elo/constants";
import {
  getIdDisplayName,
  makeNameToIdMap,
  makeProfileMap,
  resolveTeamIds,
  resolveTeamNames,
} from "../utils/profileMap";
import { GUEST_ID } from "../utils/guest";
import { formatHistoryDateLabel } from "../utils/format";

export default function HistoryMatchDetailPage() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { user, isGuest } = useStore();
  const [expandedExplanationByPlayer, setExpandedExplanationByPlayer] = useState<Record<string, boolean>>({});

  const { allMatches, profiles, isLoading, isError, error, eloDeltaByMatch, eloRatingByMatch } = useEloStats();

  const profileMap = useMemo(() => makeProfileMap(profiles), [profiles]);
  const nameToIdMap = useMemo(() => makeNameToIdMap(profiles), [profiles]);

  const match = useMemo(
    () => allMatches.find((entry) => entry.id === matchId) ?? null,
    [allMatches, matchId]
  );

  const enriched = useMemo(() => {
    if (!match) return null;

    const t1Ids = resolveTeamIds(match.team1_ids, match.team1, nameToIdMap);
    const t2Ids = resolveTeamIds(match.team2_ids, match.team2, nameToIdMap);
    const t1Names = resolveTeamNames(match.team1_ids, match.team1, profileMap);
    const t2Names = resolveTeamNames(match.team2_ids, match.team2, profileMap);

    const teamAEntries = t1Ids.map((id, index) => ({
      id,
      name: t1Names[index] || getIdDisplayName(id, profileMap),
    })).filter((entry) => entry.name !== "Okänd");

    const teamBEntries = t2Ids.map((id, index) => ({
      id,
      name: t2Names[index] || getIdDisplayName(id, profileMap),
    })).filter((entry) => entry.name !== "Okänd");

    return {
      ...match,
      teamAEntries,
      teamBEntries,
      scoreLabel: `${match.team1_sets} – ${match.team2_sets}`,
      scoreTypeLabel: match.score_type === "points" ? "Poäng" : "Set",
      sourceLabel: match.source_tournament_id ? "Turneringsmatch" : "Fristående match",
      sourceTypeLabel: match.source_tournament_type || "standalone",
    };
  }, [match, nameToIdMap, profileMap]);

  const avatarForId = (id?: string | null) => {
    if (!id || id === GUEST_ID) return undefined;
    return profileMap.get(id)?.avatar_url || undefined;
  };

  if (isLoading) {
    return (
      <Container maxWidth="sm" sx={{ py: 2 }}>
        <Stack spacing={2}>
          <Skeleton variant="rounded" height={64} />
          <Skeleton variant="rounded" height={220} />
          <Skeleton variant="rounded" height={220} />
        </Stack>
      </Container>
    );
  }

  if (isError) {
    return (
      <Container maxWidth="sm" sx={{ py: 2 }}>
        <Alert severity="error">{error?.message || "Kunde inte ladda matchdetaljer."}</Alert>
      </Container>
    );
  }

  if (!enriched) {
    return (
      <Container maxWidth="sm" sx={{ py: 2 }}>
        <Stack spacing={2}>
          <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate("/history")}>Tillbaka</Button>
          <Alert severity="warning">Matchen kunde inte hittas i historiken.</Alert>
        </Stack>
      </Container>
    );
  }

  const deltas = eloDeltaByMatch[enriched.id] || {};
  const ratings = eloRatingByMatch[enriched.id] || {};

  const detailRows = [...enriched.teamAEntries, ...enriched.teamBEntries]
    .filter((entry) => entry.id)
    .map((entry) => {
      const id = entry.id as string;
      const before = ratings[id];
      const delta = deltas[id];
      const after = typeof before === "number" && typeof delta === "number" ? before + delta : null;
      return { id, name: entry.name, before, delta, after };
    });

  const teamAIds = enriched.teamAEntries.map((entry) => entry.id).filter((id): id is string => Boolean(id));
  const teamBIds = enriched.teamBEntries.map((entry) => entry.id).filter((id): id is string => Boolean(id));
  const isSinglesMatch = teamAIds.length === 1 && teamBIds.length === 1;
  const matchWeight = getSinglesAdjustedMatchWeight(enriched, isSinglesMatch);
  const teamAAverageBefore = teamAIds.length
    ? teamAIds.reduce((sum, id) => sum + (typeof ratings[id] === "number" ? ratings[id] : ELO_BASELINE), 0) / teamAIds.length
    : ELO_BASELINE;
  const teamBAverageBefore = teamBIds.length
    ? teamBIds.reduce((sum, id) => sum + (typeof ratings[id] === "number" ? ratings[id] : ELO_BASELINE), 0) / teamBIds.length
    : ELO_BASELINE;

  // Note for non-coders: this creates the same four-line ELO explanation seen in iOS, but with live values per player.
  const getEloExplanationLines = (id: string, delta: number) => {
    const playerBefore = typeof ratings[id] === "number" ? ratings[id] : ELO_BASELINE;
    const isTeamAPlayer = teamAIds.includes(id);
    const didWin = isTeamAPlayer ? enriched.team1_sets > enriched.team2_sets : enriched.team2_sets > enriched.team1_sets;
    const teamAverage = isTeamAPlayer ? teamAAverageBefore : teamBAverageBefore;
    const opponentAverage = isTeamAPlayer ? teamBAverageBefore : teamAAverageBefore;
    const winChance = Math.round(getExpectedScore(teamAverage, opponentAverage) * 100);
    const playerWeight = getPlayerWeight(playerBefore, teamAverage);

    return [
      `Resultat: ${didWin ? "Vinst" : "Förlust"} (${delta > 0 ? "+" : ""}${delta} ELO)`,
      `Vinstchans: ${winChance}%`,
      `Matchvikt: ${matchWeight} (K=${getKFactor(0)})`,
      `Spelarvikt: ${playerWeight.toFixed(2)} (relativt laget)`,
    ];
  };

  return (
    <Container maxWidth="sm" sx={{ py: 2.5 }}>
      <Stack spacing={2.2}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate("/history")}
          >
            Tillbaka
          </Button>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>Matchdetaljer</Typography>
        </Box>

        <SectionCard title="Lag">
          <Stack spacing={1.25}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography color="text.secondary">Lag A</Typography>
              <Typography sx={{ fontWeight: 700 }}>{enriched.teamAEntries.map((entry) => entry.name).join(" & ")}</Typography>
            </Box>
            <Divider />
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography color="text.secondary">Lag B</Typography>
              <Typography sx={{ fontWeight: 700 }}>{enriched.teamBEntries.map((entry) => entry.name).join(" & ")}</Typography>
            </Box>
          </Stack>
        </SectionCard>

        <SectionCard title="Resultat">
          <Stack spacing={1.25}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography color="text.secondary">Poäng</Typography>
              <Typography sx={{ fontWeight: 700 }}>{enriched.scoreLabel}</Typography>
            </Box>
            <Divider />
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography color="text.secondary">Typ</Typography>
              <Typography sx={{ fontWeight: 700 }}>{enriched.scoreTypeLabel}</Typography>
            </Box>
            <Divider />
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography color="text.secondary">Spelad</Typography>
              <Typography sx={{ fontWeight: 700 }}>{formatHistoryDateLabel(enriched.created_at)}</Typography>
            </Box>
          </Stack>
        </SectionCard>

        <SectionCard title="Matchmetadata">
          <Stack spacing={1.25}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography color="text.secondary">Källa</Typography>
              <Typography sx={{ fontWeight: 700 }}>{enriched.sourceLabel}</Typography>
            </Box>
            <Divider />
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography color="text.secondary">Källtyp</Typography>
              <Typography sx={{ fontWeight: 700 }}>{enriched.sourceTypeLabel}</Typography>
            </Box>
          </Stack>
        </SectionCard>

        <SectionCard title="ELO-förändring (estimat)">
          <Stack spacing={1.75}>
            {detailRows.map((row) => (
              <Box key={row.id}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.4 }}>
                  <Avatar src={avatarForId(row.id)} sx={{ width: 24, height: 24, fontSize: 12 }}>
                    {row.name.slice(0, 1).toUpperCase()}
                  </Avatar>
                  <Typography sx={{ fontWeight: 700 }}>{row.name}</Typography>
                  <Typography
                    sx={{
                      ml: "auto",
                      fontWeight: 900,
                      color: typeof row.delta === "number" && row.delta >= 0 ? "success.main" : "error.main",
                    }}
                  >
                    {typeof row.delta === "number" ? `${row.delta > 0 ? "+" : ""}${row.delta}` : "—"}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {typeof row.before === "number" && typeof row.after === "number"
                    ? `ELO före: ${row.before} → efter: ${row.after}`
                    : "Ingen detaljerad ELO-data finns för den här äldre matchen ännu."}
                </Typography>
                {typeof row.delta === "number" && (
                  <Box
                    sx={{
                      mt: 1,
                      py: 0.9,
                      px: 1.2,
                      borderRadius: 2,
                      bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                    }}
                  >
                    <Button
                      variant="text"
                      size="small"
                      startIcon={<QuestionMarkIcon fontSize="small" />}
                      endIcon={expandedExplanationByPlayer[row.id] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      onClick={() => {
                        setExpandedExplanationByPlayer((prev) => ({ ...prev, [row.id]: !prev[row.id] }));
                      }}
                      sx={{ px: 0, fontWeight: 800, textTransform: "none" }}
                    >
                      varför ändrades min ELO?
                    </Button>
                    {expandedExplanationByPlayer[row.id] && (
                      <Stack spacing={0.5} sx={{ mt: 1 }}>
                        {getEloExplanationLines(row.id, row.delta).map((line) => (
                          <Typography key={`${row.id}-${line}`} variant="body2" sx={{ fontWeight: 600 }}>
                            {line}
                          </Typography>
                        ))}
                      </Stack>
                    )}
                  </Box>
                )}
                {row.id !== detailRows[detailRows.length - 1]?.id ? <Divider sx={{ mt: 1.5 }} /> : null}
              </Box>
            ))}
            {!detailRows.length && (
              <Chip label="Ingen ELO-detalj finns för den här matchen ännu." size="small" />
            )}
          </Stack>
        </SectionCard>

        {!isGuest && !user?.is_admin && (
          <Typography variant="caption" color="text.secondary">
            {/* Note for non-coders: this explains why regular users only view details here, while admins can still edit directly in history. */}
            Endast admins kan redigera och radera matcher.
          </Typography>
        )}
      </Stack>
    </Container>
  );
}
