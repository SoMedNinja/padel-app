import {
  ELO_BASELINE,
  getExpectedScore,
  getKFactor,
  getMarginMultiplier,
  getPlayerWeight
} from "./elo";
import { GUEST_ID } from "./guest";
import { resolveTeamIds } from "./profileMap";

const normalizeTeam = (team) =>
  Array.isArray(team) ? team.filter(id => id && id !== GUEST_ID) : [];

const ensurePlayer = (map, id) => {
  if (!map[id]) {
    map[id] = { elo: ELO_BASELINE, games: 0 };
  }
};

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(date);
};

const buildThresholdBadges = ({
  idPrefix,
  icon,
  title,
  description,
  thresholds,
  value
}) =>
  thresholds.map(target => ({
    id: `${idPrefix}-${target}`,
    icon,
    title: `${title} ${target}`,
    description: description(target),
    earned: value >= target,
    progress: {
      current: Math.min(value, target),
      target
    }
  }));

export const buildPlayerBadgeStats = (
  matches = [],
  profiles = [],
  playerId,
  nameToIdMap = {}
) => {
  if (!playerId) return null;

  const safeMatches = Array.isArray(matches) ? matches : [];
  const safeProfiles = Array.isArray(profiles) ? profiles : [];

  const eloMap = {};
  safeProfiles.forEach(profile => {
    eloMap[profile.id] = { elo: ELO_BASELINE, games: 0 };
  });

  const stats = {
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
    currentWinStreak: 0,
    bestWinStreak: 0,
    firstWinVsHigherEloAt: null,
    biggestUpsetEloGap: 0,
    currentElo: ELO_BASELINE
  };

  const sortedMatches = [...safeMatches].sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at)
  );

  sortedMatches.forEach(match => {
    const team1 = normalizeTeam(resolveTeamIds(match.team1_ids, match.team1, nameToIdMap));
    const team2 = normalizeTeam(resolveTeamIds(match.team2_ids, match.team2, nameToIdMap));

    if (!team1.length || !team2.length) return;
    if (match.team1_sets == null || match.team2_sets == null) return;

    team1.forEach(id => ensurePlayer(eloMap, id));
    team2.forEach(id => ensurePlayer(eloMap, id));

    const avg = team => {
      if (!team.length) return ELO_BASELINE;
      return (
        team.reduce((sum, id) => {
          ensurePlayer(eloMap, id);
          return sum + eloMap[id].elo;
        }, 0) / team.length
      );
    };

    const e1 = avg(team1);
    const e2 = avg(team2);
    const expected1 = getExpectedScore(e1, e2);
    const team1Won = match.team1_sets > match.team2_sets;
    const marginMultiplier = getMarginMultiplier(match.team1_sets, match.team2_sets);

    const isTeam1 = team1.includes(playerId);
    const isTeam2 = team2.includes(playerId);

    if (isTeam1 || isTeam2) {
      const playerPreElo = eloMap[playerId]?.elo ?? ELO_BASELINE;
      const opponentAvg = isTeam1 ? e2 : e1;
      const playerWon = (isTeam1 && team1Won) || (isTeam2 && !team1Won);

      stats.matchesPlayed += 1;
      if (playerWon) {
        stats.wins += 1;
        stats.currentWinStreak += 1;
        stats.bestWinStreak = Math.max(stats.bestWinStreak, stats.currentWinStreak);
        if (opponentAvg > playerPreElo && !stats.firstWinVsHigherEloAt) {
          stats.firstWinVsHigherEloAt = match.created_at || null;
          stats.biggestUpsetEloGap = Math.round(opponentAvg - playerPreElo);
        } else if (opponentAvg > playerPreElo) {
          stats.biggestUpsetEloGap = Math.max(
            stats.biggestUpsetEloGap,
            Math.round(opponentAvg - playerPreElo)
          );
        }
      } else {
        stats.losses += 1;
        stats.currentWinStreak = 0;
      }
    }

    team1.forEach(id => {
      const player = eloMap[id];
      const playerK = getKFactor(player.games);
      const weight = getPlayerWeight(player.elo, e1);
      const delta = Math.round(
        playerK * marginMultiplier * weight * ((team1Won ? 1 : 0) - expected1)
      );
      player.elo += delta;
      player.games += 1;
    });

    team2.forEach(id => {
      const player = eloMap[id];
      const playerK = getKFactor(player.games);
      const weight = getPlayerWeight(player.elo, e2);
      const delta = Math.round(
        playerK * marginMultiplier * weight * ((team1Won ? 0 : 1) - (1 - expected1))
      );
      player.elo += delta;
      player.games += 1;
    });
  });

  stats.currentElo = Math.round(eloMap[playerId]?.elo ?? ELO_BASELINE);
  return stats;
};

export const buildPlayerBadges = (stats) => {
  if (!stats) {
    return {
      earnedBadges: [],
      lockedBadges: [],
      totalBadges: 0,
      totalEarned: 0
    };
  }

  const badges = [
    ...buildThresholdBadges({
      idPrefix: "matches",
      icon: "🏟️",
      title: "Matcher",
      description: (target) => `Spela ${target} matcher`,
      thresholds: [1, 5, 10, 25, 50, 100],
      value: stats.matchesPlayed
    }),
    ...buildThresholdBadges({
      idPrefix: "wins",
      icon: "🏆",
      title: "Vinster",
      description: (target) => `Vinn ${target} matcher`,
      thresholds: [1, 5, 10, 25, 50],
      value: stats.wins
    }),
    ...buildThresholdBadges({
      idPrefix: "streak",
      icon: "🔥",
      title: "Vinststreak",
      description: (target) => `Vinn ${target} matcher i rad`,
      thresholds: [3, 5, 7, 10],
      value: stats.bestWinStreak
    }),
    ...buildThresholdBadges({
      idPrefix: "elo",
      icon: "📈",
      title: "ELO",
      description: (target) => `Nå ${target} ELO`,
      thresholds: [1100, 1200, 1300, 1400],
      value: stats.currentElo
    }),
    {
      id: "giant-slayer",
      icon: "⚔️",
      title: "Jättedödare",
      description: "Vinn mot ett lag med högre genomsnittlig ELO",
      earned: Boolean(stats.firstWinVsHigherEloAt),
      meta: stats.firstWinVsHigherEloAt
        ? `Första gången: ${formatDate(stats.firstWinVsHigherEloAt)}`
        : "Sikta på en seger mot högre ELO.",
      progress: null
    }
  ];

  const earnedBadges = badges.filter(badge => badge.earned);
  const lockedBadges = badges.filter(badge => !badge.earned);

  return {
    earnedBadges,
    lockedBadges,
    totalBadges: badges.length,
    totalEarned: earnedBadges.length
  };
};
