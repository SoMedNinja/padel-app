import { Match, PlayerStats } from "../types";

export const EVENING_MIN_GAMES = 3;
export const MONTH_MIN_GAMES = 6;

export interface MvpScoreResult {
  name: string;
  id: string;
  wins: number;
  games: number;
  winRate: number;
  periodEloGain: number;
  eloNet: number;
  score: number;
  isEligible: boolean;
  badgeId: string | null;
}

/**
 * Calculates the MVP score based on ELO gain, win rate, and participation.
 * Formula: Score = eloGain + (winRate * 15) + (games * 0.5)
 */
export function calculateMvpScore(
  wins: number,
  games: number,
  periodEloGain: number
): number {
  const winRate = games > 0 ? wins / games : 0;
  return periodEloGain + winRate * 15 + games * 0.5;
}

/**
 * Scores a set of players for a given period defined by a set of matches.
 */
export function scorePlayersForMvp(
  matches: Match[],
  players: PlayerStats[],
  minGames: number
): MvpScoreResult[] {
  const matchIds = new Set(matches.map(m => m.id).filter(Boolean));

  return players.map(player => {
    let wins = 0;
    let games = 0;
    let periodEloGain = 0;

    // Calculate stats for this period in a single pass
    for (const h of player.history) {
      if (matchIds.has(h.matchId)) {
        games++;
        if (h.result === "W") wins++;
        periodEloGain += (h.delta || 0);
      }
    }

    const winRate = games > 0 ? wins / games : 0;
    const score = calculateMvpScore(wins, games, periodEloGain);

    return {
      name: player.name,
      id: player.id,
      wins,
      games,
      winRate,
      periodEloGain,
      eloNet: player.elo,
      score,
      isEligible: games >= minGames,
      badgeId: player.featuredBadgeId || null,
    };
  });
}

/**
 * Determines the MVP winner from a list of scored results.
 */
export function getMvpWinner(results: MvpScoreResult[]): MvpScoreResult | null {
  const eligible = results.filter(r => r.isEligible);
  if (eligible.length === 0) return null;

  return [...eligible].sort((a, b) => {
    // 1. Higher Score
    if (Math.abs(b.score - a.score) > 0.001) return b.score - a.score;
    // 2. Higher ELO Gain
    if (Math.abs(b.periodEloGain - a.periodEloGain) > 0.001) return b.periodEloGain - a.periodEloGain;
    // 3. Higher Total ELO (Net)
    if (b.eloNet !== a.eloNet) return b.eloNet - a.eloNet;
    // 4. More Wins
    if (b.wins !== a.wins) return b.wins - a.wins;
    // 5. Alphabetical
    return a.name.localeCompare(b.name);
  })[0];
}
