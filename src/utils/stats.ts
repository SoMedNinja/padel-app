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


  export function getPartnerSynergy(matches: Match[], playerName: string) {
    const synergy: Record<string, { games: number; wins: number; eloGain: number }> = {};
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    matches.forEach(m => {
      const matchDate = new Date(m.created_at).getTime();
      if (matchDate < thirtyDaysAgo) return;

      const team1 = normalizeTeam(m.team1);
      const team2 = normalizeTeam(m.team2);
      const isTeam1 = team1.includes(playerName);
      const isTeam2 = team2.includes(playerName);

      if (!isTeam1 && !isTeam2) return;

      const partner = isTeam1
        ? team1.find(p => p !== playerName)
        : team2.find(p => p !== playerName);

      if (!partner || partner === "Gäst") return;

      const won = (isTeam1 && m.team1_sets > m.team2_sets) || (isTeam2 && m.team2_sets > m.team1_sets);

      if (!synergy[partner]) synergy[partner] = { games: 0, wins: 0, eloGain: 0 };
      synergy[partner].games++;
      if (won) synergy[partner].wins++;
      // Note: eloGain per partner is tricky without player stats, but we can track wins/games.
    });

    const sorted = Object.entries(synergy).sort((a, b) => {
      const winRateA = a[1].wins / a[1].games;
      const winRateB = b[1].wins / b[1].games;
      if (winRateB !== winRateA) return winRateB - winRateA;
      return b[1].games - a[1].games;
    });

    return sorted[0] ? { name: sorted[0][0], ...sorted[0][1] } : null;
  }

  export function getToughestOpponent(matches: Match[], playerName: string) {
    const rivals: Record<string, { games: number; losses: number }> = {};
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    matches.forEach(m => {
      const matchDate = new Date(m.created_at).getTime();
      if (matchDate < thirtyDaysAgo) return;

      const team1 = normalizeTeam(m.team1);
      const team2 = normalizeTeam(m.team2);
      const isTeam1 = team1.includes(playerName);
      const isTeam2 = team2.includes(playerName);

      if (!isTeam1 && !isTeam2) return;

      const opponents = isTeam1 ? team2 : team1;
      const won = (isTeam1 && m.team1_sets > m.team2_sets) || (isTeam2 && m.team2_sets > m.team1_sets);

      opponents.forEach(opp => {
        if (opp === "Gäst") return;
        if (!rivals[opp]) rivals[opp] = { games: 0, losses: 0 };
        rivals[opp].games++;
        if (!won) rivals[opp].losses++;
      });
    });

    const sorted = Object.entries(rivals).sort((a, b) => {
      const lossRateA = a[1].losses / a[1].games;
      const lossRateB = b[1].losses / b[1].games;
      if (lossRateB !== lossRateA) return lossRateB - lossRateA;
      return b[1].games - a[1].games;
    });

    return sorted[0] ? { name: sorted[0][0], ...sorted[0][1] } : null;
  }
