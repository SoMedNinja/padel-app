import { Match, Profile } from "../../types";

export interface EditState {
  created_at: string;
  team1_ids: (string | null)[];
  team2_ids: (string | null)[];
  team1_sets: number | string;
  team2_sets: number | string;
  score_type: string;
  score_target: number | string;
}

export interface MatchItemProps {
  m: Match;
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
  nameToIdMap: Map<string, string>;
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
