import React, { useMemo, useState } from "react";
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
import {
  getIdDisplayName,
  resolveTeamIds,
  resolveTeamNames,
} from "../../utils/profileMap";
import { GUEST_ID } from "../../utils/guest";
import { Match } from "../../types";
import { formatHistoryDateLabel } from "../../utils/format";
import AppBottomSheet from "../Shared/AppBottomSheet";
import { MatchItemProps } from "./types";
import { TournamentType, ScoreType } from "../../utils/constants";

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
  nameToIdMap,
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

  // Optimization: Resolve team names/IDs locally and memoize.
  // This allows MatchItem to be pure and not re-render when parent re-slices the list,
  // as the raw Match object reference is stable.
  const t1Ids = useMemo(() => resolveTeamIds(m.team1_ids, m.team1, nameToIdMap), [m.team1_ids, m.team1, nameToIdMap]);
  const t2Ids = useMemo(() => resolveTeamIds(m.team2_ids, m.team2, nameToIdMap), [m.team2_ids, m.team2, nameToIdMap]);
  const t1Names = useMemo(() => resolveTeamNames(m.team1_ids, m.team1, profileMap), [m.team1_ids, m.team1, profileMap]);
  const t2Names = useMemo(() => resolveTeamNames(m.team2_ids, m.team2, profileMap), [m.team2_ids, m.team2, profileMap]);

  const tournamentType = m.source_tournament_type || TournamentType.STANDALONE;
  const isActually1v1 = tournamentType === TournamentType.STANDALONE_1V1;
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

  const typeLabel = tournamentType === TournamentType.STANDALONE
    ? (is1v1 ? "1v1" : "2v2")
    : tournamentType === TournamentType.STANDALONE_1V1
      ? "1v1"
      : tournamentType === TournamentType.MEXICANO
        ? "Mexicano"
        : tournamentType === TournamentType.AMERICANO
          ? "Americano"
          : tournamentType;

  const scoreLabel = `${m.team1_sets} – ${m.team2_sets}`;
  const scoreTypeLabel = m.score_type === ScoreType.POINTS ? "POÄNG" : "SET";

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
              minHeight: 32,
            }}
          >
            {/* Note for non-coders: the green checkmark marks the winning team so people can scan results quickly without re-reading the score. */}
            <Box sx={{ width: 16, display: "flex", justifyContent: "center" }}>
              {didWin ? <CheckCircleIcon sx={{ fontSize: 14, color: "success.main" }} /> : null}
            </Box>
            <Avatar src={avatarForId(entry.id) || undefined} sx={{ width: 24, height: 24, fontSize: 11 }}>
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
            <Typography variant="body1" sx={{ fontWeight: 800, fontSize: { xs: 20, sm: 22 }, color: getDeltaColor(delta), minWidth: 32, textAlign: "right" }}>
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isEditing && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onOpenDetails?.(m.id);
    }
  };

  return (
    // Note for non-coders: cards are now tap-only on PWA to avoid accidental/buggy swipe deletes.
    <Box key={m.id} component="li" sx={{ listStyle: "none" }}>
      <Card
        id={`match-${m.id}`}
        variant="outlined"
        onClick={() => {
          if (!isEditing) onOpenDetails?.(m.id);
        }}
        onKeyDown={handleKeyDown}
        tabIndex={isEditing ? -1 : 0}
        role="button"
        aria-label={`Match mellan ${teamAEntries.map(e => e.name).join(' och ')} mot ${teamBEntries.map(e => e.name).join(' och ')}. Resultat ${scoreLabel}. Klicka för detaljer.`}
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
          '&:focus-visible': {
            outline: '2px solid',
            outlineColor: 'primary.main',
            outlineOffset: 2,
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
                  height: 26,
                  borderRadius: 999,
                  fontWeight: 800,
                  fontSize: { xs: 13, sm: 14 },
                  bgcolor: (theme) => alpha(theme.palette.error.main, 0.1),
                  color: 'error.main',
                  '.MuiChip-label': { px: { xs: 1, sm: 1.2 } },
                }}
              />
              <Typography variant="body2" sx={{ fontSize: { xs: 17, sm: 20 }, fontWeight: 500, color: 'text.secondary' }}>
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
                  onKeyDown={(e) => {
                     // Stop propagation to prevent card click when pressing Enter on the menu button
                     if (e.key === 'Enter' || e.key === ' ') {
                       e.stopPropagation();
                     }
                  }}
                  sx={{ color: 'text.secondary', p: 0.5 }}
                >
                  <MoreHorizIcon fontSize="small" />
                </IconButton>
                <Menu
                  anchorEl={actionAnchorEl}
                  open={isActionMenuOpen}
                  onClose={() => setActionAnchorEl(null)}
                  onClick={(event) => {
                    // Note for non-coders: menu taps should only trigger menu actions.
                    // We stop bubbling so the parent match card does not also open details.
                    event.stopPropagation();
                  }}
                >
                  {canEdit && (
                    <MenuItem
                      onClick={(event) => {
                        // Note for non-coders: this keeps "Edit" in edit mode instead of accidentally
                        // opening the separate details page from the card click handler.
                        event.stopPropagation();
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
                      onClick={(event) => {
                        // Note for non-coders: same protection for delete, so only the selected action runs.
                        event.stopPropagation();
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
                  value={edit?.score_type || ScoreType.SETS}
                  onChange={(e) => setEdit && setEdit(prev => prev ? { ...prev, score_type: e.target.value } : prev)}
                  slotProps={{ select: { "aria-label": "Välj typ av resultat (set eller poäng)" } }}
                >
                  <MenuItem value={ScoreType.SETS}>Set</MenuItem>
                  <MenuItem value={ScoreType.POINTS}>Poäng</MenuItem>
                </TextField>
                {edit?.score_type === ScoreType.POINTS && (
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
              {/* Note for non-coders: slightly smaller text on PWA helps fit the same information without making each row feel oversized on phone screens. */}
              <Box sx={{ width: { xs: 90, sm: 108 }, flexShrink: 0, textAlign: "center", py: { xs: 0.4, sm: 0.8 }, px: 0.5 }}>
                <Typography sx={{ fontSize: { xs: 30, sm: 38 }, lineHeight: 1.05, fontWeight: 900, letterSpacing: "-0.03em" }}>
                  {scoreLabel}
                </Typography>
                <Typography variant="subtitle1" sx={{ mt: 0.45, fontSize: { xs: 11, sm: 12 }, fontWeight: 700, color: "text.secondary", letterSpacing: "0.08em" }}>
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
    </Box>
  );
});

export default MatchItem;
