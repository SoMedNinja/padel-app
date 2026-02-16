// All match- och statistiklogik samlad här
import { Match, PlayerStats } from "../types";
import { GUEST_ID } from "./guest";

const normalizeTeam = (team: any): string[] => {
  if (Array.isArray(team)) {
    // Optimization: if it is already an array of 2 strings (most common for padel),
    // we can return it directly to avoid the loop if we trust the data source.
    // For general safety, we still check, but we can do it faster.
    const len = team.length;
    if (len === 2 && typeof team[0] === 'string' && typeof team[1] === 'string' && team[0] && team[1]) {
      return team;
    }
    for (let i = 0; i < len; i++) {
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
  if (!matches.length) return [];

  // Optimization: Check if matches are already sorted to avoid expensive O(N log N) sort.
  // Most callers provide matches in either ascending or descending order.
  let isAscending = true;
  let isDescending = true;
  for (let i = 1; i < matches.length; i++) {
    if (matches[i].created_at > matches[i - 1].created_at) isDescending = false;
    if (matches[i].created_at < matches[i - 1].created_at) isAscending = false;
    if (!isAscending && !isDescending) break;
  }

  const results: ("W" | "L")[] = [];

  if (isDescending) {
    // Optimization: find first 'limit' matches in O(N) and reverse them for chronological order.
    for (let i = 0, len = matches.length; i < len && results.length < limit; i++) {
      const m = matches[i];
      const t1 = normalizeTeam(m.team1);
      const inT1 = t1.includes(playerName);
      const t2 = !inT1 ? normalizeTeam(m.team2) : null;
      const inT2 = t2?.includes(playerName) || false;

      if (inT1 || inT2) {
        const won = (inT1 && m.team1_sets > m.team2_sets) || (inT2 && m.team2_sets > m.team1_sets);
        results.push(won ? "W" : "L");
      }
    }
    return results.reverse();
  }

  if (isAscending) {
    // Optimization: find last 'limit' matches in O(N) using a reverse loop.
    for (let i = matches.length - 1; i >= 0 && results.length < limit; i--) {
      const m = matches[i];
      const t1 = normalizeTeam(m.team1);
      const inT1 = t1.includes(playerName);
      const t2 = !inT1 ? normalizeTeam(m.team2) : null;
      const inT2 = t2?.includes(playerName) || false;

      if (inT1 || inT2) {
        const won = (inT1 && m.team1_sets > m.team2_sets) || (inT2 && m.team2_sets > m.team1_sets);
        results.push(won ? "W" : "L");
      }
    }
    return results.reverse();
  }

  // Fallback for unsorted matches: filter and calculate results in a single pass
  const relevantResults: { date: string; res: "W" | "L" }[] = [];
  for (let i = 0, len = matches.length; i < len; i++) {
    const m = matches[i];
    const t1 = normalizeTeam(m.team1);
    const inT1 = t1.includes(playerName);
    const t2 = !inT1 ? normalizeTeam(m.team2) : null;
    const inT2 = t2?.includes(playerName) || false;

    if (inT1 || inT2) {
      const won = (inT1 && m.team1_sets > m.team2_sets) || (inT2 && m.team2_sets > m.team1_sets);
      relevantResults.push({ date: m.created_at || "", res: won ? "W" : "L" });
    }
  }

  relevantResults.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  return relevantResults
    .slice(-limit)
    .map(r => r.res);
}


export const calculateWinPct = (wins: number, losses: number) =>
  wins + losses === 0 ? 0 : Math.round((wins / (wins + losses)) * 100);

export const getStreak = (recentResults: ("W" | "L")[], useSwedish = false) => {
  const len = recentResults.length;
  if (len === 0) return "—";

  // Optimization: use a reverse loop to avoid creating a new reversed array
  const lastResult = recentResults[len - 1];
  let count = 0;
  for (let i = len - 1; i >= 0; i--) {
    if (recentResults[i] !== lastResult) break;
    count++;
  }

  const res = useSwedish ? (lastResult === "W" ? "V" : "F") : lastResult;
  return `${res}${count}`;
};

export const getTrendIndicator = (recentResults: ("W" | "L")[]) => {
  const len = recentResults.length;
  if (len < 3) return "—";

  // Optimization: avoid slice() and filter() by using a simple loop over the last 5
  const count = Math.min(len, 5);
  let wins = 0;
  const start = len - 1;
  const end = len - count;
  for (let i = start; i >= end; i--) {
    if (recentResults[i] === "W") wins++;
  }

  const winRate = wins / count;
  if (winRate >= 0.8) return "⬆️";
  if (winRate <= 0.2) return "⬇️";
  return "➖";
};


  export function getPartnerSynergy(
    matches: Match[],
    playerName: string,
    playerId?: string,
    eloDeltaByMatch?: Record<string, Record<string, number>>
  ) {
    if (!matches || !matches.length) return null;
    const synergy: Record<string, { games: number; wins: number; eloGain: number }> = {};
    const thirtyDaysAgoISO = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const isDescending = matches[0].created_at > matches[matches.length - 1].created_at;

    if (eloDeltaByMatch && playerId) {
      // High-performance path: use pre-calculated deltas and player IDs
      for (let i = 0, len = matches.length; i < len; i++) {
        const m = matches[i];
        const date = m.created_at;
        if (date && date < thirtyDaysAgoISO) {
          if (isDescending) break;
          continue;
        }
        if (eloDeltaByMatch[m.id]?.[playerId] === undefined) continue;

        // Optimization: use direct indexed access instead of includes() + find()
        // for small team arrays (max 2 players).
        const t1 = m.team1_ids;
        const isT1 = t1[0] === playerId || t1[1] === playerId;
        const team = isT1 ? t1 : m.team2_ids;
        const partnerId = team[0] === playerId ? team[1] : team[0];

        if (!partnerId || partnerId === GUEST_ID) continue;

        const team1Won = m.team1_sets > m.team2_sets;
        const won = (isT1 && team1Won) || (!isT1 && !team1Won);

        let s = synergy[partnerId];
        if (!s) {
          s = { games: 0, wins: 0, eloGain: 0 };
          synergy[partnerId] = s;
        }
        s.games++;
        if (won) s.wins++;
      }
    } else {
      // Fallback: use player name (legacy/less efficient)
      for (let i = 0, len = matches.length; i < len; i++) {
        const m = matches[i];
        const date = m.created_at;
        if (date && date < thirtyDaysAgoISO) {
          if (isDescending) break;
          continue;
        }

        const team1 = normalizeTeam(m.team1);
        const inT1 = team1[0] === playerName || team1[1] === playerName;
        const team2 = !inT1 ? normalizeTeam(m.team2) : null;
        const inT2 = team2 ? (team2[0] === playerName || team2[1] === playerName) : false;

        if (!inT1 && !inT2) continue;

        const team = inT1 ? team1 : (team2 as string[]);
        const partner = team[0] === playerName ? team[1] : team[0];

        if (!partner || partner === "Gäst") continue;

        const won = (inT1 && m.team1_sets > m.team2_sets) || (inT2 && m.team2_sets > m.team1_sets);

        let s = synergy[partner];
        if (!s) {
          s = { games: 0, wins: 0, eloGain: 0 };
          synergy[partner] = s;
        }
        s.games++;
        if (won) s.wins++;
      }
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

  export function getToughestOpponent(
    matches: Match[],
    playerName: string,
    playerId?: string,
    eloDeltaByMatch?: Record<string, Record<string, number>>
  ) {
    if (!matches || !matches.length) return null;
    const rivals: Record<string, { games: number; losses: number }> = {};
    const thirtyDaysAgoISO = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const isDescending = matches[0].created_at > matches[matches.length - 1].created_at;

    if (eloDeltaByMatch && playerId) {
      // High-performance path: use pre-calculated deltas and player IDs
      for (let i = 0, len = matches.length; i < len; i++) {
        const m = matches[i];
        const date = m.created_at;
        if (date && date < thirtyDaysAgoISO) {
          if (isDescending) break;
          continue;
        }
        if (eloDeltaByMatch[m.id]?.[playerId] === undefined) continue;

        // Optimization: use direct indexed access instead of includes()
        const t1 = m.team1_ids;
        const isT1 = t1[0] === playerId || t1[1] === playerId;
        const opponents = isT1 ? m.team2_ids : t1;
        const team1Won = m.team1_sets > m.team2_sets;
        const won = (isT1 && team1Won) || (!isT1 && !team1Won);

        for (let j = 0; j < opponents.length; j++) {
          const oppId = opponents[j];
          if (!oppId || oppId === GUEST_ID) continue;
          let r = rivals[oppId];
          if (!r) {
            r = { games: 0, losses: 0 };
            rivals[oppId] = r;
          }
          r.games++;
          if (!won) r.losses++;
        }
      }
    } else {
      // Fallback: use player name (legacy/less efficient)
      for (let i = 0, len = matches.length; i < len; i++) {
        const m = matches[i];
        const date = m.created_at;
        if (date && date < thirtyDaysAgoISO) {
          if (isDescending) break;
          continue;
        }

        const team1 = normalizeTeam(m.team1);
        const inT1 = team1[0] === playerName || team1[1] === playerName;
        const team2 = !inT1 ? normalizeTeam(m.team2) : null;
        const inT2 = team2 ? (team2[0] === playerName || team2[1] === playerName) : false;

        if (!inT1 && !inT2) continue;

        const opponents = inT1 ? normalizeTeam(m.team2) : team1;
        const won = (inT1 && m.team1_sets > m.team2_sets) || (inT2 && m.team2_sets > m.team1_sets);

        for (let j = 0; j < opponents.length; j++) {
          const opp = opponents[j];
          if (opp === "Gäst") continue;
          let r = rivals[opp];
          if (!r) {
            r = { games: 0, losses: 0 };
            rivals[opp] = r;
          }
          r.games++;
          if (!won) r.losses++;
        }
      }
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
