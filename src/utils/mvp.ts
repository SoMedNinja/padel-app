import { Match, PlayerStats } from "../types";

export const EVENING_MIN_GAMES = 3;
export const MONTH_MIN_GAMES = 6;
export const MVP_WINDOW_DAYS = 30;
export const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
export const MVP_WIN_RATE_WEIGHT = 15;
export const MVP_GAMES_WEIGHT = 0.5;
export const MVP_SCORE_EPSILON = 0.001;

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
  return periodEloGain + winRate * MVP_WIN_RATE_WEIGHT + games * MVP_GAMES_WEIGHT;
}

/**
 * Scores a set of players for a given period defined by a set of matches.
 */
export function scorePlayersForMvp(
  matches: Match[],
  players: PlayerStats[],
  minGames: number,
  eloDeltaByMatch?: Record<string, Record<string, number>>
): MvpScoreResult[] {
  // Optimization: If we have pre-calculated deltas, use them to avoid O(P * H) scan.
  // This reduces complexity from O(Players * History) to O(Matches * 4).
  if (eloDeltaByMatch) {
    const stats: Record<string, { wins: number; games: number; periodEloGain: number }> = {};

    for (let i = 0; i < matches.length; i++) {
      const m = matches[i];
      const deltas = eloDeltaByMatch[m.id];
      if (!deltas) continue;

      const team1Won = m.team1_sets > m.team2_sets;
      for (const pid in deltas) {
        if (!stats[pid]) stats[pid] = { wins: 0, games: 0, periodEloGain: 0 };
        const s = stats[pid];
        s.games++;
        const delta = deltas[pid];
        s.periodEloGain += delta;

        // Optimization: Use direct index check instead of .includes() for small team arrays (max 2)
        const inT1 = m.team1_ids[0] === pid || m.team1_ids[1] === pid;
        const won = (inT1 && team1Won) || (!inT1 && !team1Won);
        if (won) s.wins++;
      }
    }

    const result: MvpScoreResult[] = [];
    for (let i = 0, len = players.length; i < len; i++) {
      const player = players[i];
      const s = stats[player.id];

      if (!s) {
        result.push({
          name: player.name,
          id: player.id,
          wins: 0,
          games: 0,
          winRate: 0,
          periodEloGain: 0,
          eloNet: player.elo,
          score: 0,
          isEligible: false,
          badgeId: player.featuredBadgeId || null,
        });
        continue;
      }

      const winRate = s.wins / s.games;
      const score = calculateMvpScore(s.wins, s.games, s.periodEloGain);

      result.push({
        name: player.name,
        id: player.id,
        wins: s.wins,
        games: s.games,
        winRate,
        periodEloGain: s.periodEloGain,
        eloNet: player.elo,
        score,
        isEligible: s.games >= minGames,
        badgeId: player.featuredBadgeId || null,
      });
    }
    return result;
  }

  // Fallback for when deltas aren't provided (e.g. tests or legacy calls)
  const matchIds = new Set<string>();
  for (let i = 0; i < matches.length; i++) {
    const id = matches[i].id;
    if (id) matchIds.add(id);
  }

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
  let winner: MvpScoreResult | null = null;

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (!r.isEligible) continue;
    if (!winner) {
      winner = r;
      continue;
    }

    const scoreDiff = r.score - winner.score;
    if (scoreDiff > MVP_SCORE_EPSILON) {
      winner = r;
    } else if (scoreDiff > -MVP_SCORE_EPSILON) {
      const eloGainDiff = r.periodEloGain - winner.periodEloGain;
      if (eloGainDiff > MVP_SCORE_EPSILON) {
        winner = r;
      } else if (eloGainDiff > -MVP_SCORE_EPSILON) {
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
}
