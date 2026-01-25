import { GUEST_ID } from "./guest";
import {
  getIdDisplayName,
  getProfileDisplayName,
  makeNameToIdMap,
  makeProfileMap,
  resolveTeamIds,
} from "./profileMap";
import { Match, Profile, PlayerStats } from "../types";

const BASE_K = 20;
const HIGH_K = 40;
const MID_K = 30;
const MAX_MARGIN_MULTIPLIER = 1.2;
const MAX_PLAYER_WEIGHT = 1.25;
const MIN_PLAYER_WEIGHT = 0.75;
const EXPECTED_SCORE_DIVISOR = 300;
const PLAYER_WEIGHT_DIVISOR = 800;
const ELO_BASELINE = 1000;
const SHORT_SET_MAX = 3;
const LONG_SET_MIN = 6;
const SHORT_POINTS_MAX = 15;
const MID_POINTS_MAX = 21;
const SHORT_MATCH_WEIGHT = 0.5;
const MID_MATCH_WEIGHT = 0.5;
const LONG_MATCH_WEIGHT = 1;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const getKFactor = (games = 0) => {
  if (games < 10) return HIGH_K;
  if (games < 30) return MID_K;
  return BASE_K;
};

export const getExpectedScore = (rating: number, opponentRating: number) =>
  1 / (1 + Math.pow(10, (opponentRating - rating) / EXPECTED_SCORE_DIVISOR));

export const getMarginMultiplier = (team1Sets: number, team2Sets: number) => {
  if (!Number.isFinite(team1Sets) || !Number.isFinite(team2Sets)) return 1;
  const margin = Math.min(2, Math.abs(team1Sets - team2Sets));
  return 1 + Math.min(MAX_MARGIN_MULTIPLIER - 1, margin * 0.1);
};

export const getPlayerWeight = (playerElo: number, teamAverageElo: number) => {
  if (!Number.isFinite(playerElo) || !Number.isFinite(teamAverageElo)) return 1;
  // Note for non-coders: lower-rated players get a bigger boost (gain more, lose less) vs their team average.
  const adjustment = 1 + (teamAverageElo - playerElo) / PLAYER_WEIGHT_DIVISOR;
  return clamp(adjustment, MIN_PLAYER_WEIGHT, MAX_PLAYER_WEIGHT);
};

export const getMatchWeight = (match: Match) => {
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

export { ELO_BASELINE };

export function calculateElo(matches: Match[], profiles: Profile[] = []): PlayerStats[] {
  const players: Record<string, PlayerStats> = {};
  const profileMap = makeProfileMap(profiles);
  const nameToIdMap = makeNameToIdMap(profiles);
  const avatarMap = profiles.reduce((acc, profile) => {
    acc[profile.id] = profile.avatar_url || null;
    return acc;
  }, {} as Record<string, string | null>);
  const badgeMap = profiles.reduce((acc, profile) => {
    acc[profile.id] = profile.featured_badge_id || null;
    return acc;
  }, {} as Record<string, string | null>);

  const ensurePlayer = (id: string, name = "Okänd", avatarUrl: string | null = null, featuredBadgeId: string | null = null) => {
    if (id === GUEST_ID) return;
    if (!players[id]) {
      players[id] = {
        id,
        name,
        elo: ELO_BASELINE,
        startElo: ELO_BASELINE,
        wins: 0,
        losses: 0,
        games: 0,
        history: [],
        partners: {},
        avatarUrl,
        featuredBadgeId,
        recentResults: [],
      };
    } else {
      if (name && players[id].name === "Okänd") {
        players[id].name = name;
      }
      if (avatarUrl && !players[id].avatarUrl) {
        players[id].avatarUrl = avatarUrl;
      }
      if (featuredBadgeId && !players[id].featuredBadgeId) {
        players[id].featuredBadgeId = featuredBadgeId;
      }
    }
  };

  profiles.forEach(p => {
    ensurePlayer(p.id, getProfileDisplayName(p), avatarMap[p.id], badgeMap[p.id]);
  });

  const normalizeTeam = (team: any): string[] => (Array.isArray(team) ? team.filter(Boolean) : []);
  const hasPlayer = (id: string) => Boolean(players[id]);
  const activeTeam = (team: string[]) => team.filter(id => id !== GUEST_ID && hasPlayer(id));
  const avg = (team: string[]) =>
    team.reduce((s, id) => s + (players[id]?.elo ?? ELO_BASELINE), 0) / team.length;
  const recordPartners = (team: string[], didWin: boolean) => {
    team.forEach((playerId) => {
      team.forEach((partnerId) => {
        if (playerId === partnerId) return;
        const partnerStats = players[playerId].partners[partnerId] || { games: 0, wins: 0 };
        partnerStats.games += 1;
        if (didWin) partnerStats.wins += 1;
        players[playerId].partners[partnerId] = partnerStats;
      });
    });
  };

  const resolveName = (id: string) => getIdDisplayName(id, profileMap);

  const sortedMatches = [...matches].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  sortedMatches.forEach(m => {
    const t1 = normalizeTeam(resolveTeamIds(m.team1_ids, m.team1, nameToIdMap));
    const t2 = normalizeTeam(resolveTeamIds(m.team2_ids, m.team2, nameToIdMap));
    [...t1, ...t2].forEach(id => ensurePlayer(id, resolveName(id), null, badgeMap[id]));
    const t1Active = activeTeam(t1);
    const t2Active = activeTeam(t2);

    if (!t1Active.length || !t2Active.length) return;
    if (!Number.isFinite(m.team1_sets) || !Number.isFinite(m.team2_sets)) return;

    const e1 = avg(t1Active);
    const e2 = avg(t2Active);

    const exp1 = getExpectedScore(e1, e2);
    const team1Won = m.team1_sets > m.team2_sets;
    const marginMultiplier = getMarginMultiplier(m.team1_sets, m.team2_sets);
    const matchWeight = getMatchWeight(m);
    const timestamp = new Date(m.created_at).getTime();
    const historyStamp = Number.isNaN(timestamp) ? 0 : timestamp;

    t1Active.forEach(id => {
      const player = players[id];
      const playerK = getKFactor(player.games);
      const weight = getPlayerWeight(player.elo, e1);
      const delta = Math.round(
        playerK * marginMultiplier * matchWeight * weight * ((team1Won ? 1 : 0) - exp1)
      );
      player.elo += delta;
      team1Won ? player.wins++ : player.losses++;
      player.games++;
      player.history.push({
        result: team1Won ? "W" : "L",
        timestamp: historyStamp,
        delta,
        matchId: m.id,
      });
    });

    t2Active.forEach(id => {
      const player = players[id];
      const playerK = getKFactor(player.games);
      const weight = getPlayerWeight(player.elo, e2);
      const delta = Math.round(
        playerK * marginMultiplier * matchWeight * weight * ((team1Won ? 0 : 1) - (1 - exp1))
      );
      player.elo += delta;
      team1Won ? player.losses++ : player.wins++;
      player.games++;
      player.history.push({
        result: team1Won ? "L" : "W",
        timestamp: historyStamp,
        delta,
        matchId: m.id,
      });
    });

    recordPartners(t1Active, team1Won);
    recordPartners(t2Active, !team1Won);
  });

  return Object.values(players).map(player => {
    const recentResults = [...player.history]
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(entry => entry.result);
    const bestPartnerEntry = Object.entries(player.partners)
      .map(([partnerId, stats]) => ({
        partnerId,
        games: stats.games,
        wins: stats.wins,
        winRate: stats.games ? stats.wins / stats.games : 0,
      }))
      .filter(entry => entry.games >= 2)
      .sort((a, b) => {
        if (b.winRate !== a.winRate) return b.winRate - a.winRate;
        if (b.games !== a.games) return b.games - a.games;
        return b.wins - a.wins;
      })[0];

    const bestPartner = bestPartnerEntry
      ? {
        ...bestPartnerEntry,
        name: resolveName(bestPartnerEntry.partnerId),
      }
      : null;

    return { ...player, recentResults, bestPartner };
  });
}
