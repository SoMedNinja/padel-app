import { GUEST_ID } from "./guest";
import {
  getIdDisplayName,
  getProfileDisplayName,
  makeNameToIdMap,
  makeProfileMap,
  resolveTeamIds,
} from "./profileMap";

const BASE_K = 20;
const HIGH_K = 40;
const MID_K = 30;
const MAX_MARGIN_MULTIPLIER = 1.2;
const MAX_PLAYER_WEIGHT = 1.25;
const MIN_PLAYER_WEIGHT = 0.75;
const EXPECTED_SCORE_DIVISOR = 300;
const PLAYER_WEIGHT_DIVISOR = 800;
const ELO_BASELINE = 1000;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const getKFactor = (games = 0) => {
  if (games < 10) return HIGH_K;
  if (games < 30) return MID_K;
  return BASE_K;
};

export const getExpectedScore = (rating, opponentRating) =>
  1 / (1 + Math.pow(10, (opponentRating - rating) / EXPECTED_SCORE_DIVISOR));

export const getMarginMultiplier = (team1Sets, team2Sets) => {
  if (!Number.isFinite(team1Sets) || !Number.isFinite(team2Sets)) return 1;
  const margin = Math.min(2, Math.abs(team1Sets - team2Sets));
  return 1 + Math.min(MAX_MARGIN_MULTIPLIER - 1, margin * 0.1);
};

export const getPlayerWeight = (playerElo, teamAverageElo) => {
  if (!Number.isFinite(playerElo) || !Number.isFinite(teamAverageElo)) return 1;
  const adjustment = 1 + (teamAverageElo - playerElo) / PLAYER_WEIGHT_DIVISOR;
  return clamp(adjustment, MIN_PLAYER_WEIGHT, MAX_PLAYER_WEIGHT);
};

export { ELO_BASELINE };

export function calculateElo(matches, profiles = []) {
  const players = {};
  const profileMap = makeProfileMap(profiles);
  const nameToIdMap = makeNameToIdMap(profiles);
  const avatarMap = profiles.reduce((acc, profile) => {
    acc[profile.id] = profile.avatar_url || null;
    return acc;
  }, {});

  const ensurePlayer = (id, name = "Okänd", avatarUrl = null) => {
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
      };
    } else {
      if (name && players[id].name === "Okänd") {
        players[id].name = name;
      }
      if (avatarUrl && !players[id].avatarUrl) {
        players[id].avatarUrl = avatarUrl;
      }
    }
  };

  profiles.forEach(p => {
    ensurePlayer(p.id, getProfileDisplayName(p), avatarMap[p.id]);
  });

  const normalizeTeam = (team) => (Array.isArray(team) ? team.filter(Boolean) : []);
  const hasPlayer = (id) => Boolean(players[id]);
  const activeTeam = (team) => team.filter(id => id !== GUEST_ID && hasPlayer(id));
  const avg = (team) =>
    team.reduce((s, id) => s + (players[id]?.elo ?? ELO_BASELINE), 0) / team.length;
  const recordPartners = (team, didWin) => {
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

  const resolveName = (id) => getIdDisplayName(id, profileMap);

  const sortedMatches = [...matches].sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at)
  );

  sortedMatches.forEach(m => {
    const t1 = normalizeTeam(resolveTeamIds(m.team1_ids, m.team1, nameToIdMap));
    const t2 = normalizeTeam(resolveTeamIds(m.team2_ids, m.team2, nameToIdMap));
    [...t1, ...t2].forEach(id => ensurePlayer(id, resolveName(id)));
    const t1Active = activeTeam(t1);
    const t2Active = activeTeam(t2);

    if (!t1Active.length || !t2Active.length) return;
    if (!Number.isFinite(m.team1_sets) || !Number.isFinite(m.team2_sets)) return;

    const e1 = avg(t1Active);
    const e2 = avg(t2Active);

    const exp1 = getExpectedScore(e1, e2);
    const team1Won = m.team1_sets > m.team2_sets;
    const marginMultiplier = getMarginMultiplier(m.team1_sets, m.team2_sets);
    const timestamp = new Date(m.created_at).getTime();
    const historyStamp = Number.isNaN(timestamp) ? 0 : timestamp;

    t1Active.forEach(id => {
      const player = players[id];
      const playerK = getKFactor(player.games);
      const weight = getPlayerWeight(player.elo, e1);
      const delta = Math.round(playerK * marginMultiplier * weight * ((team1Won ? 1 : 0) - exp1));
      player.elo += delta;
      team1Won ? players[id].wins++ : players[id].losses++;
      players[id].games++;
      players[id].history.push({ result: team1Won ? "W" : "L", timestamp: historyStamp });
    });

    t2Active.forEach(id => {
      const player = players[id];
      const playerK = getKFactor(player.games);
      const weight = getPlayerWeight(player.elo, e2);
      const delta = Math.round(
        playerK * marginMultiplier * weight * ((team1Won ? 0 : 1) - (1 - exp1))
      );
      player.elo += delta;
      team1Won ? players[id].losses++ : players[id].wins++;
      players[id].games++;
      players[id].history.push({ result: team1Won ? "L" : "W", timestamp: historyStamp });
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
