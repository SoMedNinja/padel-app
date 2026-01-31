// All match- och statistiklogik samlad här
import { Match, PlayerStats } from "../types";

const normalizeTeam = (team: any): string[] => {
  if (Array.isArray(team)) {
    // Optimization: avoid filter(Boolean) if array is already clean
    for (let i = 0; i < team.length; i++) {
      if (!team[i]) return team.filter(Boolean);
    }
    return team;
  }
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
  if (!matches.length) return undefined;
  // Optimization: use a single pass to find the latest date
  let latest = "";
  for (let i = 0; i < matches.length; i++) {
    const date = matches[i].created_at?.slice(0, 10);
    if (date && date > latest) latest = date;
  }
  return latest || undefined;
}

export function getRecentResults(matches: Match[], playerName: string, limit = 5): ("W" | "L")[] {
  // Optimization: filter and calculate results in a single pass to avoid multiple array allocations
  // and redundant normalization in the later map().
  const relevantResults: { date: string, res: "W" | "L" }[] = [];

  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const t1 = normalizeTeam(m.team1);
    const t2 = normalizeTeam(m.team2);

    const inT1 = t1.includes(playerName);
    const inT2 = t2.includes(playerName);

    if (inT1 || inT2) {
      const won = (inT1 && m.team1_sets > m.team2_sets) || (inT2 && m.team2_sets > m.team1_sets);
      relevantResults.push({ date: m.created_at || "", res: won ? "W" : "L" });
    }
  }

  return relevantResults
    // ISO strings can be compared lexicographically
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .slice(-limit)
    .map(r => r.res);
}


export const calculateWinPct = (wins: number, losses: number) =>
  wins + losses === 0 ? 0 : Math.round((wins / (wins + losses)) * 100);

export const getStreak = (recentResults: ("W" | "L")[]) => {
  const len = recentResults.length;
  if (len === 0) return "—";

  // Optimization: use a reverse loop to avoid creating a new reversed array
  const lastResult = recentResults[len - 1];
  let count = 0;
  for (let i = len - 1; i >= 0; i--) {
    if (recentResults[i] !== lastResult) break;
    count++;
  }

  // Swedish mapping for display if needed elsewhere,
  // but keeping internal "W"/"L" for consistency with history.
  return `${lastResult}${count}`;
};

export const getTrendIndicator = (recentResults: ("W" | "L")[]) => {
  const len = recentResults.length;
  if (len < 3) return "—";

  // Optimization: avoid slice() and filter() by using a simple loop over the last 5
  const count = Math.min(len, 5);
  let wins = 0;
  for (let i = len - 1; i >= len - count; i--) {
    if (recentResults[i] === "W") wins++;
  }

  const winRate = wins / count;
  if (winRate >= 0.8) return "⬆️";
  if (winRate <= 0.2) return "⬇️";
  return "➖";
};


  export function getPartnerSynergy(matches: Match[], playerName: string) {
    const synergy: Record<string, { games: number; wins: number; eloGain: number }> = {};
    // Optimization: use ISO string comparison instead of new Date() in loop
    const thirtyDaysAgoISO = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Optimization: use for-loop with early break since matches are sorted descending
    for (let i = 0; i < matches.length; i++) {
      const m = matches[i];
      if (m.created_at < thirtyDaysAgoISO) break;

      const team1 = normalizeTeam(m.team1);
      const team2 = normalizeTeam(m.team2);
      const isTeam1 = team1.includes(playerName);
      const isTeam2 = team2.includes(playerName);

      if (!isTeam1 && !isTeam2) continue;

      const partner = isTeam1
        ? team1.find(p => p !== playerName)
        : team2.find(p => p !== playerName);

      if (!partner || partner === "Gäst") continue;

      const won = (isTeam1 && m.team1_sets > m.team2_sets) || (isTeam2 && m.team2_sets > m.team1_sets);

      if (!synergy[partner]) synergy[partner] = { games: 0, wins: 0, eloGain: 0 };
      synergy[partner].games++;
      if (won) synergy[partner].wins++;
      // Note: eloGain per partner is tricky without player stats, but we can track wins/games.
    }

    // Optimization: find best partner in a single pass instead of sort()
    let bestPartner = null;
    let bestWinRate = -1;
    let bestGames = -1;

    for (const name in synergy) {
      const stats = synergy[name];
      const winRate = stats.wins / stats.games;
      let isBetter = false;

      if (!bestPartner) {
        isBetter = true;
      } else if (winRate > bestWinRate) {
        isBetter = true;
      } else if (winRate === bestWinRate && stats.games > bestGames) {
        isBetter = true;
      }

      if (isBetter) {
        bestPartner = { name, ...stats };
        bestWinRate = winRate;
        bestGames = stats.games;
      }
    }

    return bestPartner;
  }

  export function getToughestOpponent(matches: Match[], playerName: string) {
    const rivals: Record<string, { games: number; losses: number }> = {};
    // Optimization: use ISO string comparison instead of new Date() in loop
    const thirtyDaysAgoISO = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Optimization: use for-loop with early break since matches are sorted descending
    for (let i = 0; i < matches.length; i++) {
      const m = matches[i];
      if (m.created_at < thirtyDaysAgoISO) break;

      const team1 = normalizeTeam(m.team1);
      const team2 = normalizeTeam(m.team2);
      const isTeam1 = team1.includes(playerName);
      const isTeam2 = team2.includes(playerName);

      if (!isTeam1 && !isTeam2) continue;

      const opponents = isTeam1 ? team2 : team1;
      const won = (isTeam1 && m.team1_sets > m.team2_sets) || (isTeam2 && m.team2_sets > m.team1_sets);

      opponents.forEach(opp => {
        if (opp === "Gäst") return;
        if (!rivals[opp]) rivals[opp] = { games: 0, losses: 0 };
        rivals[opp].games++;
        if (!won) rivals[opp].losses++;
      });
    }

    // Optimization: find toughest opponent in a single pass instead of sort()
    let toughestRival = null;
    let maxLossRate = -1;
    let maxGames = -1;

    for (const name in rivals) {
      const stats = rivals[name];
      const lossRate = stats.losses / stats.games;
      let isTougher = false;

      if (!toughestRival) {
        isTougher = true;
      } else if (lossRate > maxLossRate) {
        isTougher = true;
      } else if (lossRate === maxLossRate && stats.games > maxGames) {
        isTougher = true;
      }

      if (isTougher) {
        toughestRival = { name, ...stats };
        maxLossRate = lossRate;
        maxGames = stats.games;
      }
    }

    return toughestRival;
  }
