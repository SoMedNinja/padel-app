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

  // 1. Find the latest date
  const sortedMatches = [...allMatches].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const latestMatch = sortedMatches[0];
  const latestDate = new Date(latestMatch.created_at).toDateString();

  const latestMatches = sortedMatches.filter(
    m => new Date(m.created_at).toDateString() === latestDate
  );

  if (!latestMatches.length) return null;

  // Map to get player stats by ID
  const playerMap = new Map(playerStats.map(p => [p.id, p]));

  // We need to know the ELO *before* the match.
  // We can get this from the player's history in PlayerStats.

  const highlights: { match: Match; score: number; type: MatchHighlight['reason']; title: string; description: string }[] = [];

  latestMatches.forEach(match => {
    // Get pre-match ELO for all players
    const getPreElo = (id: string | null) => {
      if (!id) return 1000;
      const player = playerMap.get(id);
      if (!player) return 1000;
      const matchHistory = player.history.find(h => h.matchId === match.id);
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
    matchDate: new Date(best.match.created_at).toDateString()
  };
};
