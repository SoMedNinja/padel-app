import { Match, PlayerStats, Profile, MvpCandidate, WeekHighlight, WeeklyPlayerStats, PartnerStat, RivalStat } from "./types.ts";
import { WEEKLY_MIN_GAMES, GUEST_ID, ELO_BASELINE } from "./constants.ts";
import { getExpectedScore } from "./elo.ts";
import { buildTeamLabel, formatShortDate, formatScore } from "./utils.ts";

export const getMvpWinner = (candidates: MvpCandidate[]) => {
  let winner: MvpCandidate | null = null;

  for (let i = 0; i < candidates.length; i++) {
    const r = candidates[i];
    if (r.matchesPlayed < WEEKLY_MIN_GAMES) continue;
    if (!winner) {
      winner = r;
      continue;
    }

    const scoreDiff = r.score - winner.score;
    if (scoreDiff > 0.001) {
      winner = r;
    } else if (scoreDiff > -0.001) {
      const eloGainDiff = r.periodEloGain - winner.periodEloGain;
      if (eloGainDiff > 0.001) {
        winner = r;
      } else if (eloGainDiff > -0.001) {
        if (r.eloNet > winner.eloNet) {
          winner = r;
        } else if (r.eloNet === winner.eloNet) {
          if (r.wins > winner.wins) {
            winner = r;
          } else if (r.wins === winner.wins) {
            if (r.name.localeCompare(winner.name) < 0) {
              winner = r;
            }
          }
        }
      }
    }
  }

  return winner;
};

export function findWeekHighlight(
  weekMatches: Match[],
  playersEnd: Record<string, PlayerStats>,
  playersStart: Record<string, PlayerStats>,
  profileMap: Map<string, Profile>
): WeekHighlight | null {
  if (!weekMatches.length) return null;

  const highlights: WeekHighlight[] = [];

  weekMatches.forEach(match => {
    const getPreElo = (id: string | null) => {
      if (!id || id === GUEST_ID) return 1000;
      const pEnd = playersEnd[id];
      // If pEnd doesn't exist, it might be a guest not active in the current calculation
      if (!pEnd) return playersStart[id]?.elo ?? 1000;

      const matchIdx = pEnd.history.findIndex(h => h.matchId === match.id);
      if (matchIdx === -1) return playersStart[id]?.elo ?? 1000;

      let eloBefore = pEnd.elo;
      for (let i = pEnd.history.length - 1; i >= matchIdx; i--) {
        eloBefore -= pEnd.history[i].delta;
      }
      return eloBefore;
    };

    const t1PreElo = match.team1_ids.map(getPreElo);
    const t2PreElo = match.team2_ids.map(getPreElo);
    const avg1 = t1PreElo.reduce((a, b) => a + b, 0) / (t1PreElo.length || 1);
    const avg2 = t2PreElo.reduce((a, b) => a + b, 0) / (t2PreElo.length || 1);
    const exp1 = getExpectedScore(avg1, avg2);
    const team1Won = match.team1_sets > match.team2_sets;
    const winnerExp = team1Won ? exp1 : (1 - exp1);
    const margin = Math.abs(match.team1_sets - match.team2_sets);

    const teamsLabel = buildTeamLabel(match, profileMap);
    const totalElo = avg1 + avg2;

    // 1. Upset?
    if (winnerExp < 0.35) {
      highlights.push({
        type: 'upset',
        score: (0.5 - winnerExp) * 100,
        title: 'Veckans Skräll',
        description: `Underdog-seger! Laget med endast ${Math.round(winnerExp * 100)}% vinstchans vann med ${match.team1_sets}-${match.team2_sets}. Lag: ${teamsLabel}.`
      });
    }
    // 2. Thriller?
    if (margin <= 1) {
       highlights.push({
        type: 'thriller',
        score: 50 - (winnerExp > 0.5 ? winnerExp - 0.5 : 0.5 - winnerExp) * 20,
        title: 'Veckans Rysare',
        description: `En riktig nagelbitare som avgjordes med minsta möjliga marginal (${match.team1_sets}-${match.team2_sets}). Lag: ${teamsLabel}.`
      });
    }
    // 3. Crush?
    if (margin >= 3) {
      highlights.push({
        type: 'crush',
        score: margin * 10,
        title: 'Veckans Kross',
        description: `Total dominans! En övertygande seger med ${match.team1_sets}-${match.team2_sets}. Lag: ${teamsLabel}.`
      });
    }
    // 4. Titans?
    if (totalElo > 2200) {
      highlights.push({
        type: 'titans',
        score: (totalElo - 2000) / 10,
        title: 'Veckans Giganter',
        description: `Mötet med veckans högsta samlade ELO-poäng (${Math.round(totalElo)}). Lag: ${teamsLabel}.`
      });
    }
  });

  const priority: Record<string, number> = { upset: 4, thriller: 3, crush: 2, titans: 1 };
  highlights.sort((a, b) => {
    if (priority[a.type] !== priority[b.type]) return priority[b.type] - priority[a.type];
    return b.score - a.score;
  });

  return highlights[0] || null;
}

export function calculateWeeklyStats(
  activePlayerIds: Set<string>,
  eloStart: Record<string, PlayerStats>,
  eloEnd: Record<string, PlayerStats>,
  profileMap: Map<string, Profile>,
  weeklyMatches: Match[]
): Record<string, WeeklyPlayerStats> {
  const weeklyStats: Record<string, WeeklyPlayerStats> = {};

  // Performance Optimization: Pre-calculate match map to avoid O(N*M) lookups
  const playerMatchesMap = new Map<string, Match[]>();
  weeklyMatches.forEach(m => {
    const uniqueIds = new Set([...m.team1_ids, ...m.team2_ids]);
    uniqueIds.forEach(pid => {
      if (pid && pid !== GUEST_ID) {
        if (!playerMatchesMap.has(pid)) {
          playerMatchesMap.set(pid, []);
        }
        playerMatchesMap.get(pid)!.push(m);
      }
    });
  });

  Array.from(activePlayerIds).forEach(id => {
    const pStart = eloStart[id] || { elo: ELO_BASELINE };
    const profile = profileMap.get(id);
    const pEnd = eloEnd[id] || { elo: ELO_BASELINE, name: profile?.name || "Okänd" };
    const pMatches = playerMatchesMap.get(id) || [];
    const wins = pMatches.filter(m => {
      const isT1 = m.team1_ids.includes(id);
      return isT1 ? m.team1_sets > m.team2_sets : m.team2_sets > m.team1_sets;
    }).length;

    const partners: Record<string, number> = {};
    const partnerStats: Record<string, { games: number; wins: number }> = {};
    const opponentStats: Record<string, { games: number; wins: number }> = {};
    pMatches.forEach(m => {
      const isTeam1 = m.team1_ids.includes(id);
      const didWin = isTeam1 ? m.team1_sets > m.team2_sets : m.team2_sets > m.team1_sets;
      const team = isTeam1 ? m.team1_ids : m.team2_ids;
      const opponents = isTeam1 ? m.team2_ids : m.team1_ids;
      team.forEach(pid => {
        if (pid && pid !== id && pid !== GUEST_ID) {
          partners[pid] = (partners[pid] || 0) + 1;
          partnerStats[pid] = partnerStats[pid] || { games: 0, wins: 0 };
          partnerStats[pid].games += 1;
          partnerStats[pid].wins += didWin ? 1 : 0;
        }
      });
      opponents.forEach(pid => {
        if (pid && pid !== GUEST_ID) {
          opponentStats[pid] = opponentStats[pid] || { games: 0, wins: 0 };
          opponentStats[pid].games += 1;
          opponentStats[pid].wins += didWin ? 1 : 0;
        }
      });
    });

    const sortedMatches = [...pMatches].sort((a, b) => a.created_at.localeCompare(b.created_at));
    // Non-coder note: we take the last five wins/losses to build the tiny form curve in the email.
    const recentResults = sortedMatches.slice(-5).map(m => {
      const isT1 = m.team1_ids.includes(id);
      const didWin = isT1 ? m.team1_sets > m.team2_sets : m.team2_sets > m.team1_sets;
      return didWin ? "W" : "L";
    });

    const bestPartnerEntry = Object.entries(partnerStats).sort((a, b) => b[1].games - a[1].games)[0];
    const synergy: PartnerStat | null = bestPartnerEntry
      ? {
        id: bestPartnerEntry[0],
        name: profileMap.get(bestPartnerEntry[0])?.name || "Okänd",
        avatarUrl: profileMap.get(bestPartnerEntry[0])?.avatar_url || null,
        games: bestPartnerEntry[1].games,
        winRate: Math.round((bestPartnerEntry[1].wins / bestPartnerEntry[1].games) * 100),
      }
      : null;

    const topOpponentEntry = Object.entries(opponentStats).sort((a, b) => b[1].games - a[1].games)[0];
    const rivalry: RivalStat | null = topOpponentEntry
      ? {
        id: topOpponentEntry[0],
        name: profileMap.get(topOpponentEntry[0])?.name || "Okänd",
        avatarUrl: profileMap.get(topOpponentEntry[0])?.avatar_url || null,
        games: topOpponentEntry[1].games,
        winRate: Math.round((topOpponentEntry[1].wins / topOpponentEntry[1].games) * 100),
      }
      : null;

    const comebackMatch = sortedMatches
      .filter(m => {
        const isT1 = m.team1_ids.includes(id);
        return isT1 ? m.team1_sets > m.team2_sets : m.team2_sets > m.team1_sets;
      })
      .map(m => {
        const isT1 = m.team1_ids.includes(id);
        const teamSets = isT1 ? m.team1_sets : m.team2_sets;
        const oppSets = isT1 ? m.team2_sets : m.team1_sets;
        return { match: m, margin: teamSets - oppSets };
      })
      .sort((a, b) => a.margin - b.margin)[0];

    // Non-coder note: we group scores by date so one date label can cover multiple games.
    const resultsByDate = [...pMatches]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .reduce((acc: { dateLabel: string; scores: string[] }[], match) => {
        const dateLabel = formatShortDate(match.created_at);
        if (!dateLabel) return acc;
        const scoreLabel = formatScore(match.team1_sets, match.team2_sets);
        const existing = acc.find(entry => entry.dateLabel === dateLabel);
        if (existing) {
          existing.scores.push(scoreLabel);
        } else {
          acc.push({ dateLabel, scores: [scoreLabel] });
        }
        return acc;
      }, []);

    weeklyStats[id] = {
      name: pEnd.name,
      matchesPlayed: pMatches.length,
      eloDelta: pEnd.elo - pStart.elo,
      currentElo: pEnd.elo,
      winRate: pMatches.length > 0 ? Math.round((wins / pMatches.length) * 100) : 0,
      partners: Object.entries(partners).map(([pid, count]) => ({
        name: profileMap.get(pid)?.name || "Okänd",
        count
      })),
      avatarUrl: profile?.avatar_url || null,
      synergy,
      rivalry,
      bestComeback: comebackMatch
        ? {
          score: `${comebackMatch.match.team1_sets}-${comebackMatch.match.team2_sets}`,
          margin: comebackMatch.margin,
          teamsLabel: buildTeamLabel(comebackMatch.match, profileMap),
        }
        : null,
      recentResults,
      resultsByDate,
      wins,
      id,
      featuredBadgeId: profile?.featured_badge_id || null
    };
  });

  return weeklyStats;
}
