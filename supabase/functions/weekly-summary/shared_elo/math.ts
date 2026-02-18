import {
  BASE_K,
  HIGH_K,
  MID_K,
  MAX_MARGIN_MULTIPLIER,
  MAX_PLAYER_WEIGHT,
  MIN_PLAYER_WEIGHT,
  EXPECTED_SCORE_DIVISOR,
  PLAYER_WEIGHT_DIVISOR,
  ELO_BASELINE,
  SHORT_SET_MAX,
  LONG_SET_MIN,
  SHORT_POINTS_MAX,
  MID_POINTS_MAX,
  SHORT_MATCH_WEIGHT,
  MID_MATCH_WEIGHT,
  LONG_MATCH_WEIGHT,
  SINGLES_MATCH_WEIGHT,
} from "./constants.ts";
import { EloMatch, PlayerDeltaParams } from "./types.ts";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const getKFactor = (games = 0) => {
  if (games < 10) return HIGH_K;
  if (games < 30) return MID_K;
  return BASE_K;
};

export const getExpectedScore = (rating: number, opponentRating: number) =>
  1 / (1 + Math.pow(10, (opponentRating - rating) / EXPECTED_SCORE_DIVISOR));

export const getWinProbability = getExpectedScore;

export const getMarginMultiplier = (team1Sets: number, team2Sets: number) => {
  if (!Number.isFinite(team1Sets) || !Number.isFinite(team2Sets)) return 1;
  const diff = Math.abs(team1Sets - team2Sets);
  // User request: 2 set difference (e.g. 8-6) should have same impact as 1 set difference (1.1x).
  // This means margin 1 for diff 1 or 2, and margin 2 for diff 3 or more.
  const margin = diff > 2 ? 2 : (diff > 0 ? 1 : 0);
  return 1 + Math.min(MAX_MARGIN_MULTIPLIER - 1, margin * 0.1);
};

export const getPlayerWeight = (playerElo: number, teamAverageElo: number) => {
  if (!Number.isFinite(playerElo) || !Number.isFinite(teamAverageElo)) return 1;
  // Note for non-coders: lower-rated players get a bigger boost (gain more, lose less) vs their team average.
  const adjustment = 1 + (teamAverageElo - playerElo) / PLAYER_WEIGHT_DIVISOR;
  return clamp(adjustment, MIN_PLAYER_WEIGHT, MAX_PLAYER_WEIGHT);
};

export const getMatchWeight = (match: EloMatch) => {
  // Note for non-coders: This scales ELO changes so long/tournament matches matter more than quick ones.
  if (match.source_tournament_id) return LONG_MATCH_WEIGHT;
  const scoreType = match.score_type || "sets";
  if (scoreType === "sets") {
    const maxSets = Math.max(match.team1_sets, match.team2_sets);
    if (maxSets <= SHORT_SET_MAX) return SHORT_MATCH_WEIGHT;
    if (maxSets >= LONG_SET_MIN) return LONG_MATCH_WEIGHT;
    return MID_MATCH_WEIGHT;
  }
  if (scoreType === "points") {
    const target = match.score_target ?? 0;
    if (target <= SHORT_POINTS_MAX) return SHORT_MATCH_WEIGHT;
    if (target <= MID_POINTS_MAX) return MID_MATCH_WEIGHT;
    return LONG_MATCH_WEIGHT;
  }
  return MID_MATCH_WEIGHT;
};

export const getSinglesAdjustedMatchWeight = (match: EloMatch, isSinglesMatch: boolean) => {
  return getMatchWeight(match) * (isSinglesMatch ? SINGLES_MATCH_WEIGHT : 1);
};

export const buildPlayerDelta = ({
  playerElo,
  playerGames,
  teamAverageElo,
  expectedScore,
  didWin,
  marginMultiplier,
  matchWeight,
}: PlayerDeltaParams) => {
  // Note for non-coders: we start from a base "K" value, then scale it by match length and player weight.
  // Note for non-coders: low-rated players get bigger boosts on wins and smaller penalties on losses (inverse weight).
  const playerK = getKFactor(playerGames);
  const weight = getPlayerWeight(playerElo, teamAverageElo);
  const effectiveWeight = didWin ? weight : 1 / weight;
  return Math.round(
    playerK * marginMultiplier * matchWeight * effectiveWeight * ((didWin ? 1 : 0) - expectedScore)
  );
};
