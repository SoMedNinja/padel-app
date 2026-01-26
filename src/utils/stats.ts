// All match- och statistiklogik samlad här
import { Match, PlayerStats } from "../types";

const normalizeTeam = (team: any): string[] => {
  if (Array.isArray(team)) return team.filter(Boolean);
  if (typeof team === "string") {
    const trimmed = team.trim();
    if (!trimmed) return [];
    if (trimmed.includes(",")) {
      return trimmed
        .split(",")
        .map(name => name.trim())
        .filter(Boolean);
    }
    return [trimmed];
  }
  return [];
};

export function getWinnersAndLosers(match: Match) {
  const team1 = normalizeTeam(match.team1);
  const team2 = normalizeTeam(match.team2);
  const team1Won = match.team1_sets > match.team2_sets;
  return {
    winners: team1Won ? team1 : team2,
    losers: team1Won ? team2 : team1,
  };
}

export function getLatestMatchDate(matches: Match[]) {
  return matches
    .map(m => m.created_at?.slice(0, 10))
    .filter(Boolean)
    .sort()
    .pop();
}

export function getRecentResults(matches: Match[], playerName: string, limit = 5): ("W" | "L")[] {
  return matches
    .filter(
      m =>
        normalizeTeam(m.team1).includes(playerName) ||
        normalizeTeam(m.team2).includes(playerName)
    )
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .slice(-limit)
    .map(m => {
      const team1 = normalizeTeam(m.team1);
      const team2 = normalizeTeam(m.team2);
      const won =
        (team1.includes(playerName) && m.team1_sets > m.team2_sets) ||
        (team2.includes(playerName) && m.team2_sets > m.team1_sets);
      return won ? "W" : "L";
    });
}

export interface MvpStat {
  wins: number;
  games: number;
}

export function getMvpStats(matches: Match[], allowedNames: string[] | Set<string> | null = null): Record<string, MvpStat> {
  const stats: Record<string, MvpStat> = {};
  const allowList =
    allowedNames instanceof Set ? allowedNames : allowedNames ? new Set(allowedNames) : null;

  matches.forEach(m => {
    const { winners, losers } = getWinnersAndLosers(m);

    winners.forEach(p => {
      if (!p || p === "Gäst") return;
      if (allowList && !allowList.has(p)) return;
      if (!stats[p]) stats[p] = { wins: 0, games: 0 };
      stats[p].wins++;
      stats[p].games++;
    });

    losers.forEach(p => {
      if (!p || p === "Gäst") return;
      if (allowList && !allowList.has(p)) return;
      if (!stats[p]) stats[p] = { wins: 0, games: 0 };
      stats[p].games++;
    });
  });

  return stats;
}

export const calculateWinPct = (wins: number, losses: number) =>
  wins + losses === 0 ? 0 : Math.round((wins / (wins + losses)) * 100);

export const getStreak = (recentResults: ("W" | "L")[]) => {
  if (!recentResults.length) return "—";
  const reversed = [...recentResults].reverse();
  const first = reversed[0];
  let count = 0;
  for (const result of reversed) {
    if (result !== first) break;
    count += 1;
  }
  return `${first}${count}`;
};

export const getTrendIndicator = (recentResults: ("W" | "L")[]) => {
  const last5 = recentResults.slice(-5);
  if (last5.length < 3) return "—";
  const wins = last5.filter(r => r === "W").length;
  const total = last5.length || 1;
  const winRate = wins / total;

  if (winRate >= 0.8) return "⬆️";
  if (winRate <= 0.2) return "⬇️";
  return "➖";
};

