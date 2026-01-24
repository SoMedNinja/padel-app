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

const romanNumerals = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
const toRoman = (index) => romanNumerals[index] || `${index + 1}`;

const BADGE_DEFINITIONS = [
  {
    idPrefix: "matches",
    icon: "🏟️",
    title: "Matcher",
    description: (target) => `Spela ${target} matcher`,
    thresholds: [1, 5, 10, 25, 50, 75, 100, 150, 200],
    group: "Matcher",
    groupOrder: 1
  },
  {
    idPrefix: "wins",
    icon: "🏆",
    title: "Vinster",
    description: (target) => `Vinn ${target} matcher`,
    thresholds: [1, 5, 10, 25, 50, 75, 100, 150],
    group: "Vinster",
    groupOrder: 2
  },
  {
    idPrefix: "losses",
    icon: "🧱",
    title: "Förluster",
    description: (target) => `Spela ${target} förluster`,
    thresholds: [1, 5, 10, 25, 50, 75],
    group: "Förluster",
    groupOrder: 3
  },
  {
    idPrefix: "streak",
    icon: "🔥",
    title: "Vinststreak",
    description: (target) => `Vinn ${target} matcher i rad`,
    thresholds: [3, 5, 7, 10, 15],
    group: "Vinststreak",
    groupOrder: 4
  },
  {
    idPrefix: "activity",
    icon: "📅",
    title: "Aktivitet",
    description: (target) => `Spela ${target} matcher senaste 30 dagarna`,
    thresholds: [3, 6, 10, 15, 20],
    group: "Aktivitet",
    groupOrder: 5
  },
  {
    idPrefix: "elo",
    icon: "📈",
    title: "ELO",
    description: (target) => `Nå ${target} ELO`,
    thresholds: [1100, 1200, 1300, 1400, 1500],
    group: "ELO",
    groupOrder: 6
  },
  {
    idPrefix: "upset",
    icon: "🎯",
    title: "Skräll",
    description: (target) => `Vinn mot ${target}+ ELO högre`,
    thresholds: [25, 50, 100, 150],
    group: "Skräll",
    groupOrder: 7
  },
  {
    idPrefix: "win-rate",
    icon: "📊",
    title: "Vinstprocent",
    description: (target) => `Ha minst ${target}% vinstprocent`,
    thresholds: [50, 60, 70, 80, 90],
    group: "Vinstprocent",
    groupOrder: 8
  },
  {
    idPrefix: "elo-lift",
    icon: "🚀",
    title: "ELO-lyft",
    description: (target) => `Öka ${target} ELO från ${ELO_BASELINE}`,
    thresholds: [50, 100],
    group: "ELO-lyft",
    groupOrder: 9
  },
  {
    idPrefix: "marathon",
    icon: "⏱️",
    title: "Maratonmatcher",
    description: (target) => `Spela ${target} maratonmatcher`,
    thresholds: [1, 3, 5, 10, 15],
    group: "Maraton",
    groupOrder: 10
  },
  {
    idPrefix: "fast-win",
    icon: "⚡",
    title: "Snabbsegrar",
    description: (target) => `Vinn ${target} korta matcher`,
    thresholds: [1, 3, 5, 8, 12],
    group: "Snabbsegrar",
    groupOrder: 11
  },
  {
    idPrefix: "clutch",
    icon: "🧊",
    title: "Nagelbitare",
    description: (target) => `Vinn ${target} matcher med 1 set`,
    thresholds: [1, 3, 5, 8, 12],
    group: "Nagelbitare",
    groupOrder: 12
  },
  {
    idPrefix: "partners",
    icon: "🤝",
    title: "Samarbeten",
    description: (target) => `Spela med ${target} olika partners`,
    thresholds: [2, 4, 6, 10, 15],
    group: "Samarbeten",
    groupOrder: 13
  },
  {
    idPrefix: "rivals",
    icon: "👀",
    title: "Rivaler",
    description: (target) => `Möt ${target} olika motståndare`,
    thresholds: [3, 5, 8, 12, 20],
    group: "Rivaler",
    groupOrder: 14
  },
  {
    idPrefix: "tournaments-played",
    icon: "🎲",
    title: "Turneringar",
    description: (target) => `Spela ${target} turneringar`,
    thresholds: [1, 3, 5, 8],
    group: "Turneringar",
    groupOrder: 15
  },
  {
    idPrefix: "tournaments-wins",
    icon: "🥇",
    title: "Turneringssegrar",
    description: (target) => `Vinn ${target} turneringar`,
    thresholds: [1, 2, 3],
    group: "Turneringar",
    groupOrder: 16
  },
  {
    idPrefix: "tournaments-podiums",
    icon: "🥉",
    title: "Pallplatser",
    description: (target) => `Ta ${target} pallplatser`,
    thresholds: [1, 3, 5],
    group: "Turneringar",
    groupOrder: 17
  },
  {
    idPrefix: "americano-wins",
    icon: "🇺🇸",
    title: "Americano-segrar",
    description: (target) => `Vinn ${target} Americano-turneringar`,
    thresholds: [1, 3, 5],
    group: "Turneringar",
    groupOrder: 18
  },
  {
    idPrefix: "mexicano-wins",
    icon: "🇲🇽",
    title: "Mexicano-segrar",
    description: (target) => `Vinn ${target} Mexicano-turneringar`,
    thresholds: [1, 3, 5],
    group: "Turneringar",
    groupOrder: 19
  }
];

const BADGE_ICON_MAP = BADGE_DEFINITIONS.reduce((acc, def) => {
  acc[def.idPrefix] = def.icon;
  return acc;
}, { "giant-slayer": "⚔️" });

const BADGE_THRESHOLD_MAP = BADGE_DEFINITIONS.reduce((acc, def) => {
  acc[def.idPrefix] = def.thresholds;
  return acc;
}, {});

const buildThresholdBadges = ({
  idPrefix,
  icon,
  title,
  description,
  thresholds,
  value,
  group,
  groupOrder = 0
}) =>
  thresholds.map((target, index) => ({
    id: `${idPrefix}-${target}`,
    icon,
    tier: toRoman(index),
    title: `${title} ${target}`,
    description: description(target),
    earned: value >= target,
    group: group || title,
    groupOrder,
    progress: {
      current: Math.min(value, target),
      target
    }
  }));

export const getBadgeIconById = (badgeId) => {
  if (!badgeId) return null;
  if (badgeId === "giant-slayer") return BADGE_ICON_MAP["giant-slayer"];
  const lastDash = badgeId.lastIndexOf("-");
  const prefix = lastDash > -1 ? badgeId.slice(0, lastDash) : badgeId;
  return BADGE_ICON_MAP[prefix] || null;
};

export const getBadgeTierLabelById = (badgeId) => {
  if (!badgeId) return null;
  if (badgeId === "giant-slayer") return "I";
  const lastDash = badgeId.lastIndexOf("-");
  if (lastDash < 0) return null;
  const prefix = badgeId.slice(0, lastDash);
  const target = badgeId.slice(lastDash + 1);
  const thresholds = BADGE_THRESHOLD_MAP[prefix];
  if (!thresholds) return null;
  const index = thresholds.indexOf(Number(target));
  if (index < 0) return null;
  return toRoman(index);
};

export const getBadgeLabelById = (badgeId) => {
  const icon = getBadgeIconById(badgeId);
  if (!icon) return "";
  const tier = getBadgeTierLabelById(badgeId);
  return tier ? `${icon} ${tier}` : icon;
};

export const buildPlayerBadgeStats = (
  matches = [],
  profiles = [],
  playerId,
  nameToIdMap = {},
  tournamentResults = []
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
    currentElo: ELO_BASELINE,
    matchesLast30Days: 0,
    marathonMatches: 0,
    quickWins: 0,
    closeWins: 0,
    uniquePartners: 0,
    uniqueOpponents: 0,
    tournamentsPlayed: 0,
    tournamentWins: 0,
    tournamentPodiums: 0,
    americanoWins: 0,
    mexicanoWins: 0
  };
  const partnerSet = new Set();
  const opponentSet = new Set();

  const sortedMatches = [...safeMatches].sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at)
  );
  const now = Date.now();

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
      const matchDate = match.created_at ? new Date(match.created_at) : null;
      const setsA = Number(match.team1_sets);
      const setsB = Number(match.team2_sets);
      const maxSets = Math.max(setsA, setsB);
      const margin = Math.abs(setsA - setsB);
      const scoreType = match.score_type || "sets";

      const playerTeam = isTeam1 ? team1 : team2;
      const opponentTeam = isTeam1 ? team2 : team1;
      playerTeam.filter(id => id && id !== playerId).forEach(id => partnerSet.add(id));
      opponentTeam.filter(Boolean).forEach(id => opponentSet.add(id));

      if (scoreType === "sets") {
        if (maxSets >= 6) stats.marathonMatches += 1;
        if (playerWon && maxSets <= 3) stats.quickWins += 1;
        if (playerWon && margin === 1) stats.closeWins += 1;
      }
      if (matchDate && !Number.isNaN(matchDate.getTime())) {
        const diffDays = (now - matchDate.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays <= 30) stats.matchesLast30Days += 1;
      }

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
  stats.uniquePartners = partnerSet.size;
  stats.uniqueOpponents = opponentSet.size;

  const tournamentEntries = Array.isArray(tournamentResults) ? tournamentResults : [];
  const playerTournamentResults = tournamentEntries.filter(
    entry => entry?.profile_id === playerId
  );
  const tournamentIds = new Set(playerTournamentResults.map(entry => entry.tournament_id));
  stats.tournamentsPlayed = tournamentIds.size;
  stats.tournamentWins = playerTournamentResults.filter(entry => entry.rank === 1).length;
  stats.tournamentPodiums = playerTournamentResults.filter(entry => entry.rank <= 3).length;
  stats.americanoWins = playerTournamentResults.filter(entry => entry.rank === 1 && entry.tournament_type === 'americano').length;
  stats.mexicanoWins = playerTournamentResults.filter(entry => entry.rank === 1 && entry.tournament_type === 'mexicano').length;

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

  const winRate = stats.matchesPlayed
    ? Math.round((stats.wins / stats.matchesPlayed) * 100)
    : 0;
  const eloLift = Math.max(0, stats.currentElo - ELO_BASELINE);

  const badgeValues = {
    matches: stats.matchesPlayed,
    wins: stats.wins,
    losses: stats.losses,
    streak: stats.bestWinStreak,
    activity: stats.matchesLast30Days,
    elo: stats.currentElo,
    upset: stats.biggestUpsetEloGap,
    "win-rate": winRate,
    "elo-lift": eloLift,
    marathon: stats.marathonMatches,
    "fast-win": stats.quickWins,
    clutch: stats.closeWins,
    partners: stats.uniquePartners,
    rivals: stats.uniqueOpponents,
    "tournaments-played": stats.tournamentsPlayed,
    "tournaments-wins": stats.tournamentWins,
    "tournaments-podiums": stats.tournamentPodiums,
    "americano-wins": stats.americanoWins,
    "mexicano-wins": stats.mexicanoWins
  };

  const badges = [
    ...BADGE_DEFINITIONS.flatMap(def =>
      buildThresholdBadges({ ...def, value: badgeValues[def.idPrefix] ?? 0 })
    ),
    {
      id: "giant-slayer",
      icon: "⚔️",
      tier: "I",
      title: "Jättedödare",
      description: "Vinn mot ett lag med högre genomsnittlig ELO",
      earned: Boolean(stats.firstWinVsHigherEloAt),
      group: "Jättedödare",
      groupOrder: 20,
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
