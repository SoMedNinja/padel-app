import React, { useRef, useEffect } from "react";
import { Box, Typography, Stack, CircularProgress } from "@mui/material";
import { useVirtualizer } from "@tanstack/react-virtual";
import MatchItem from "./MatchItem";
import { Match, Profile } from "../../types";
import { EditState } from "./types";
import { GUEST_ID } from "../../utils/guest";

interface MatchListProps {
  matches: Match[];
  eloDeltaByMatch: Record<string, Record<string, number>>;
  user: any;
  highlightedMatchId: string | null;
  editingId: string | null;
  isSavingEdit: boolean;
  deletingId: string | null;
  deleteDialogMatchId: string | null;
  edit: EditState | null;
  playerOptions: { id: string; name: string }[];
  profileMap: Map<string, Profile>;
  nameToIdMap: Map<string, string>;
  onStartEdit: (m: Match) => void;
  onCancelEdit: () => void;
  onSaveEdit: (id: string) => void;
  onDeleteMatch: (id: string) => void;
  onDeleteDialogOpen: (id: string) => void;
  onDeleteDialogClose: () => void;
  updateTeam: (key: "team1_ids" | "team2_ids", index: number, value: string) => void;
  setEdit: React.Dispatch<React.SetStateAction<EditState | null>>;
  onOpenDetails?: (matchId: string) => void;
  canLoadMore: boolean;
  onLoadMore: () => void;
}

const MatchList = ({
  matches,
  eloDeltaByMatch,
  user,
  highlightedMatchId,
  editingId,
  isSavingEdit,
  deletingId,
  deleteDialogMatchId,
  edit,
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
  canLoadMore,
  onLoadMore,
}: MatchListProps) => {
  const parentRef = useRef<HTMLDivElement>(null);
  // Note for non-coders: window virtualizer is often smoother for full page lists,
  // but here we are inside a container, so we use element virtualizer.
  // We assume the parent container has a fixed height or we rely on window scroll.
  // Actually, History page usually scrolls the whole window.
  // TanStack Virtual can use the window as the scroll container.

  // However, the original implementation used window scroll.
  // Let's stick to the window scroll pattern if possible, or make the container scrollable.
  // Given the structure of the app (pull to refresh, etc), usually the body scrolls.
  // If we want window scrolling, we pass `getScrollElement: () => window`.
  // BUT `useVirtualizer` needs to know the offset from the top.

  // For simplicity and robustness with PullToRefresh, let's keep it simple:
  // We will use the container-based virtualization if we can constrain the height,
  // OR we use the window-based one.

  // Let's try `getScrollElement: () => window` approach first as it's less disruptive to layout.

  const windowVirtualizer = useVirtualizer({
    count: matches.length,
    getScrollElement: () => typeof window !== 'undefined' ? window : null,
    estimateSize: () => 180,
    overscan: 5,
    // We need to account for the header height and other elements above the list.
    // scrollMargin is one way, or we can just let it be relative.
  });

  // Infinite scroll trigger
  useEffect(() => {
    const [lastItem] = [...windowVirtualizer.getVirtualItems()].reverse();

    if (!lastItem) {
      return;
    }

    if (
      lastItem.index >= matches.length - 1 &&
      canLoadMore
    ) {
      onLoadMore();
    }
  }, [
    canLoadMore,
    onLoadMore,
    matches.length,
    windowVirtualizer.getVirtualItems(),
  ]);

  return (
    <Box id="match-history" component="section">
      <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: "block" }}>
        Visar {matches.length} matcher. Senaste först.
      </Typography>

      {/*
        Virtualizer needs a container with relative positioning and the total height set.
      */}
      <ul
        style={{
          height: `${windowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
          padding: 0,
          margin: 0,
          listStyle: 'none',
        }}
      >
        {windowVirtualizer.getVirtualItems().map((virtualRow) => {
          const m = matches[virtualRow.index];
          const isEditing = editingId === m.id;
          return (
            <div
              key={m.id}
              data-index={virtualRow.index}
              ref={windowVirtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
                paddingBottom: '16px', // Spacing between items
              }}
            >
               <MatchItem
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
                  nameToIdMap={nameToIdMap}
                  onStartEdit={onStartEdit}
                  onCancelEdit={onCancelEdit}
                  onSaveEdit={isEditing ? onSaveEdit : undefined}
                  onDeleteMatch={onDeleteMatch}
                  onDeleteDialogOpen={onDeleteDialogOpen}
                  onDeleteDialogClose={onDeleteDialogClose}
                  updateTeam={isEditing ? updateTeam : undefined}
                  setEdit={isEditing ? setEdit : undefined}
                  onOpenDetails={onOpenDetails}
                />
            </div>
          );
        })}
      </ul>

      {canLoadMore && (
        <Box
          sx={{
            mt: 4,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: 60,
            opacity: 0.7
          }}
        >
          <CircularProgress size={24} color="inherit" thickness={5} />
        </Box>
      )}

      <Typography variant="caption" color="text.secondary" sx={{ mt: 4, display: 'block', textAlign: 'center' }}>
        * Rättigheter styrs av databasen (RLS). Endast administratörer kan redigera matcher.
      </Typography>
    </Box>
  );
};

export default MatchList;
