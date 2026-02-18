import { MatchCreateInput } from "../services/matchService";
import { Match } from "../types";

export const createOptimisticMatch = (newMatchInput: MatchCreateInput): Match => {
  const input = Array.isArray(newMatchInput) ? newMatchInput[0] : newMatchInput;

  return {
    id: `temp-${Date.now()}`, // Temporary ID
    created_at: new Date().toISOString(),
    team1: Array.isArray(input.team1) ? input.team1 : [input.team1],
    team2: Array.isArray(input.team2) ? input.team2 : [input.team2],
    team1_ids: input.team1_ids || [],
    team2_ids: input.team2_ids || [],
    team1_sets: input.team1_sets,
    team2_sets: input.team2_sets,
    score_type: input.score_type || "sets",
    score_target: input.score_target || null,
    team1_serves_first: input.team1_serves_first ?? true,
    source_tournament_id: input.source_tournament_id || null,
    source_tournament_type: input.source_tournament_type || null,
    // created_by will be filled by the backend, but we can assume current user for now if we had context
    created_by: "current-user-placeholder",
  };
};
