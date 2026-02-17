import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { invalidateStatsData } from "../data/queryInvalidation";
import {
  getIdDisplayName,
  getProfileDisplayName,
  idsToNames,
  makeNameToIdMap,
  makeProfileMap,
  resolveTeamIds,
  resolveTeamNames,
} from "../utils/profileMap";
import { GUEST_ID, GUEST_NAME } from "../utils/guest";
import { Match, Profile, PlayerStats } from "../types";
import { matchService } from "../services/matchService";
import { getEloExplanation, getSinglesAdjustedMatchWeight } from "../utils/elo";
import { InfoOutlined as InfoIcon } from "@mui/icons-material";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  TextField,
  MenuItem,
  Stack,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Paper,
  Tooltip,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Collapse,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  HelpOutline as HelpIcon,
} from "@mui/icons-material";
import { formatHistoryDateLabel } from "../utils/format";
import AppBottomSheet from "./Shared/AppBottomSheet";
import { motion, useMotionValue, useTransform } from "framer-motion";

const normalizeName = (name: string) => name?.trim().toLowerCase();
const toDateTimeInput = (value: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

interface SwipeableMatchCardProps {
  children: React.ReactNode;
  onDelete: () => void;
  canDelete: boolean;
}

function SwipeableMatchCard({ children, onDelete, canDelete }: SwipeableMatchCardProps) {
  const x = useMotionValue(0);
  const deleteOpacity = useTransform(x, [-100, -50], [1, 0]);

  return (
    <Box sx={{ position: "relative" }}>
      {canDelete && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            bottom: 0,
            right: 0,
            width: "100%",
            bgcolor: "error.main",
            borderRadius: 3,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            pr: 4,
            zIndex: 0,
          }}
          component={motion.div}
          style={{ opacity: deleteOpacity }}
        >
          <DeleteIcon sx={{ color: "white" }} />
        </Box>
      )}
      <motion.div
        style={{ x, touchAction: "pan-y", backgroundColor: "white", borderRadius: "12px", zIndex: 1, position: "relative" }}
        drag={canDelete ? "x" : false}
        dragConstraints={{ left: -100, right: 0 }}
        dragElastic={0.1}
        onDragEnd={(e, info) => {
          if (info.offset.x < -80) {
            onDelete();
          }
        }}
      >
        {children}
      </motion.div>
    </Box>
  );
}

function EloBreakdown({ explanation }: { explanation: string }) {
  const [expanded, setExpanded] = useState(false);
  const lines = explanation.split("\n");

  return (
    <Box sx={{ mt: 0.5 }}>
      <Button
        size="small"
        startIcon={<HelpIcon sx={{ fontSize: '0.9rem !important' }} />}
        endIcon={<ExpandMoreIcon sx={{
          fontSize: '0.9rem !important',
          transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s'
        }} />}
        onClick={() => setExpanded(!expanded)}
        sx={{
          textTransform: 'none',
          fontSize: '0.7rem',
          fontWeight: 700,
          color: 'primary.main',
          p: 0,
          minWidth: 0,
          '&:hover': { bgcolor: 'transparent', opacity: 0.8 }
        }}
      >
        Varför ändrades min ELO?
      </Button>
      <Collapse in={expanded}>
        <Paper
          variant="outlined"
          sx={{
            mt: 1,
            p: 1.5,
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.05),
            borderColor: (theme) => alpha(theme.palette.primary.main, 0.1),
            borderRadius: 2
          }}
        >
          {lines.map((line, i) => (
            <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', mb: i === lines.length - 1 ? 0 : 1 }}>
              <InfoIcon sx={{ fontSize: '0.8rem', mt: 0.3, color: 'primary.main' }} />
              <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 600, color: 'text.primary', textAlign: 'left' }}>
                {line}
              </Typography>
            </Box>
          ))}
        </Paper>
      </Collapse>
    </Box>
  );
}

interface HistoryProps {
  matches?: Match[];
  eloDeltaByMatch?: Record<string, Record<string, number>>;
  eloRatingByMatch?: Record<string, Record<string, number>>;
  profiles?: Profile[];
  user: any;
  allEloPlayers?: PlayerStats[];
  highlightedMatchId?: string | null;
}

interface EditState {
  created_at: string;
  team1_ids: (string | null)[];
  team2_ids: (string | null)[];
  team1_sets: number | string;
  team2_sets: number | string;
  score_type: string;
  score_target: number | string;
}

interface TeamEntry {
  id: string | null;
  name: string;
}

export default function History({
  matches = [],
  eloDeltaByMatch = {},
  eloRatingByMatch = {},
  profiles = [],
  user,
  allEloPlayers = [],
  highlightedMatchId = null,
}: HistoryProps) {
  const queryClient = useQueryClient();
  const profileMap = useMemo(() => makeProfileMap(profiles), [profiles]);
  const nameToIdMap = useMemo(() => makeNameToIdMap(profiles), [profiles]);
  const allEloPlayersMap = useMemo(() => new Map(allEloPlayers.map(p => [p.id, p])), [allEloPlayers]);

  const playerOptions = useMemo(() => {
    const options = profiles.map(profile => ({
      id: profile.id,
      name: getProfileDisplayName(profile),
    }));
    return [
      { id: "", name: "Ingen (1v1)" },
      { id: GUEST_ID, name: GUEST_NAME },
      ...options
    ];
  }, [profiles]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteDialogMatchId, setDeleteDialogMatchId] = useState<string | null>(null);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [visibleCount, setVisibleCount] = useState<number>(10);

  useEffect(() => {
    // Note for non-coders: we reset pagination when the match list changes.
    setVisibleCount(10);
  }, [matches.length]);

  const sortedMatches = useMemo(() => {
    // Optimization: check if matches are already sorted in O(N) to avoid expensive O(N log N) sort.
    let isSorted = true;
    for (let i = 1; i < matches.length; i++) {
      if (matches[i].created_at > matches[i - 1].created_at) {
        isSorted = false;
        break;
      }
    }
    if (isSorted) return matches;

    return [...matches].sort(
      (a, b) => (b.created_at < a.created_at ? -1 : b.created_at > a.created_at ? 1 : 0)
    );
  }, [matches]);

  if (!matches.length) return <Typography>Inga matcher ännu.</Typography>;

  const canDelete = (m: Match) => {
    return user?.id && (m.created_by === user.id || user?.is_admin === true);
  };

  const canEdit = user?.is_admin === true;

  const getTeamIds = (teamIds: (string | null)[], teamNames: string | string[]): (string | null)[] => {
    const ids = Array.isArray(teamIds) ? teamIds : [];
    const names = Array.isArray(teamNames) ? teamNames : [];

    return Array.from({ length: 2 }, (_, index) => {
      if (ids[index] === null) return GUEST_ID;
      if (ids[index]) return ids[index];
      const name = names[index];
      if (!name) return "";
      const key = normalizeName(name);
      return nameToIdMap.get(key) || "";
    });
  };

  const startEdit = (match: Match) => {
    setEditingId(match.id);
    setEdit({
      created_at: toDateTimeInput(match.created_at),
      team1_ids: getTeamIds(match.team1_ids, match.team1),
      team2_ids: getTeamIds(match.team2_ids, match.team2),
      team1_sets: match.team1_sets ?? 0,
      team2_sets: match.team2_sets ?? 0,
      score_type: match.score_type || "sets",
      score_target: match.score_target ?? "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEdit(null);
  };

  const updateTeam = (teamKey: "team1_ids" | "team2_ids", index: number, value: string) => {
    setEdit(prev => {
      if (!prev) return prev;
      const nextTeam = [...prev[teamKey]];
      nextTeam[index] = value;
      return { ...prev, [teamKey]: nextTeam };
    });
  };

  const hasDuplicatePlayers = (team1Ids: (string | null)[], team2Ids: (string | null)[]) => {
    const ids = [...team1Ids, ...team2Ids].filter(Boolean);
    return new Set(ids).size !== ids.length;
  };

  const saveEdit = async (matchId: string) => {
    if (!edit) return;

    if (!edit.created_at) {
      toast.error("Välj datum och tid.");
      return;
    }

    // Ensure at least one player per team is selected
    if (!edit.team1_ids[0] || !edit.team2_ids[0]) {
      toast.error("Välj minst en spelare per lag.");
      return;
    }

    if (hasDuplicatePlayers(edit.team1_ids, edit.team2_ids)) {
      toast.error("Samma spelare kan inte vara med i båda lagen.");
      return;
    }

    const is1v1Match = !edit.team1_ids[1] && !edit.team2_ids[1];
    const team1IdsForDb = edit.team1_ids.map(id => (id === GUEST_ID ? null : id || null));
    const team2IdsForDb = edit.team2_ids.map(id => (id === GUEST_ID ? null : id || null));

    const team1Names = idsToNames(edit.team1_ids as string[], profileMap);
    const team2Names = idsToNames(edit.team2_ids as string[], profileMap);

    if (is1v1Match) {
      team1Names.push("");
      team2Names.push("");
    }

    setIsSavingEdit(true);
    try {
      await matchService.updateMatch(matchId, {
        created_at: new Date(edit.created_at).toISOString(),
        team1: team1Names,
        team2: team2Names,
        team1_ids: team1IdsForDb,
        team2_ids: team2IdsForDb,
        source_tournament_type: is1v1Match ? "standalone_1v1" : "standalone",
        team1_sets: Number(edit.team1_sets),
        team2_sets: Number(edit.team2_sets),
        score_type: edit.score_type || "sets",
        score_target:
          edit.score_type === "points" && edit.score_target !== ""
            ? Number(edit.score_target)
            : null,
      });
      toast.success("Matchen har uppdaterats.");
      invalidateStatsData(queryClient);
      cancelEdit();
    } catch (error: any) {
      toast.error(error.message || "Kunde inte uppdatera matchen.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const deleteMatch = async (matchId: string) => {
    setDeletingId(matchId);
    try {
      await matchService.deleteMatch(matchId);
      toast.success("Matchen har raderats.");
      invalidateStatsData(queryClient);
    } catch (error: any) {
      toast.error(error.message || "Kunde inte radera matchen.");
    } finally {
      setDeletingId(null);
      setDeleteDialogMatchId(null);
    }
  };

  const formatScore = (match: Match) => {
    const scoreType = match.score_type || "sets";
    const score = `${match.team1_sets} – ${match.team2_sets}`;
    if (scoreType === "points") {
      const target = match.score_target ? ` (till ${match.score_target})` : "";
      return `${score} poäng${target}`;
    }
    return `${score} set`;
  };

  const formatDelta = (delta?: number) => {
    if (typeof delta !== "number") return "—";
    return delta > 0 ? `+${delta}` : `${delta}`;
  };

  const formatElo = (elo?: number) => {
    if (typeof elo !== "number") return "—";
    return Math.round(elo).toString();
  };

  const getDeltaColor = (delta?: number) => {
    if (typeof delta !== "number") return "text.secondary";
    if (delta > 0) return "success.main";
    if (delta < 0) return "error.main";
    return "text.secondary";
  };

  const visibleMatches = sortedMatches.slice(0, visibleCount);
  const canLoadMore = visibleCount < sortedMatches.length;

  return (
    <Box id="match-history" component="section">
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'flex-start' }, flexDirection: { xs: 'column', sm: 'row' }, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>Tidigare matcher</Typography>
          <Typography variant="caption" color="text.secondary">
            Visar {Math.min(visibleCount, sortedMatches.length)} av {sortedMatches.length} matcher. Senaste först.
          </Typography>
        </Box>
      </Box>

      <Stack spacing={2}>
        {visibleMatches.map(m => {
          const isEditing = editingId === m.id;
          const isDeleteDialogOpen = deleteDialogMatchId === m.id;
          const matchDeltas = eloDeltaByMatch[m.id] || {};
          const matchRatings = eloRatingByMatch[m.id] || {};

          // Optimization: Pre-calculate team data once per match instead of per-player
          // We consolidate ID and name resolution to avoid redundant function calls and array iterations.
          const t1Ids = resolveTeamIds(m.team1_ids, m.team1, nameToIdMap);
          const t2Ids = resolveTeamIds(m.team2_ids, m.team2, nameToIdMap);
          const t1Names = resolveTeamNames(m.team1_ids, m.team1, profileMap);
          const t2Names = resolveTeamNames(m.team2_ids, m.team2, profileMap);

          const tournamentType = m.source_tournament_type || "standalone";
          const isActually1v1 = tournamentType === "standalone_1v1";
          const isUserParticipant = t1Ids.includes(user?.id) || t2Ids.includes(user?.id);
          const isHighlighted = highlightedMatchId === m.id;

          const teamAEntries = t1Ids.map((id, index) => ({
            id,
            name: t1Names[index] || getIdDisplayName(id, profileMap),
          }))
          .filter((entry, idx) => entry.name !== "Okänd" && (!isActually1v1 || idx === 0))
          .slice(0, 2);

          const teamBEntries = t2Ids.map((id, index) => ({
            id,
            name: t2Names[index] || getIdDisplayName(id, profileMap),
          }))
          .filter((entry, idx) => entry.name !== "Okänd" && (!isActually1v1 || idx === 0))
          .slice(0, 2);

          const is1v1 = isActually1v1 || (teamAEntries.length === 1 && teamBEntries.length === 1);

          // Optimization: Use a more efficient single-pass calculation for ELO averages and match weight.
          let activeT1Count = 0;
          let sumA = 0;
          for (const id of t1Ids) {
            if (id && id !== GUEST_ID) {
              activeT1Count++;
              sumA += ((matchRatings[id] || 1000) - (matchDeltas[id] || 0));
            }
          }

          let activeT2Count = 0;
          let sumB = 0;
          for (const id of t2Ids) {
            if (id && id !== GUEST_ID) {
              activeT2Count++;
              sumB += ((matchRatings[id] || 1000) - (matchDeltas[id] || 0));
            }
          }

          const avgA = activeT1Count > 0 ? sumA / activeT1Count : 1000;
          const avgB = activeT2Count > 0 ? sumB / activeT2Count : 1000;

          const isSinglesMatch = activeT1Count === 1 && activeT2Count === 1;
          const matchWeight = getSinglesAdjustedMatchWeight(m, isSinglesMatch);

          // This label is the badge text shown in history so non-coders can see the match format at a glance.
          const typeLabel = tournamentType === "standalone"
            ? (is1v1 ? "Match 1v1" : "Match 2v2")
            : tournamentType === "standalone_1v1"
              ? "Match 1v1"
              : tournamentType === "mexicano"
                ? "Mexicano"
                : tournamentType === "americano"
                  ? "Americano"
                  : tournamentType;

          return (
            <SwipeableMatchCard
              key={m.id}
              canDelete={canDelete(m) && !isEditing}
              onDelete={() => setDeleteDialogMatchId(m.id)}
            >
            <Card
              id={`match-${m.id}`}
              variant="outlined"
              sx={{
                borderRadius: 3,
                boxShadow: isHighlighted ? 8 : '0 4px 12px rgba(0,0,0,0.04)',
                bgcolor: isUserParticipant ? (theme) => alpha(theme.palette.primary.main, 0.04) : 'background.paper',
                borderColor: isHighlighted ? 'primary.main' : (isUserParticipant ? 'primary.light' : 'divider'),
                borderWidth: isHighlighted ? 2 : (isUserParticipant ? 1.5 : 1),
              }}
            >
              <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Chip label={typeLabel} size="small" color="primary" variant="outlined" sx={{ fontWeight: 700, mr: 1 }} />
                    <Typography variant="caption" color="text.secondary">
                      {isEditing ? (
                        <TextField
                          type="datetime-local"
                          size="small"
                          value={edit?.created_at || ""}
                          onChange={(e) => setEdit(prev => prev ? { ...prev, created_at: e.target.value } : prev)}
                          sx={{ mt: 1 }}
                          slotProps={{ htmlInput: { "aria-label": "Välj datum och tid för matchen" } }}
                        />
                      ) : (
                        `Datum: ${formatHistoryDateLabel(m.created_at)}`
                      )}
                    </Typography>
                  </Box>
                  {!isEditing && (
                    <Stack direction="row" spacing={1}>
                      {canEdit && (
                        <Tooltip title="Redigera match" arrow>
                          <Button size="small" startIcon={<EditIcon />} onClick={() => startEdit(m)}>
                            Ändra
                          </Button>
                        </Tooltip>
                      )}
                      {canDelete(m) && (
                        <Tooltip title="Radera match" arrow>
                          <span>
                            <IconButton
                              size="small"
                              color="error"
                              // Note for non-coders: open a dialog so we can confirm before deleting.
                              onClick={() => setDeleteDialogMatchId(m.id)}
                              aria-label="Radera match"
                              disabled={deletingId === m.id}
                            >
                              {deletingId === m.id ? (
                                <CircularProgress size={16} color="inherit" />
                              ) : (
                                <DeleteIcon fontSize="small" />
                              )}
                            </IconButton>
                          </span>
                        </Tooltip>
                      )}
                    </Stack>
                  )}
                </Box>

                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>Resultat</Typography>
                    {isEditing ? (
                      <Stack spacing={1} sx={{ mt: 1 }}>
                        <TextField
                          select
                          label="Typ"
                          size="small"
                          value={edit?.score_type || "sets"}
                          onChange={(e) => setEdit(prev => prev ? { ...prev, score_type: e.target.value } : prev)}
                          slotProps={{ select: { "aria-label": "Välj typ av resultat (set eller poäng)" } }}
                        >
                          <MenuItem value="sets">Set</MenuItem>
                          <MenuItem value="points">Poäng</MenuItem>
                        </TextField>
                        {edit?.score_type === "points" && (
                          <TextField
                            label="Mål"
                            type="number"
                            size="small"
                            value={edit?.score_target ?? ""}
                            onChange={(e) => setEdit(prev => prev ? { ...prev, score_target: e.target.value } : prev)}
                            slotProps={{ htmlInput: { "aria-label": "Mål (t.ex. spela till 24 poäng)" } }}
                          />
                        )}
                        <Stack direction="row" spacing={1} alignItems="center">
                          <TextField
                            type="number"
                            size="small"
                            value={edit?.team1_sets ?? 0}
                            onChange={(e) => setEdit(prev => prev ? { ...prev, team1_sets: e.target.value } : prev)}
                            slotProps={{ htmlInput: { "aria-label": "Resultat för lag A" } }}
                          />
                          <Typography>–</Typography>
                          <TextField
                            type="number"
                            size="small"
                            value={edit?.team2_sets ?? 0}
                            onChange={(e) => setEdit(prev => prev ? { ...prev, team2_sets: e.target.value } : prev)}
                            slotProps={{ htmlInput: { "aria-label": "Resultat för lag B" } }}
                          />
                        </Stack>
                      </Stack>
                    ) : (
                      <Typography variant="h6" sx={{ fontWeight: 800 }}>{formatScore(m)}</Typography>
                    )}
                  </Grid>

                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>{is1v1 ? "Spelare A" : "Lag A"}</Typography>
                    {isEditing ? (
                      <Stack spacing={1} sx={{ mt: 1 }}>
                        {edit?.team1_ids.map((value, index) => (
                          <TextField
                            key={`team1-${index}`}
                            select
                            label={`Spelare ${index + 1}`}
                            size="small"
                            value={value || ""}
                            onChange={(e) => updateTeam("team1_ids", index, e.target.value)}
                            slotProps={{ htmlInput: { "aria-label": `Välj spelare ${index + 1} för lag A` } }}
                          >
                            <MenuItem value="">Välj spelare</MenuItem>
                            {playerOptions.map(option => (
                              <MenuItem key={option.id} value={option.id}>{option.name}</MenuItem>
                            ))}
                          </TextField>
                        ))}
                      </Stack>
                    ) : (
                      <List disablePadding sx={{ mt: 1 }}>
                        {teamAEntries.map((entry, index) => {
                          const delta = entry.id ? matchDeltas[entry.id] : undefined;
                          const currentElo = entry.id ? matchRatings[entry.id] : undefined;

                          let explanation = "";
                          if (entry.id && typeof delta === 'number') {
                            const preElo = (currentElo || 1000) - delta;
                            const playerStats = allEloPlayersMap.get(entry.id);

                            explanation = getEloExplanation(
                              delta,
                              preElo,
                              avgA,
                              avgB,
                              matchWeight,
                              m.team1_sets > m.team2_sets,
                              playerStats?.games || 0
                            );
                          }

                          return (
                            <ListItem key={`${m.id}-team1-${entry.name}-${index}`} disableGutters sx={{ py: 0.5, flexDirection: 'column', alignItems: 'stretch' }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                <ListItemText
                                  primary={entry.name}
                                  secondary={`ELO efter match: ${formatElo(currentElo)}`}
                                  primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                                  secondaryTypographyProps={{ variant: 'caption' }}
                                />
                                <Typography variant="body2" sx={{ fontWeight: 700, color: getDeltaColor(delta) }}>
                                  {formatDelta(delta)}
                                </Typography>
                              </Box>
                              {explanation && (
                                <EloBreakdown explanation={explanation} />
                              )}
                            </ListItem>
                          );
                        })}
                      </List>
                    )}
                  </Grid>

                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>{is1v1 ? "Spelare B" : "Lag B"}</Typography>
                    {isEditing ? (
                      <Stack spacing={1} sx={{ mt: 1 }}>
                        {edit?.team2_ids.map((value, index) => (
                          <TextField
                            key={`team2-${index}`}
                            select
                            label={`Spelare ${index + 1}`}
                            size="small"
                            value={value || ""}
                            onChange={(e) => updateTeam("team2_ids", index, e.target.value)}
                            slotProps={{ htmlInput: { "aria-label": `Välj spelare ${index + 1} för lag B` } }}
                          >
                            <MenuItem value="">Välj spelare</MenuItem>
                            {playerOptions.map(option => (
                              <MenuItem key={option.id} value={option.id}>{option.name}</MenuItem>
                            ))}
                          </TextField>
                        ))}
                      </Stack>
                    ) : (
                      <List disablePadding sx={{ mt: 1 }}>
                        {teamBEntries.map((entry, index) => {
                          const delta = entry.id ? matchDeltas[entry.id] : undefined;
                          const currentElo = entry.id ? matchRatings[entry.id] : undefined;

                          let explanation = "";
                          if (entry.id && typeof delta === 'number') {
                            const preElo = (currentElo || 1000) - delta;
                            const playerStats = allEloPlayersMap.get(entry.id);

                            explanation = getEloExplanation(
                              delta,
                              preElo,
                              avgB, // Team B relative to Team A
                              avgA,
                              matchWeight,
                              m.team2_sets > m.team1_sets,
                              playerStats?.games || 0
                            );
                          }

                          return (
                            <ListItem key={`${m.id}-team2-${entry.name}-${index}`} disableGutters sx={{ py: 0.5, flexDirection: 'column', alignItems: 'stretch' }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                <ListItemText
                                  primary={entry.name}
                                  secondary={`ELO efter match: ${formatElo(currentElo)}`}
                                  primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                                  secondaryTypographyProps={{ variant: 'caption' }}
                                />
                                <Typography variant="body2" sx={{ fontWeight: 700, color: getDeltaColor(delta) }}>
                                  {formatDelta(delta)}
                                </Typography>
                              </Box>
                              {explanation && (
                                <EloBreakdown explanation={explanation} />
                              )}
                            </ListItem>
                          );
                        })}
                      </List>
                    )}
                  </Grid>
                </Grid>

                {isEditing && (
                  <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
                    <Button
                      variant="contained"
                      startIcon={isSavingEdit ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                      onClick={() => saveEdit(m.id)}
                      disabled={isSavingEdit}
                    >
                      {isSavingEdit ? "Sparar..." : "Spara"}
                    </Button>
                    <Button variant="outlined" startIcon={<CloseIcon />} onClick={cancelEdit} disabled={isSavingEdit}>Avbryt</Button>
                  </Box>
                )}
              </CardContent>
              <AppBottomSheet
                open={isDeleteDialogOpen}
                onClose={() => setDeleteDialogMatchId(null)}
                title="Radera match?"
              >
                <Box sx={{ pb: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3, px: 1, textAlign: 'center' }}>
                    Är du säker på att du vill ta bort matchen från historiken?
                    Detta går inte att ångra.
                  </Typography>
                  <Stack spacing={2}>
                    <Button
                      variant="contained"
                      color="error"
                      size="large"
                      fullWidth
                      onClick={() => deleteMatch(m.id)}
                      disabled={deletingId === m.id}
                      startIcon={deletingId === m.id ? <CircularProgress size={20} color="inherit" /> : <DeleteIcon />}
                      sx={{ fontWeight: 700 }}
                    >
                      {deletingId === m.id ? "Tar bort..." : "Radera match"}
                    </Button>
                    <Button
                      variant="outlined"
                      size="large"
                      fullWidth
                      onClick={() => setDeleteDialogMatchId(null)}
                      sx={{ fontWeight: 700 }}
                    >
                      Avbryt
                    </Button>
                  </Stack>
                </Box>
              </AppBottomSheet>
            </Card>
            </SwipeableMatchCard>
          );
        })}
      </Stack>

      {canLoadMore && (
        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
          <Button
            variant="outlined"
            onClick={() => setVisibleCount(count => count + 10)}
            aria-label="Visa fler matcher ur historiken"
          >
            Visa fler matcher
          </Button>
        </Box>
      )}

      <Typography variant="caption" color="text.secondary" sx={{ mt: 4, display: 'block', textAlign: 'center' }}>
        * Rättigheter styrs av databasen (RLS). Endast administratörer kan redigera matcher.
      </Typography>
    </Box>
  );
}
