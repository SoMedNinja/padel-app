import React, { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { invalidateStatsData } from "../../data/queryInvalidation";
import {
  getProfileDisplayName,
  idsToNames,
  makeNameToIdMap,
  makeProfileMap,
} from "../../utils/profileMap";
import { GUEST_ID, GUEST_NAME } from "../../utils/guest";
import { Match, Profile } from "../../types";
import { matchService } from "../../services/matchService";
import {
  Box,
  Typography,
  CircularProgress,
  Stack,
  Skeleton,
} from "@mui/material";
import {
  SportsTennis as SportsTennisIcon,
} from "@mui/icons-material";
import { toDateTimeInput } from "./utils";
import EmptyState from "../Shared/EmptyState";
import { useNavigate } from "react-router-dom";
import { ScoreType, TournamentType } from "../../utils/constants";
import MatchList from "./MatchList";
import { EditState } from "./types";

interface HistoryProps {
  matches?: Match[];
  eloDeltaByMatch?: Record<string, Record<string, number>>;
  profiles?: Profile[];
  user: any;
  highlightedMatchId?: string | null;
  onOpenDetails?: (matchId: string) => void;
}

const normalizeName = (name: string) => name?.trim().toLowerCase();

export default function History({
  matches = [],
  eloDeltaByMatch = {},
  profiles = [],
  user,
  highlightedMatchId = null,
  onOpenDetails,
}: HistoryProps) {
  const navigate = useNavigate();
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

  // Sorting
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
      score_type: match.score_type || ScoreType.SETS,
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
        // Note for non-coders: this stores the edited historical date/time so the match appears in the
        // correct place in the timeline and ELO history.
        created_at: new Date(edit.created_at).toISOString(),
        team1: team1Names,
        team2: team2Names,
        team1_ids: team1IdsForDb,
        team2_ids: team2IdsForDb,
        source_tournament_type: is1v1Match ? TournamentType.STANDALONE_1V1 : TournamentType.STANDALONE,
        team1_sets: Number(edit.team1_sets),
        team2_sets: Number(edit.team2_sets),
        score_type: edit.score_type || ScoreType.SETS,
        score_target:
          edit.score_type === ScoreType.POINTS && edit.score_target !== ""
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

  if (!matches.length) return (
    <EmptyState
      title="Inga matcher ännu"
      description="Inga matcher hittades för detta filter. Prova att ändra filtret eller registrera en ny match."
      actionLabel="Registrera match"
      onAction={() => navigate("/single-game")}
      icon={<SportsTennisIcon sx={{ fontSize: 64 }} />}
    />
  );

  return (
    <MatchList
      matches={sortedMatches}
      eloDeltaByMatch={eloDeltaByMatch}
      user={user}
      highlightedMatchId={highlightedMatchId}
      editingId={editingId}
      isSavingEdit={isSavingEdit}
      deletingId={deletingId}
      deleteDialogMatchId={deleteDialogMatchId}
      edit={edit}
      playerOptions={playerOptions}
      profileMap={profileMap}
      nameToIdMap={nameToIdMap}
      onStartEdit={startEdit}
      onCancelEdit={cancelEdit}
      onSaveEdit={saveEdit}
      onDeleteMatch={deleteMatch}
      onDeleteDialogOpen={onDeleteDialogOpen}
      onDeleteDialogClose={onDeleteDialogClose}
      updateTeam={updateTeam}
      setEdit={setEdit}
      onOpenDetails={onOpenDetails}
      canLoadMore={false}
      onLoadMore={() => {}}
    />
  );
}
