import { Match, Profile, PlayerStats, PlayerDeltaParams } from "./types.ts";
import {
  GUEST_ID,
  ELO_BASELINE,
  BASE_K,
  HIGH_K,
  MID_K,
  MAX_MARGIN_MULTIPLIER,
  MAX_PLAYER_WEIGHT,
  MIN_PLAYER_WEIGHT,
  EXPECTED_SCORE_DIVISOR,
  PLAYER_WEIGHT_DIVISOR,
  SHORT_SET_MAX,
  LONG_SET_MIN,
  SHORT_POINTS_MAX,
  MID_POINTS_MAX,
  SHORT_MATCH_WEIGHT,
  MID_MATCH_WEIGHT,
  LONG_MATCH_WEIGHT,
  SINGLES_MATCH_WEIGHT,
} from "./constants.ts";
import { clamp, escapeHtml } from "./utils.ts";

export const getKFactor = (games = 0) => {
  if (games < 10) return HIGH_K;
  if (games < 30) return MID_K;
  return BASE_K;
};

export const getExpectedScore = (rating: number, opponentRating: number) =>
  1 / (1 + Math.pow(10, (opponentRating - rating) / EXPECTED_SCORE_DIVISOR));

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
  const adjustment = 1 + (teamAverageElo - playerElo) / PLAYER_WEIGHT_DIVISOR;
  return clamp(adjustment, MIN_PLAYER_WEIGHT, MAX_PLAYER_WEIGHT);
};

export const getMatchWeight = (match: Match) => {
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

export const getSinglesAdjustedMatchWeight = (match: Match, isSinglesMatch: boolean) => {
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
  const playerK = getKFactor(playerGames);
  const weight = getPlayerWeight(playerElo, teamAverageElo);
  const effectiveWeight = didWin ? weight : 1 / weight;
  return Math.round(
    playerK * marginMultiplier * matchWeight * effectiveWeight * ((didWin ? 1 : 0) - expectedScore)
  );
};

export function calculateElo(matches: Match[], profileMap: Map<string, Profile>, initialState?: Record<string, PlayerStats>): Record<string, PlayerStats> {
  const players: Record<string, PlayerStats> = {};

  if (initialState) {
    for (const [id, stats] of Object.entries(initialState)) {
      players[id] = { ...stats, history: [...stats.history] };
    }
  }

  const ensurePlayer = (id: string) => {
    if (players[id]) return;
    const p = profileMap.get(id);
    const name = p ? p.name : (id.startsWith("name:") ? escapeHtml(id.replace("name:", "")) : "Okänd");
    players[id] = { id, name, elo: ELO_BASELINE, wins: 0, losses: 0, games: 0, history: [] };
  };

  profileMap.forEach(p => {
    ensurePlayer(p.id);
  });

  const sortedMatches = [...matches].sort((a, b) => a.created_at.localeCompare(b.created_at));

  sortedMatches.forEach(m => {
    const t1Raw = m.team1_ids.filter(id => id && id !== GUEST_ID) as string[];
    const t2Raw = m.team2_ids.filter(id => id && id !== GUEST_ID) as string[];

    const t1Active: string[] = [];
    const t2Active: string[] = [];

    t1Raw.forEach(id => {
      ensurePlayer(id);
      if (players[id]) t1Active.push(id);
    });
    t2Raw.forEach(id => {
      ensurePlayer(id);
      if (players[id]) t2Active.push(id);
    });

    if (!t1Active.length || !t2Active.length) return;

    const e1 = t1Active.reduce((s, id) => s + players[id].elo, 0) / t1Active.length;
    const e2 = t2Active.reduce((s, id) => s + players[id].elo, 0) / t2Active.length;

    const exp1 = getExpectedScore(e1, e2);
    const team1Won = m.team1_sets > m.team2_sets;
    const marginMultiplier = getMarginMultiplier(m.team1_sets, m.team2_sets);
    const isSinglesMatch = t1Active.length === 1 && t2Active.length === 1;
    const matchWeight = getSinglesAdjustedMatchWeight(m, isSinglesMatch);

    t1Active.forEach(id => {
      const p = players[id];
      const delta = buildPlayerDelta({
        playerElo: p.elo,
        playerGames: p.games,
        teamAverageElo: e1,
        expectedScore: exp1,
        didWin: team1Won,
        marginMultiplier,
        matchWeight
      });
      p.elo += delta;
      if (team1Won) p.wins++; else p.losses++;
      p.games++;
      p.history.push({ matchId: m.id, delta, result: team1Won ? "W" : "L" });
    });

    t2Active.forEach(id => {
      const p = players[id];
      const delta = buildPlayerDelta({
        playerElo: p.elo,
        playerGames: p.games,
        teamAverageElo: e2,
        expectedScore: 1 - exp1,
        didWin: !team1Won,
        marginMultiplier,
        matchWeight
      });
      p.elo += delta;
      if (!team1Won) p.wins++; else p.losses++;
      p.games++;
      p.history.push({ matchId: m.id, delta, result: !team1Won ? "W" : "L" });
    });
  });

  return players;
}
