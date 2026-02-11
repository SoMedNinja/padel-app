import {
  ELO_BASELINE,
  getExpectedScore,
  getKFactor,
  getMarginMultiplier,
  getPlayerWeight,
  getMatchWeight,
} from "./elo";
import { GUEST_ID } from "./guest";
import { resolveTeamIds } from "./profileMap";
import { Match, Profile } from "../types";
import { formatDate } from "./format";

const normalizeTeam = (team: (string | null)[] | undefined) =>
  Array.isArray(team) ? team.filter((id): id is string => !!id && id !== GUEST_ID) : [];

interface EloMapEntry {
  elo: number;
  games: number;
}

const ensurePlayer = (map: Record<string, EloMapEntry>, id: string) => {
  if (!map[id]) {
    map[id] = { elo: ELO_BASELINE, games: 0 };
  }
};

const romanNumerals = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
const toRoman = (index: number) => romanNumerals[index] || `${index + 1}`;

interface BadgeDefinition {
  idPrefix: string;
  icon: string;
  title: string;
  description: (target: number) => string;
  thresholds: number[];
  group: string;
  groupOrder: number;
}

const BADGE_DEFINITIONS: BadgeDefinition[] = [
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
    thresholds: [25, 50, 100, 150, 200, 250],
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
  },
  {
    idPrefix: "night-owl",
    icon: "🦉",
    title: "Nattugglan",
    description: (target) => `Spela ${target} matcher efter kl 21:00`,
    thresholds: [5, 10, 25],
    group: "Övrigt",
    groupOrder: 20
  },
  {
    idPrefix: "early-bird",
    icon: "🌅",
    title: "Morgonpigg",
    description: (target) => `Spela ${target} matcher före kl 09:00`,
    thresholds: [5, 10, 25],
    group: "Övrigt",
    groupOrder: 21
  },
  {
    idPrefix: "sets-won",
    icon: "🍽️",
    title: "Set-slukaren",
    description: (target) => `Vinn totalt ${target} set`,
    thresholds: [10, 25, 50, 100, 250],
    group: "Prestationer",
    groupOrder: 22
  },
  {
    idPrefix: "guest-helper",
    icon: "🤝",
    title: "Gästvänlig",
    description: (target) => `Spela med ${target} gäster`,
    thresholds: [1, 5, 10, 20],
    group: "Prestationer",
    groupOrder: 23
  },
  {
    idPrefix: "clean-sheets",
    icon: "🧹",
    title: "Nollan",
    description: (target) => `Vinn ${target} matcher utan att tappa set`,
    thresholds: [5, 10, 25, 50],
    group: "Vinster",
    groupOrder: 22
  },
  {
    idPrefix: "sets-lost",
    icon: "🎁",
    title: "Generösitet",
    description: (target) => `Förlora totalt ${target} set`,
    thresholds: [10, 25, 50, 100, 250],
    group: "Prestationer",
    groupOrder: 24
  }
];

const UNIQUE_BADGE_DEFINITIONS = [
  { id: "king-of-elo", icon: "👑", title: "Padelkungen", description: "Högst ELO just nu (minst 10 spelade matcher)", group: "Unika Meriter", groupOrder: 0 },
  { id: "most-active", icon: "🐜", title: "Arbetsmyran", description: "Flest spelade matcher totalt", group: "Unika Meriter", groupOrder: 0 },
  { id: "win-machine", icon: "🤖", title: "Vinstmaskinen", description: "Högst vinstprocent (minst 20 spelade matcher)", group: "Unika Meriter", groupOrder: 0 },
  { id: "upset-king", icon: "⚡", title: "Skräll-mästaren", description: "Störst enskild ELO-skräll", group: "Unika Meriter", groupOrder: 0 },
  { id: "marathon-pro", icon: "🏃", title: "Maraton-löparen", description: "Flest maratonmatcher (6+ set)", group: "Unika Meriter", groupOrder: 0 },
  { id: "clutch-pro", icon: "🧊", title: "Clutch-specialisten", description: "Flest nagelbitare (vinster med 1 set)", group: "Unika Meriter", groupOrder: 0 },
  { id: "social-butterfly", icon: "🦋", title: "Sociala fjärilen", description: "Flest unika partners", group: "Unika Meriter", groupOrder: 0 },
  { id: "monthly-giant", icon: "🐘", title: "Månadens gigant", description: "Flest matcher senaste 30 dagarna", group: "Unika Meriter", groupOrder: 0 },
  { id: "the-wall", icon: "🧱", title: "Väggen", description: "Flest vinster med noll insläppta set", group: "Unika Meriter", groupOrder: 0 },
  { id: "loss-machine", icon: "🌪️", title: "Motvind", description: "Högst förlustprocent (minst 20 spelade matcher)", group: "Unika Meriter", groupOrder: 0 },
  { id: "trough-dweller", icon: "🤿", title: "Bottenkänning", description: "Lägst ELO just nu (minst 10 spelade matcher)", group: "Unika Meriter", groupOrder: 0 },
  { id: "biggest-fall", icon: "⚓", title: "Sänket", description: "Störst enskild ELO-förlust", group: "Unika Meriter", groupOrder: 0 },
  { id: "hard-times", icon: "🩹", title: "Otursprenumerant", description: "Flest förluster totalt", group: "Unika Meriter", groupOrder: 0 },
  { id: "most-generous", icon: "💝", title: "Generös", description: "Flest förlorade set totalt", group: "Unika Meriter", groupOrder: 0 },
  { id: "cold-streak-pro", icon: "❄️", title: "Isvind", description: "Längst förluststreak", group: "Unika Meriter", groupOrder: 0 },
];

const BADGE_ICON_MAP = BADGE_DEFINITIONS.reduce((acc, def) => {
  acc[def.idPrefix] = def.icon;
  return acc;
}, { "giant-slayer": "⚔️" } as Record<string, string>);

UNIQUE_BADGE_DEFINITIONS.forEach(def => {
  BADGE_ICON_MAP[def.id] = def.icon;
});

const BADGE_THRESHOLD_MAP = BADGE_DEFINITIONS.reduce((acc, def) => {
  acc[def.idPrefix] = def.thresholds;
  return acc;
}, {} as Record<string, number[]>);

export interface Badge {
  id: string;
  icon: string;
  tier: string;
  title: string;
  description: string;
  earned: boolean;
  group: string;
  groupOrder: number;
  progress: { current: number; target: number } | null;
  meta?: string;
  holderId?: string;
  holderValue?: number | string;
}

const buildThresholdBadges = ({
  idPrefix,
  icon,
  title,
  description,
  thresholds,
  value,
  group,
  groupOrder = 0
}: {
  idPrefix: string;
  icon: string;
  title: string;
  description: (target: number) => string;
  thresholds: number[];
  value: number;
  group: string;
  groupOrder?: number;
}): Badge[] =>
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

export const getBadgeIconById = (badgeId: string | null | undefined) => {
  if (!badgeId) return null;
  // Direct match for unique badges or giant-slayer
  if (BADGE_ICON_MAP[badgeId]) return BADGE_ICON_MAP[badgeId];

  const lastDash = badgeId.lastIndexOf("-");
  const prefix = lastDash > -1 ? badgeId.slice(0, lastDash) : badgeId;
  return BADGE_ICON_MAP[prefix] || null;
};

export const getBadgeTierLabelById = (badgeId: string | null | undefined) => {
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

export const getBadgeLabelById = (badgeId: string | null | undefined) => {
  const icon = getBadgeIconById(badgeId);
  if (!icon) return "";
  const tier = getBadgeTierLabelById(badgeId);
  return tier ? `${icon} ${tier}` : icon;
};

export const getBadgeDescriptionById = (badgeId: string | null | undefined): string | null => {
  if (!badgeId) return null;

  // Handle giant-slayer special cases
  if (badgeId === "giant-slayer") return "Vinn mot ett lag med högre genomsnittlig ELO";
  if (badgeId === "giant-slayer-pro") return "Vinn mot ett lag med 200+ högre genomsnittlig ELO";

  // Check unique badges
  const unique = UNIQUE_BADGE_DEFINITIONS.find(u => u.id === badgeId);
  if (unique) return unique.description;

  // Check threshold badges
  const lastDash = badgeId.lastIndexOf("-");
  if (lastDash > -1) {
    const prefix = badgeId.slice(0, lastDash);
    const target = Number(badgeId.slice(lastDash + 1));
    const def = BADGE_DEFINITIONS.find(d => d.idPrefix === prefix);
    if (def && !isNaN(target)) {
      return def.description(target);
    }
  }

  return null;
};

export interface PlayerBadgeStats {
  matchesPlayed: number;
  wins: number;
  losses: number;
  currentWinStreak: number;
  bestWinStreak: number;
  firstWinVsHigherEloAt: string | null;
  biggestUpsetEloGap: number;
  currentElo: number;
  matchesLast30Days: number;
  marathonMatches: number;
  quickWins: number;
  closeWins: number;
  cleanSheets: number;
  nightOwlMatches: number;
  earlyBirdMatches: number;
  uniquePartners: number;
  uniqueOpponents: number;
  tournamentsPlayed: number;
  tournamentWins: number;
  tournamentPodiums: number;
  americanoWins: number;
  mexicanoWins: number;
  totalSetsWon: number;
  totalSetsLost: number;
  biggestEloLoss: number;
  currentLossStreak: number;
  bestLossStreak: number;
  guestPartners: number;
}

/**
 * Builds badge stats for all players in a single pass over matches.
 * Performance: O(M + P) instead of O(M * P)
 */
export const buildAllPlayersBadgeStats = (
  matches: Match[] = [],
  profiles: Profile[] = [],
  nameToIdMap: Map<string, string> | Record<string, string> = {},
  tournamentResults: any[] = []
): Record<string, PlayerBadgeStats> => {
  const safeMatches = Array.isArray(matches) ? matches : [];
  const safeProfiles = Array.isArray(profiles) ? profiles : [];
  const mapObj = nameToIdMap instanceof Map ? nameToIdMap : new Map(Object.entries(nameToIdMap));

  const eloMap: Record<string, EloMapEntry> = {};
  const statsMap: Record<string, PlayerBadgeStats> = {};
  const partnerSets: Record<string, Set<string>> = {};
  const opponentSets: Record<string, Set<string>> = {};

  // Initialize for all profiles
  safeProfiles.forEach(profile => {
    eloMap[profile.id] = { elo: ELO_BASELINE, games: 0 };
    statsMap[profile.id] = {
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
      cleanSheets: 0,
      nightOwlMatches: 0,
      earlyBirdMatches: 0,
      uniquePartners: 0,
      uniqueOpponents: 0,
      tournamentsPlayed: 0,
      tournamentWins: 0,
      tournamentPodiums: 0,
      americanoWins: 0,
      mexicanoWins: 0,
      totalSetsWon: 0,
      totalSetsLost: 0,
      biggestEloLoss: 0,
      currentLossStreak: 0,
      bestLossStreak: 0,
      guestPartners: 0
    };
    partnerSets[profile.id] = new Set();
    opponentSets[profile.id] = new Set();
  });

  // Optimization: use string comparison for sorting to avoid expensive new Date() calls.
  const sortedMatches = [...safeMatches].sort((a, b) => {
    if (a.created_at < b.created_at) return -1;
    if (a.created_at > b.created_at) return 1;
    return 0;
  });

  const thirtyDaysAgoISO = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  sortedMatches.forEach(match => {
    const team1 = normalizeTeam(resolveTeamIds(match.team1_ids, match.team1, mapObj));
    const team2 = normalizeTeam(resolveTeamIds(match.team2_ids, match.team2, mapObj));

    if (!team1.length || !team2.length) return;
    if (match.team1_sets == null || match.team2_sets == null) return;

    const avg = (team: string[]) => {
      const len = team.length;
      if (!len) return ELO_BASELINE;
      let sum = 0;
      for (let i = 0; i < len; i++) {
        const id = team[i];
        ensurePlayer(eloMap, id);
        sum += eloMap[id].elo;
      }
      return sum / len;
    };

    const e1 = avg(team1);
    const e2 = avg(team2);
    const expected1 = getExpectedScore(e1, e2);
    const team1Won = match.team1_sets > match.team2_sets;
    const marginMultiplier = getMarginMultiplier(match.team1_sets, match.team2_sets);
    const matchWeight = getMatchWeight(match);

    const setsA = Number(match.team1_sets);
    const setsB = Number(match.team2_sets);
    const maxSets = Math.max(setsA, setsB);
    const margin = Math.abs(setsA - setsB);
    const scoreType = match.score_type || "sets";

    // Optimization: Calculate hour once per match instead of per-player
    const createdAt = match.created_at || "";
    let matchHour = -1;
    if (createdAt) {
      const matchDate = new Date(createdAt);
      if (!Number.isNaN(matchDate.getTime())) {
        matchHour = matchDate.getHours();
      }
    }

    // Helper to update individual player stats and ELO in a single pass
    const updatePlayer = (id: string, isTeam1: boolean) => {
      // Create stats object if it doesn't exist
      if (!statsMap[id]) {
        statsMap[id] = {
          matchesPlayed: 0, wins: 0, losses: 0, currentWinStreak: 0, bestWinStreak: 0,
          firstWinVsHigherEloAt: null, biggestUpsetEloGap: 0, currentElo: ELO_BASELINE,
          matchesLast30Days: 0, marathonMatches: 0, quickWins: 0, closeWins: 0,
          cleanSheets: 0, nightOwlMatches: 0, earlyBirdMatches: 0, uniquePartners: 0,
          uniqueOpponents: 0, tournamentsPlayed: 0, tournamentWins: 0,
          tournamentPodiums: 0, americanoWins: 0, mexicanoWins: 0,
          totalSetsWon: 0, totalSetsLost: 0,
          biggestEloLoss: 0, currentLossStreak: 0, bestLossStreak: 0,
          guestPartners: 0
        };
        partnerSets[id] = new Set();
        opponentSets[id] = new Set();
      }

      const stats = statsMap[id];
      const playerPreElo = eloMap[id]?.elo ?? ELO_BASELINE;
      const opponentAvg = isTeam1 ? e2 : e1;
      const playerWon = (isTeam1 && team1Won) || (!isTeam1 && !team1Won);

      const playerTeam = isTeam1 ? team1 : team2;
      const opponentTeam = isTeam1 ? team2 : team1;
      for (let i = 0; i < playerTeam.length; i++) {
        const pid = playerTeam[i];
        if (pid && pid !== id) partnerSets[id].add(pid);
      }
      for (let i = 0; i < opponentTeam.length; i++) {
        opponentSets[id].add(opponentTeam[i]);
      }

      if (scoreType === "sets") {
        if (maxSets >= 6) stats.marathonMatches += 1;
        if (playerWon && maxSets <= 3) stats.quickWins += 1;
        if (playerWon && margin === 1) stats.closeWins += 1;
        if (playerWon && (isTeam1 ? match.team2_sets === 0 : match.team1_sets === 0)) {
          stats.cleanSheets += 1;
        }
      }
      if (createdAt) {
        if (createdAt >= thirtyDaysAgoISO) stats.matchesLast30Days += 1;
        if (matchHour >= 21) stats.nightOwlMatches += 1;
        if (matchHour >= 0 && matchHour < 9) stats.earlyBirdMatches += 1;
      }

      stats.matchesPlayed += 1;
      stats.totalSetsWon += isTeam1 ? Number(match.team1_sets) : Number(match.team2_sets);
      stats.totalSetsLost += isTeam1 ? Number(match.team2_sets) : Number(match.team1_sets);

      const myTeamIds = isTeam1 ? match.team1_ids : match.team2_ids;
      myTeamIds.forEach(pid => {
        if (pid === GUEST_ID) stats.guestPartners += 1;
      });

      if (playerWon) {
        stats.wins += 1;
        stats.currentWinStreak += 1;
        stats.bestWinStreak = Math.max(stats.bestWinStreak, stats.currentWinStreak);
        stats.currentLossStreak = 0;
        if (opponentAvg > playerPreElo) {
          if (!stats.firstWinVsHigherEloAt) stats.firstWinVsHigherEloAt = match.created_at || null;
          stats.biggestUpsetEloGap = Math.max(stats.biggestUpsetEloGap, Math.round(opponentAvg - playerPreElo));
        }
      } else {
        stats.losses += 1;
        stats.currentWinStreak = 0;
        stats.currentLossStreak += 1;
        stats.bestLossStreak = Math.max(stats.bestLossStreak, stats.currentLossStreak);
      }

      // Update ELO
      const player = eloMap[id];
      const playerK = getKFactor(player.games);
      const weight = getPlayerWeight(player.elo, isTeam1 ? e1 : e2);
      const effectiveWeight = playerWon ? weight : 1 / weight;
      const expected = isTeam1 ? expected1 : (1 - expected1);
      const delta = Math.round(
        playerK * marginMultiplier * matchWeight * effectiveWeight * ((playerWon ? 1 : 0) - expected)
      );
      if (delta < 0) {
        stats.biggestEloLoss = Math.max(stats.biggestEloLoss, Math.abs(delta));
      }
      player.elo += delta;
      player.games += 1;
    };

    for (let i = 0; i < team1.length; i++) updatePlayer(team1[i], true);
    for (let i = 0; i < team2.length; i++) updatePlayer(team2[i], false);
  });

  const tournamentEntries = Array.isArray(tournamentResults) ? tournamentResults : [];
  const tournamentResultsByPlayer: Record<string, any[]> = {};

  // Group tournament results by player for O(T) pass
  tournamentEntries.forEach(entry => {
    if (entry?.profile_id) {
      if (!tournamentResultsByPlayer[entry.profile_id]) {
        tournamentResultsByPlayer[entry.profile_id] = [];
      }
      tournamentResultsByPlayer[entry.profile_id].push(entry);
    }
  });

  // Finalize stats in O(P) pass
  Object.keys(statsMap).forEach(id => {
    const stats = statsMap[id];
    stats.currentElo = Math.round(eloMap[id]?.elo ?? ELO_BASELINE);
    stats.uniquePartners = partnerSets[id].size;
    stats.uniqueOpponents = opponentSets[id].size;

    const playerTournamentResults = tournamentResultsByPlayer[id] || [];
    const tournamentIds = new Set(playerTournamentResults.map((entry: any) => entry.tournament_id));
    stats.tournamentsPlayed = tournamentIds.size;
    stats.tournamentWins = playerTournamentResults.filter((entry: any) => entry.rank === 1).length;
    stats.tournamentPodiums = playerTournamentResults.filter((entry: any) => entry.rank <= 3).length;
    stats.americanoWins = playerTournamentResults.filter((entry: any) => entry.rank === 1 && entry.tournament_type === 'americano').length;
    stats.mexicanoWins = playerTournamentResults.filter((entry: any) => entry.rank === 1 && entry.tournament_type === 'mexicano').length;
  });

  return statsMap;
};

export const buildPlayerBadgeStats = (
  matches: Match[] = [],
  profiles: Profile[] = [],
  playerId: string | null,
  nameToIdMap: Map<string, string> | Record<string, string> = {},
  tournamentResults: any[] = []
): PlayerBadgeStats | null => {
  if (!playerId) return null;
  const allStats = buildAllPlayersBadgeStats(matches, profiles, nameToIdMap, tournamentResults);
  return allStats[playerId] || null;
};

export const buildPlayerBadges = (
  stats: PlayerBadgeStats | null,
  allPlayerStats: Record<string, PlayerBadgeStats> = {},
  playerId: string | null = null
) => {
  if (!stats) {
    return {
      earnedBadges: [],
      otherUniqueBadges: [],
      lockedBadges: [],
      totalBadges: 0,
      totalEarned: 0
    };
  }

  const winRate = stats.matchesPlayed
    ? Math.round((stats.wins / stats.matchesPlayed) * 100)
    : 0;
  const eloLift = Math.max(0, stats.currentElo - ELO_BASELINE);

  const badgeValues: Record<string, number> = {
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
    "clean-sheets": stats.cleanSheets,
    "night-owl": stats.nightOwlMatches,
    "early-bird": stats.earlyBirdMatches,
    "sets-won": stats.totalSetsWon,
    "guest-helper": stats.guestPartners,
    partners: stats.uniquePartners,
    rivals: stats.uniqueOpponents,
    "tournaments-played": stats.tournamentsPlayed,
    "tournaments-wins": stats.tournamentWins,
    "tournaments-podiums": stats.tournamentPodiums,
    "americano-wins": stats.americanoWins,
    "mexicano-wins": stats.mexicanoWins,
    "sets-lost": stats.totalSetsLost
  };

  const badges: Badge[] = [
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
      groupOrder: 25,
      meta: stats.firstWinVsHigherEloAt
        ? `Första gången: ${formatDate(stats.firstWinVsHigherEloAt)}`
        : "Sikta på en seger mot högre ELO.",
      progress: null
    },
    {
      id: "giant-slayer-pro",
      icon: "⚔️",
      tier: "II",
      title: "Stora Jättedödaren",
      description: "Vinn mot ett lag med 200+ högre genomsnittlig ELO",
      earned: stats.biggestUpsetEloGap >= 200,
      group: "Jättedödare",
      groupOrder: 26,
      meta: stats.biggestUpsetEloGap >= 200
        ? `Största skräll: +${stats.biggestUpsetEloGap} ELO`
        : `Din största skräll hittills: +${stats.biggestUpsetEloGap} ELO`,
      progress: {
        current: Math.min(stats.biggestUpsetEloGap, 200),
        target: 200
      }
    }
  ];

  // Unique merits
  const allPlayerIds = Object.keys(allPlayerStats);
  if (allPlayerIds.length > 0 && playerId) {
    // Optimization: find all unique merit leaders in a single pass over all players (O(P * U))
    // instead of nested loops that re-calculate for each merit (O(U * P)).
    const bestValueMap: Record<string, number> = {};
    const bestPlayerIdMap: Record<string, string | null> = {};

    UNIQUE_BADGE_DEFINITIONS.forEach(def => {
      bestValueMap[def.id] = -1;
      bestPlayerIdMap[def.id] = null;
    });

    for (let i = 0; i < allPlayerIds.length; i++) {
      const id = allPlayerIds[i];
      const s = allPlayerStats[id];
      if (!s) continue;

      for (let j = 0; j < UNIQUE_BADGE_DEFINITIONS.length; j++) {
        const def = UNIQUE_BADGE_DEFINITIONS[j];
        let val = -1;
        switch (def.id) {
          case "king-of-elo": if (s.matchesPlayed >= 10) val = s.currentElo; break;
          case "most-active": val = s.matchesPlayed; break;
          case "win-machine": if (s.matchesPlayed >= 20) val = (s.wins / s.matchesPlayed); break;
          case "upset-king": val = s.biggestUpsetEloGap; break;
          case "marathon-pro": val = s.marathonMatches; break;
          case "clutch-pro": val = s.closeWins; break;
          case "social-butterfly": val = s.uniquePartners; break;
          case "monthly-giant": val = s.matchesLast30Days; break;
          case "the-wall": val = s.cleanSheets; break;
          case "loss-machine": if (s.matchesPlayed >= 20) val = (s.losses / s.matchesPlayed); break;
          case "trough-dweller": if (s.matchesPlayed >= 10) val = 10000 - s.currentElo; break;
          case "biggest-fall": val = s.biggestEloLoss; break;
          case "hard-times": val = s.losses; break;
          case "most-generous": val = s.totalSetsLost; break;
          case "cold-streak-pro": val = s.bestLossStreak; break;
        }

        if (val > bestValueMap[def.id]) {
          bestValueMap[def.id] = val;
          bestPlayerIdMap[def.id] = id;
        }
      }
    }

    UNIQUE_BADGE_DEFINITIONS.forEach(def => {
      const hId = bestPlayerIdMap[def.id];
      const val = bestValueMap[def.id];

      if (hId && val > 0) {
        const isEarned = hId === playerId;
        let formattedValue: string | number = val;

        if (def.id === "win-machine" || def.id === "loss-machine") {
          formattedValue = `${Math.round(val * 100)}%`;
        } else if (def.id === "king-of-elo") {
          formattedValue = `${Math.round(val)} ELO`;
        } else if (def.id === "trough-dweller") {
          formattedValue = `${10000 - Math.round(val)} ELO`;
        } else if (def.id === "upset-king") {
          formattedValue = `+${Math.round(val)} ELO`;
        } else if (def.id === "biggest-fall") {
          formattedValue = `-${Math.round(val)} ELO`;
        } else {
          formattedValue = Math.round(val);
        }

        badges.push({
          id: def.id,
          icon: def.icon,
          tier: "Unique",
          title: def.title,
          description: def.description,
          earned: isEarned,
          group: def.group,
          groupOrder: def.groupOrder,
          progress: null,
          holderId: isEarned ? undefined : hId,
          holderValue: isEarned ? undefined : formattedValue,
        });
      } else {
        badges.push({
          id: def.id,
          icon: def.icon,
          tier: "Unique",
          title: def.title,
          description: def.description,
          earned: false,
          group: def.group,
          groupOrder: def.groupOrder,
          progress: null
        });
      }
    });
  }

  const earnedBadges = badges.filter(badge => badge.earned);
  const otherUniqueBadges = badges.filter(badge => !badge.earned && badge.holderId);
  const lockedBadges = badges.filter(badge => !badge.earned && !badge.holderId);

  return {
    earnedBadges,
    otherUniqueBadges,
    lockedBadges,
    totalBadges: badges.length,
    totalEarned: earnedBadges.length
  };
};
