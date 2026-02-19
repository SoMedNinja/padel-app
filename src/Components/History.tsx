import React, { useEffect, useMemo, useState } from "react";
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
import { Match, Profile } from "../types";
import { matchService } from "../services/matchService";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Button,
  TextField,
  MenuItem,
  Stack,
  IconButton,
  CircularProgress,
  Avatar,
  Menu,
  Divider,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  MoreHoriz as MoreHorizIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";
import { formatHistoryDateLabel } from "../utils/format";
import AppBottomSheet from "./Shared/AppBottomSheet";
import { motion, useMotionValue } from "framer-motion";

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
          // Note for non-coders: this red background appears behind the card while swiping to hint that the action is delete.
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

interface HistoryProps {
  matches?: Match[];
  eloDeltaByMatch?: Record<string, Record<string, number>>;
  profiles?: Profile[];
  user: any;
  highlightedMatchId?: string | null;
  onOpenDetails?: (matchId: string) => void;
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

type EnrichedMatch = Match & {
  t1Ids: (string | null)[];
  t2Ids: (string | null)[];
  t1Names: string[];
  t2Names: string[];
};

interface MatchItemProps {
  m: EnrichedMatch;
  user: any;
  matchDeltas: Record<string, number>;
  isEditing: boolean;
  isHighlighted: boolean;
  isDeleteDialogOpen: boolean;
  deletingId: string | null;
  edit: EditState | null;
  isSavingEdit: boolean;
  playerOptions: { id: string; name: string }[];
  profileMap: Map<string, Profile>;
  onStartEdit: (m: Match) => void;
  onCancelEdit: () => void;
  onSaveEdit: ((id: string) => void) | undefined;
  onDeleteMatch: (id: string) => void;
  onDeleteDialogOpen: (id: string) => void;
  onDeleteDialogClose: () => void;
  updateTeam: ((key: "team1_ids" | "team2_ids", index: number, value: string) => void) | undefined;
  setEdit: React.Dispatch<React.SetStateAction<EditState | null>> | undefined;
  onOpenDetails?: (matchId: string) => void;
}

const MatchItem = React.memo(({
  m,
  user,
  matchDeltas,
  isEditing,
  isHighlighted,
  isDeleteDialogOpen,
  deletingId,
  edit,
  isSavingEdit,
  playerOptions,
  profileMap,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDeleteMatch,
  onDeleteDialogOpen,
  onDeleteDialogClose,
  updateTeam,
  setEdit,
  onOpenDetails,
}: MatchItemProps) => {
  const canDelete = (m: Match) => {
    return user?.id && (m.created_by === user.id || user?.is_admin === true);
  };

  const canEdit = user?.is_admin === true;

  const [actionAnchorEl, setActionAnchorEl] = useState<null | HTMLElement>(null);
  const isActionMenuOpen = Boolean(actionAnchorEl);

  const t1Ids = m.t1Ids;
  const t2Ids = m.t2Ids;
  const t1Names = m.t1Names;
  const t2Names = m.t2Names;

  const tournamentType = m.source_tournament_type || "standalone";
  const isActually1v1 = tournamentType === "standalone_1v1";
  const isUserParticipant = t1Ids.includes(user?.id) || t2Ids.includes(user?.id);

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

  const typeLabel = tournamentType === "standalone"
    ? (is1v1 ? "1v1" : "2v2")
    : tournamentType === "standalone_1v1"
      ? "1v1"
      : tournamentType === "mexicano"
        ? "Mexicano"
        : tournamentType === "americano"
          ? "Americano"
          : tournamentType;

  const scoreLabel = `${m.team1_sets} – ${m.team2_sets}`;
  const scoreTypeLabel = m.score_type === "points" ? "POÄNG" : "SET";

  const formatDelta = (delta?: number) => {
    if (typeof delta !== "number") return "—";
    return delta > 0 ? `+${delta}` : `${delta}`;
  };

  const avatarForId = (id?: string | null) => {
    if (!id || id === GUEST_ID) return null;
    return profileMap.get(id)?.avatar_url || null;
  };

  const renderTeamRows = (
    entries: { id: string | null; name: string }[],
    didWin: boolean,
    sideKey: "a" | "b"
  ) => (
    <Stack spacing={0.5}>
      {entries.map((entry, index) => {
        const delta = entry.id ? matchDeltas[entry.id] : undefined;
        return (
          <Box
            key={`${m.id}-team-${sideKey}-${index}`}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              minHeight: 34,
            }}
          >
            {/* Note for non-coders: the green checkmark marks the winning team so people can scan results quickly without re-reading the score. */}
            <Box sx={{ width: 18, display: "flex", justifyContent: "center" }}>
              {didWin ? <CheckCircleIcon sx={{ fontSize: 15, color: "success.main" }} /> : null}
            </Box>
            <Avatar src={avatarForId(entry.id) || undefined} sx={{ width: 26, height: 26, fontSize: 12 }}>
              {entry.name.slice(0, 1).toUpperCase()}
            </Avatar>
            <Typography
              variant="body2"
              sx={{
                fontWeight: didWin ? 700 : 500,
                color: didWin ? "text.primary" : "text.secondary",
                flex: 1,
              }}
            >
              {entry.name}
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 800, fontSize: 24, color: getDeltaColor(delta), minWidth: 36, textAlign: "right" }}>
              {formatDelta(delta)}
            </Typography>
          </Box>
        );
      })}
    </Stack>
  );

  const getDeltaColor = (delta?: number) => {
    if (typeof delta !== "number") return "text.secondary";
    if (delta > 0) return "success.main";
    if (delta < 0) return "error.main";
    return "text.secondary";
  };

  return (
    <SwipeableMatchCard
      key={m.id}
      canDelete={canDelete(m) && !isEditing}
      onDelete={() => onDeleteDialogOpen(m.id)}
    >
      <Card
        id={`match-${m.id}`}
        variant="outlined"
        onClick={() => {
          if (!isEditing) onOpenDetails?.(m.id);
        }}
        sx={{
          borderRadius: 4,
          boxShadow: isHighlighted ? 10 : '0 2px 8px rgba(15, 23, 42, 0.05)',
          bgcolor: isUserParticipant ? (theme) => alpha(theme.palette.primary.main, 0.03) : 'background.paper',
          borderColor: isHighlighted ? 'primary.main' : 'divider',
          borderWidth: isHighlighted ? 1.5 : 1,
          cursor: isEditing ? "default" : "pointer",
          transition: "transform 0.14s ease, box-shadow 0.14s ease",
          '&:hover': isEditing ? undefined : {
            transform: 'translateY(-1px)',
            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
          },
        }}
      >
        <CardContent sx={{ p: { xs: 2, sm: 2.25 } }}>
          <Box sx={{ mb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Stack direction="row" spacing={1.25} alignItems="center">
              {/* Note for non-coders: this tiny badge matches iOS where match type is visible but does not dominate the row. */}
              <Chip
                label={typeLabel}
                size="small"
                sx={{
                  height: 28,
                  borderRadius: 999,
                  fontWeight: 800,
                  fontSize: 15,
                  bgcolor: (theme) => alpha(theme.palette.error.main, 0.1),
                  color: 'error.main',
                  '.MuiChip-label': { px: 1.2 },
                }}
              />
              <Typography variant="body2" sx={{ fontSize: { xs: 19, sm: 22 }, fontWeight: 500, color: 'text.secondary' }}>
                {isEditing ? (
                  <TextField
                    type="datetime-local"
                    size="small"
                    value={edit?.created_at || ""}
                    onChange={(e) => setEdit && setEdit(prev => prev ? { ...prev, created_at: e.target.value } : prev)}
                    sx={{ mt: 1 }}
                    slotProps={{ htmlInput: { "aria-label": "Välj datum och tid för matchen" } }}
                  />
                ) : (
                  formatHistoryDateLabel(m.created_at)
                )}
              </Typography>
            </Stack>
            {!isEditing && (canEdit || canDelete(m)) && (
              <>
                {/* Note for non-coders: this three-dots button keeps actions tucked away so the row stays clean and iOS-like. */}
                <IconButton
                  size="small"
                  aria-label="Visa matchåtgärder"
                  onClick={(event) => {
                    event.stopPropagation();
                    setActionAnchorEl(event.currentTarget);
                  }}
                  sx={{ color: 'text.secondary', p: 0.5 }}
                >
                  <MoreHorizIcon fontSize="small" />
                </IconButton>
                <Menu
                  anchorEl={actionAnchorEl}
                  open={isActionMenuOpen}
                  onClose={() => setActionAnchorEl(null)}
                >
                  {canEdit && (
                    <MenuItem
                      onClick={() => {
                        setActionAnchorEl(null);
                        onStartEdit(m);
                      }}
                    >
                      <EditIcon fontSize="small" sx={{ mr: 1 }} /> Ändra
                    </MenuItem>
                  )}
                  {canEdit && canDelete(m) && <Divider />}
                  {canDelete(m) && (
                    <MenuItem
                      onClick={() => {
                        setActionAnchorEl(null);
                        onDeleteDialogOpen(m.id);
                      }}
                      sx={{ color: "error.main" }}
                    >
                      <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> Radera
                    </MenuItem>
                  )}
                </Menu>
              </>
            )}
          </Box>

          {isEditing ? (
            <Stack spacing={1.5}>
              <Stack spacing={1}>
                <TextField
                  select
                  label="Typ"
                  size="small"
                  value={edit?.score_type || "sets"}
                  onChange={(e) => setEdit && setEdit(prev => prev ? { ...prev, score_type: e.target.value } : prev)}
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
                    onChange={(e) => setEdit && setEdit(prev => prev ? { ...prev, score_target: e.target.value } : prev)}
                    slotProps={{ htmlInput: { "aria-label": "Mål (t.ex. spela till 24 poäng)" } }}
                  />
                )}
                <Stack direction="row" spacing={1} alignItems="center">
                  <TextField
                    type="number"
                    size="small"
                    value={edit?.team1_sets ?? 0}
                    onChange={(e) => setEdit && setEdit(prev => prev ? { ...prev, team1_sets: e.target.value } : prev)}
                    slotProps={{ htmlInput: { "aria-label": "Resultat för lag A" } }}
                  />
                  <Typography>–</Typography>
                  <TextField
                    type="number"
                    size="small"
                    value={edit?.team2_sets ?? 0}
                    onChange={(e) => setEdit && setEdit(prev => prev ? { ...prev, team2_sets: e.target.value } : prev)}
                    slotProps={{ htmlInput: { "aria-label": "Resultat för lag B" } }}
                  />
                </Stack>
              </Stack>

              <Stack spacing={1}>
                {edit?.team1_ids.map((value, index) => (
                  <TextField
                    key={`team1-${index}`}
                    select
                    label={`Lag A spelare ${index + 1}`}
                    size="small"
                    value={value || ""}
                    onChange={(e) => updateTeam && updateTeam("team1_ids", index, e.target.value)}
                    slotProps={{ htmlInput: { "aria-label": `Välj spelare ${index + 1} för lag A` } }}
                  >
                    <MenuItem value="">Välj spelare</MenuItem>
                    {playerOptions.map(option => (
                      <MenuItem key={option.id} value={option.id}>{option.name}</MenuItem>
                    ))}
                  </TextField>
                ))}

                {edit?.team2_ids.map((value, index) => (
                  <TextField
                    key={`team2-${index}`}
                    select
                    label={`Lag B spelare ${index + 1}`}
                    size="small"
                    value={value || ""}
                    onChange={(e) => updateTeam && updateTeam("team2_ids", index, e.target.value)}
                    slotProps={{ htmlInput: { "aria-label": `Välj spelare ${index + 1} för lag B` } }}
                  >
                    <MenuItem value="">Välj spelare</MenuItem>
                    {playerOptions.map(option => (
                      <MenuItem key={option.id} value={option.id}>{option.name}</MenuItem>
                    ))}
                  </TextField>
                ))}
              </Stack>
            </Stack>
          ) : (
            <Stack direction="row" spacing={{ xs: 1.25, sm: 2 }} alignItems="stretch">
              {/* Note for non-coders: iOS keeps the score in a fixed left column so every card lines up and is easier to scan quickly. */}
              <Box sx={{ width: { xs: 98, sm: 118 }, flexShrink: 0, textAlign: "center", py: { xs: 0.5, sm: 1 }, px: 0.5 }}>
                <Typography sx={{ fontSize: { xs: 34, sm: 42 }, lineHeight: 1.05, fontWeight: 900, letterSpacing: "-0.03em" }}>
                  {scoreLabel}
                </Typography>
                <Typography variant="subtitle1" sx={{ mt: 0.6, fontSize: { xs: 12, sm: 13 }, fontWeight: 700, color: "text.secondary", letterSpacing: "0.08em" }}>
                  {scoreTypeLabel}
                </Typography>
              </Box>

              <Divider orientation="vertical" flexItem sx={{ borderColor: "divider", opacity: 0.8 }} />

              <Stack sx={{ flex: 1 }} spacing={1.25}>
                {renderTeamRows(teamAEntries, m.team1_sets > m.team2_sets, "a")}
                <Divider sx={{ borderColor: "divider", opacity: 0.8 }} />
                {renderTeamRows(teamBEntries, m.team2_sets > m.team1_sets, "b")}
              </Stack>
            </Stack>
          )}


          {isEditing && (
            <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                startIcon={isSavingEdit ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                onClick={() => onSaveEdit && onSaveEdit(m.id)}
                disabled={isSavingEdit}
              >
                {isSavingEdit ? "Sparar..." : "Spara"}
              </Button>
              <Button variant="outlined" startIcon={<CloseIcon />} onClick={onCancelEdit} disabled={isSavingEdit}>Avbryt</Button>
            </Box>
          )}
        </CardContent>
        <AppBottomSheet
          open={isDeleteDialogOpen}
          onClose={onDeleteDialogClose}
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
                onClick={() => onDeleteMatch(m.id)}
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
                onClick={onDeleteDialogClose}
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
});

export default function History({
  matches = [],
  eloDeltaByMatch = {},
  profiles = [],
  user,
  highlightedMatchId = null,
  onOpenDetails,
}: HistoryProps) {
  const queryClient = useQueryClient();
  const profileMap = useMemo(() => makeProfileMap(profiles), [profiles]);
  const nameToIdMap = useMemo(() => makeNameToIdMap(profiles), [profiles]);
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

  const visibleMatches = useMemo(() => sortedMatches.slice(0, visibleCount), [sortedMatches, visibleCount]);

  const enrichedMatches = useMemo(() => {
    return visibleMatches.map(m => ({
      ...m,
      t1Ids: resolveTeamIds(m.team1_ids, m.team1, nameToIdMap),
      t2Ids: resolveTeamIds(m.team2_ids, m.team2, nameToIdMap),
      t1Names: resolveTeamNames(m.team1_ids, m.team1, profileMap),
      t2Names: resolveTeamNames(m.team2_ids, m.team2, profileMap),
    }));
  }, [visibleMatches, nameToIdMap, profileMap]);

  const getTeamIds = React.useCallback((teamIds: (string | null)[], teamNames: string | string[]): (string | null)[] => {
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
  }, [nameToIdMap]);

  const startEdit = React.useCallback((match: Match) => {
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
  }, [getTeamIds]);

  const cancelEdit = React.useCallback(() => {
    setEditingId(null);
    setEdit(null);
  }, []);

  const updateTeam = React.useCallback((teamKey: "team1_ids" | "team2_ids", index: number, value: string) => {
    setEdit(prev => {
      if (!prev) return prev;
      const nextTeam = [...prev[teamKey]];
      nextTeam[index] = value;
      return { ...prev, [teamKey]: nextTeam };
    });
  }, []);

  const hasDuplicatePlayers = React.useCallback((team1Ids: (string | null)[], team2Ids: (string | null)[]) => {
    const ids = [...team1Ids, ...team2Ids].filter(Boolean);
    return new Set(ids).size !== ids.length;
  }, []);

  const saveEdit = React.useCallback(async (matchId: string) => {
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
  }, [edit, hasDuplicatePlayers, profileMap, queryClient, cancelEdit]);

  const deleteMatch = React.useCallback(async (matchId: string) => {
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
  }, [queryClient]);

  const onDeleteDialogClose = React.useCallback(() => setDeleteDialogMatchId(null), []);
  const onDeleteDialogOpen = React.useCallback((id: string) => setDeleteDialogMatchId(id), []);

  if (!matches.length) return <Typography>Inga matcher ännu.</Typography>;

  const canLoadMore = visibleCount < sortedMatches.length;

  return (
    <Box id="match-history" component="section">
      {/* Note for non-coders: we keep just one small metadata row here so the page avoids duplicate titles and feels closer to iOS cards. */}
      <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: "block" }}>
        Visar {Math.min(visibleCount, sortedMatches.length)} av {sortedMatches.length} matcher. Senaste först.
      </Typography>

      <Stack spacing={2}>
        {enrichedMatches.map(m => {
          const isEditing = editingId === m.id;
          return (
            <MatchItem
              key={m.id}
              m={m}
              user={user}
              matchDeltas={eloDeltaByMatch[m.id] || {}}
              isEditing={isEditing}
              isHighlighted={highlightedMatchId === m.id}
              isDeleteDialogOpen={deleteDialogMatchId === m.id}
              deletingId={deletingId}
              edit={isEditing ? edit : null}
              isSavingEdit={isEditing ? isSavingEdit : false}
              playerOptions={playerOptions}
              profileMap={profileMap}
              onStartEdit={startEdit}
              onCancelEdit={cancelEdit}
              onSaveEdit={isEditing ? saveEdit : undefined}
              onDeleteMatch={deleteMatch}
              onDeleteDialogOpen={onDeleteDialogOpen}
              onDeleteDialogClose={onDeleteDialogClose}
              updateTeam={isEditing ? updateTeam : undefined}
              setEdit={isEditing ? setEdit : undefined}
              onOpenDetails={onOpenDetails}
            />
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
