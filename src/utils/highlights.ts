import { Match, Profile, PlayerStats } from "../types";
import { getExpectedScore } from "./elo";

export interface MatchHighlight {
  matchId: string;
  reason: 'upset' | 'thriller' | 'crush' | 'titans';
  title: string;
  description: string;
  matchDate: string;
}

export const findMatchHighlight = (
  allMatches: Match[],
  playerStats: PlayerStats[]
): MatchHighlight | null => {
  if (!allMatches.length || !playerStats.length) return null;

  // 1. Find the latest date and matches on that date in a single pass.
  // ISO strings sort lexicographically, so we can find the latest without sorting.
  let latestMatch = allMatches[0];
  for (let i = 1; i < allMatches.length; i++) {
    if (allMatches[i].created_at > latestMatch.created_at) {
      latestMatch = allMatches[i];
    }
  }

  // We preserve toDateString() behavior to stay consistent with local time zones.
  const latestDateStr = new Date(latestMatch.created_at).toDateString();
  const latestMatches = allMatches.filter(
    m => new Date(m.created_at).toDateString() === latestDateStr
  );

  if (!latestMatches.length) return null;

  // 2. Identify players involved in the latest matches to minimize indexing work.
  const relevantPlayerIds = new Set<string>();
  for (const match of latestMatches) {
    if (Array.isArray(match.team1_ids)) {
      for (const id of match.team1_ids) if (id) relevantPlayerIds.add(id);
    }
    if (Array.isArray(match.team2_ids)) {
      for (const id of match.team2_ids) if (id) relevantPlayerIds.add(id);
    }
  }

  // 3. Pre-index player history for O(1) lookups instead of O(H) .find()
  // Only for relevant players to avoid unnecessary memory/CPU usage.
  const playerHistoryMap = new Map<string, Map<string, any>>();
  for (let i = 0; i < playerStats.length; i++) {
    const p = playerStats[i];
    if (!relevantPlayerIds.has(p.id)) continue;

    const historyMap = new Map<string, any>();
    for (let j = 0; j < p.history.length; j++) {
      const h = p.history[j];
      historyMap.set(h.matchId, h);
    }
    playerHistoryMap.set(p.id, historyMap);
  }

  const highlights: { match: Match; score: number; type: MatchHighlight['reason']; title: string; description: string }[] = [];

  latestMatches.forEach(match => {
    // Get pre-match ELO for all players using the pre-indexed Map
    const getPreElo = (id: string | null) => {
      if (!id) return 1000;
      const historyMap = playerHistoryMap.get(id);
      if (!historyMap) return 1000;
      const matchHistory = historyMap.get(match.id);
      return matchHistory ? matchHistory.elo - matchHistory.delta : 1000;
    };

    const t1PreElo = match.team1_ids.map(getPreElo);
    const t2PreElo = match.team2_ids.map(getPreElo);

    const avg1 = t1PreElo.reduce((a, b) => a + b, 0) / (t1PreElo.length || 1);
    const avg2 = t2PreElo.reduce((a, b) => a + b, 0) / (t2PreElo.length || 1);

    const exp1 = getExpectedScore(avg1, avg2);
    const team1Won = match.team1_sets > match.team2_sets;

    const winnerExp = team1Won ? exp1 : (1 - exp1);
    const margin = Math.abs(match.team1_sets - match.team2_sets);
    const totalElo = avg1 + avg2;

    // 1. Upset?
    if (winnerExp < 0.45) {
      highlights.push({
        match,
        type: 'upset',
        score: (0.5 - winnerExp) * 100, // Higher score for bigger upset
        title: 'Kvällens Skräll',
        description: `Underdog-seger! ${team1Won ? 'Lag 1' : 'Lag 2'} vann trots endast ${Math.round(winnerExp * 100)}% vinstchans.`
      });
    }

    // 2. Thriller?
    if (margin <= 1) {
       highlights.push({
        match,
        type: 'thriller',
        score: 50 - (winnerExp > 0.5 ? winnerExp - 0.5 : 0.5 - winnerExp) * 20, // Closer expected score + close result
        title: 'Kvällens Rysare',
        description: `En riktig nagelbitare som avgjordes med minsta möjliga marginal (${match.team1_sets}-${match.team2_sets}).`
      });
    }

    // 3. Crush?
    if (margin >= 3) {
      highlights.push({
        match,
        type: 'crush',
        score: margin * 10,
        title: 'Kvällens Kross',
        description: `Total dominans! En övertygande seger med ${match.team1_sets}-${match.team2_sets}.`
      });
    }

    // 4. Titans?
    highlights.push({
      match,
      type: 'titans',
      score: (totalElo - 2000) / 10,
      title: 'Giganternas Kamp',
      description: `Mötet med kvällens högsta samlade ELO-poäng (${Math.round(totalElo)}).`
    });
  });

  // Pick the best highlight
  // Priority: upset > thriller > crush > titans
  const priority = { upset: 4, thriller: 3, crush: 2, titans: 1 };

  highlights.sort((a, b) => {
    if (priority[a.type] !== priority[b.type]) {
      return priority[b.type] - priority[a.type];
    }
    return b.score - a.score;
  });

  if (!highlights.length) return null;

  const best = highlights[0];
  return {
    matchId: best.match.id,
    reason: best.type,
    title: best.title,
    description: best.description,
    matchDate: latestDateStr
  };
};
