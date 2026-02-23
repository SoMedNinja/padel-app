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
  ENABLE_ZERO_SUM_NORMALIZATION,
} from "./constants.ts";
import { EloMatch, PlayerDeltaParams } from "./types.ts";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const interpolate = (value: number, minInput: number, maxInput: number, minOutput: number, maxOutput: number) => {
  if (!Number.isFinite(value)) return minOutput;
  if (maxInput <= minInput) return maxOutput;
  const ratio = clamp((value - minInput) / (maxInput - minInput), 0, 1);
  return minOutput + (maxOutput - minOutput) * ratio;
};

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
  // Note for non-coders: tanh creates a smooth curve where bigger wins matter more,
  // but gradually cap out so a blowout cannot produce extreme ELO jumps.
  const smoothImpact = Math.tanh(diff / 2);
  return 1 + smoothImpact * (MAX_MARGIN_MULTIPLIER - 1);
};

export const getPlayerWeight = (playerElo: number, teamAverageElo: number) => {
  if (!Number.isFinite(playerElo) || !Number.isFinite(teamAverageElo)) return 1;
  // Note for non-coders: lower-rated players get a bigger boost (gain more, lose less) vs their team average.
  const adjustment = 1 + (teamAverageElo - playerElo) / PLAYER_WEIGHT_DIVISOR;
  return clamp(adjustment, MIN_PLAYER_WEIGHT, MAX_PLAYER_WEIGHT);
};

export const getMatchWeight = (match: EloMatch) => {
  // Note for non-coders: this now scales continuously instead of buckets,
  // so match impact increases gradually as match length/target increases.
  if (match.source_tournament_id) return LONG_MATCH_WEIGHT;
  const scoreType = match.score_type || "sets";

  if (scoreType === "sets") {
    const maxSets = Math.max(match.team1_sets, match.team2_sets);
    return interpolate(maxSets, SHORT_SET_MAX, LONG_SET_MIN, SHORT_MATCH_WEIGHT, LONG_MATCH_WEIGHT);
  }

  if (scoreType === "points") {
    const target = match.score_target ?? 0;
    return interpolate(target, SHORT_POINTS_MAX, MID_POINTS_MAX + 4, SHORT_MATCH_WEIGHT, LONG_MATCH_WEIGHT);
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

export const normalizeZeroSumDeltas = (deltas: Record<string, number>): Record<string, number> => {
  if (!ENABLE_ZERO_SUM_NORMALIZATION) return deltas;

  const corrected = { ...deltas };
  const ids = Object.keys(corrected);
  let residual = ids.reduce((sum, id) => sum + corrected[id], 0);
  if (residual === 0 || !ids.length) return corrected;

  const priority = [...ids].sort((a, b) => {
    const absDiff = Math.abs(corrected[b]) - Math.abs(corrected[a]);
    if (absDiff !== 0) return absDiff;
    return a.localeCompare(b);
  });

  let idx = 0;
  // Note for non-coders: if rounding creates +2 extra points, we remove 1 point twice
  // from players with the largest swings so the match ends exactly balanced.
  while (residual !== 0 && priority.length) {
    const id = priority[idx % priority.length];
    if (residual > 0) {
      corrected[id] -= 1;
      residual -= 1;
    } else {
      corrected[id] += 1;
      residual += 1;
    }
    idx++;
  }

  return corrected;
};
