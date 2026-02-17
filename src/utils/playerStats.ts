import { Match, PlayerStats, Profile, TournamentResult } from "../types";
import { getProfileDisplayName, resolveTeamIds } from "./profileMap";
import {
  scorePlayersForMvp,
  getMvpWinner,
  EVENING_MIN_GAMES,
  MVP_WINDOW_DAYS,
  MILLISECONDS_PER_DAY,
  MVP_WIN_RATE_WEIGHT,
  MVP_GAMES_WEIGHT,
  MVP_SCORE_EPSILON
} from "./mvp";
import { ELO_BASELINE } from "./elo";
import { normalizeTeam } from "./stats";
import { GUEST_ID } from "./guest";

export const getEloDeltaClass = (delta: number | string) => {
  const numericDelta = Number(delta);
  if (!Number.isFinite(numericDelta) || numericDelta === 0) return "";
  return numericDelta > 0 ? "stat-delta-positive" : "stat-delta-negative";
};

export const getHighestEloRating = (playerStats: PlayerStats | undefined) => {
  if (!playerStats) return ELO_BASELINE;
  const historyMax = playerStats.history.reduce(
    (max, entry) => Math.max(max, entry.elo),
    playerStats.startElo
  );
  return Math.max(historyMax, playerStats.elo);
};

export const buildMvpSummary = (
  matches: Match[],
  profiles: Profile[],
  allEloPlayers: PlayerStats[],
  eloDeltaByMatch?: Record<string, Record<string, number>>
) => {
  const dateMap = new Map<string, Match[]>();
  const matchEntries = matches
    .map(match => {
      // Optimization: skip expensive name resolution here. scorePlayersForMvp
      // already uses team1_ids and eloDeltaByMatch for its high-performance path.
      return {
        match,
        time: new Date(match.created_at).getTime(),
        dateKey: match.created_at?.slice(0, 10),
      };
    })
    .filter((entry): entry is { match: Match, time: number, dateKey: string } =>
      Number.isFinite(entry.time) && entry.dateKey !== undefined
    );

  matchEntries.forEach(({ match, dateKey }) => {
    if (!dateMap.has(dateKey)) dateMap.set(dateKey, []);
    dateMap.get(dateKey)!.push(match);
  });

  const monthlyMvpDays: Record<string, number> = {};
  if (matchEntries.length) {
    const sortedEntries = [...matchEntries].sort((a, b) => a.time - b.time);
    const playerMap = new Map(allEloPlayers.map(p => [p.id, p]));

    // Optimization: Pre-map match deltas to avoid re-searching player history in every window step
    const matchDeltaMap = new Map<string, Map<string, { delta: number, result: string }>>();
    allEloPlayers.forEach(p => {
      p.history.forEach(h => {
        if (!matchDeltaMap.has(h.matchId)) matchDeltaMap.set(h.matchId, new Map());
        matchDeltaMap.get(h.matchId)!.set(p.id, { delta: h.delta, result: h.result });
      });
    });

    const startDate = new Date(sortedEntries[0].dateKey);
    const latestMatchDate = new Date(sortedEntries[sortedEntries.length - 1].dateKey);
    const today = new Date();
    const endDate = latestMatchDate > today ? latestMatchDate : today;

    // Optimization: use a rolling window approach O(M + D*P) instead of O(D*P*M)
    const rollingStats = new Map<string, { wins: number; games: number; eloGain: number }>();
    allEloPlayers.forEach(p => rollingStats.set(p.id, { wins: 0, games: 0, eloGain: 0 }));

    let windowStartIndex = 0;
    let windowEndIndex = 0;

    for (
      const cursor = new Date(startDate);
      cursor <= endDate;
      cursor.setDate(cursor.getDate() + 1)
    ) {
      const dateKey = cursor.toISOString().slice(0, 10);
      const dayEndTime = new Date(`${dateKey}T23:59:59.999Z`).getTime();
      const cutoff = dayEndTime - MVP_WINDOW_DAYS * MILLISECONDS_PER_DAY;

      // Add matches entering the window
      while (windowEndIndex < sortedEntries.length && sortedEntries[windowEndIndex].time <= dayEndTime) {
        const m = sortedEntries[windowEndIndex].match;
        matchDeltaMap.get(m.id)?.forEach(({ delta, result }, pid) => {
          const s = rollingStats.get(pid);
          if (s) {
            s.games++;
            s.eloGain += delta;
            if (result === "W") s.wins++;
          }
        });
        windowEndIndex += 1;
      }

      // Remove matches leaving the window
      while (windowStartIndex < windowEndIndex && sortedEntries[windowStartIndex].time <= cutoff) {
        const m = sortedEntries[windowStartIndex].match;
        matchDeltaMap.get(m.id)?.forEach(({ delta, result }, pid) => {
          const s = rollingStats.get(pid);
          if (s) {
            s.games--;
            s.eloGain -= delta;
            if (result === "W") s.wins--;
          }
        });
        windowStartIndex += 1;
      }

      // Find winner for this rolling window day
      let bestScore = -Infinity;
      let winnerName = "";
      let bestEloGain = -Infinity;
      let bestEloNet = -Infinity;
      let bestWins = -Infinity;

      rollingStats.forEach((s, pid) => {
        if (s.games === 0) return;

        const winRate = s.wins / s.games;
        const score = s.eloGain + winRate * MVP_WIN_RATE_WEIGHT + s.games * MVP_GAMES_WEIGHT;
        const player = playerMap.get(pid);
        if (!player) return;

        let isBetter = false;
        if (score > bestScore + MVP_SCORE_EPSILON) isBetter = true;
        else if (Math.abs(score - bestScore) <= MVP_SCORE_EPSILON) {
          if (s.eloGain > bestEloGain + MVP_SCORE_EPSILON) isBetter = true;
          else if (Math.abs(s.eloGain - bestEloGain) <= MVP_SCORE_EPSILON) {
            if (player.elo > bestEloNet) isBetter = true;
            else if (player.elo === bestEloNet) {
              if (s.wins > bestWins) isBetter = true;
              else if (s.wins === bestWins) {
                if (!winnerName || player.name.localeCompare(winnerName) < 0) isBetter = true;
              }
            }
          }
        }

        if (isBetter) {
          bestScore = score;
          winnerName = player.name;
          bestEloGain = s.eloGain;
          bestEloNet = player.elo;
          bestWins = s.wins;
        }
      });

      if (winnerName) {
        monthlyMvpDays[winnerName] = (monthlyMvpDays[winnerName] || 0) + 1;
      }
    }
  }

  const eveningMvpCounts: Record<string, number> = {};
  dateMap.forEach((dayMatches) => {
    // Optimization: passing eloDeltaByMatch here avoids O(P * H) scan for every day
    const results = scorePlayersForMvp(dayMatches, allEloPlayers, EVENING_MIN_GAMES, eloDeltaByMatch);
    const winner = getMvpWinner(results);
    if (!winner) return;
    eveningMvpCounts[winner.name] = (eveningMvpCounts[winner.name] || 0) + 1;
  });

  return { monthlyMvpDays, eveningMvpCounts };
};

export const buildComparisonChartData = (players: PlayerStats[], profiles: Profile[], playerIds: string[]) => {
  if (!playerIds.length) return [];

  const profileNameMap = profiles.reduce((acc, profile) => {
    acc[profile.id] = getProfileDisplayName(profile);
    return acc;
  }, {} as Record<string, string>);

  const timelineEntries = new Map<string, { date: string, timestamp: number, matchId: string }>();
  playerIds.forEach(id => {
    const player = players.find(p => p.id === id);
    if (!player) return;
    player.history.forEach((entry) => {
      if (!entry.date) return;
      const key = `${entry.date}::${entry.matchId}`;
      if (!timelineEntries.has(key)) {
        timelineEntries.set(key, { date: entry.date, timestamp: entry.timestamp, matchId: entry.matchId });
      }
    });
  });

  const dates = Array.from(timelineEntries.values()).sort((a, b) => {
    if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
    return a.matchId.localeCompare(b.matchId);
  });
  if (!dates.length) return [];

  const historyPointers = playerIds.map(id => {
    const player = players.find(p => p.id === id);
    return {
      id,
      name: profileNameMap[id] || "Okänd",
      history: (player?.history || []).filter(h => h.date),
      index: 0,
      lastElo: player?.startElo ?? ELO_BASELINE,
      wins: 0,
      games: 0
    };
  });

  const isEntryBeforeOrEqual = (entry: any, dateEntry: any) => {
    if (entry.timestamp < dateEntry.timestamp) return true;
    if (entry.timestamp > dateEntry.timestamp) return false;
    return entry.matchId.localeCompare(dateEntry.matchId) <= 0;
  };

  return dates.map(dateEntry => {
    const row: any = { date: dateEntry.date };
    historyPointers.forEach(pointer => {
      while (
        pointer.index < pointer.history.length &&
        isEntryBeforeOrEqual(pointer.history[pointer.index], dateEntry)
      ) {
        const entry = pointer.history[pointer.index];
        pointer.lastElo = entry.elo;
        pointer.games += 1;
        if (entry.result === "W") pointer.wins += 1;
        pointer.index += 1;
      }
      row[`${pointer.name}_elo`] = pointer.lastElo;
      row[`${pointer.name}_winRate`] = pointer.games > 0 ? (pointer.wins / pointer.games) * 100 : 0;
    });
    return row;
  });
};

export const buildServeSplitStats = (
  matches: Match[],
  playerId: string | undefined,
  nameToIdMap: Map<string, string>
) => {
  if (!playerId) {
    return {
      serveFirstWins: 0,
      serveFirstLosses: 0,
      serveSecondWins: 0,
      serveSecondLosses: 0,
    };
  }

  let serveFirstWins = 0;
  let serveFirstLosses = 0;
  let serveSecondWins = 0;
  let serveSecondLosses = 0;

  matches.forEach(match => {
    if (match.team1_sets == null || match.team2_sets == null) return;

    const team1 = normalizeTeam(resolveTeamIds(match.team1_ids, match.team1, nameToIdMap));
    const team2 = normalizeTeam(resolveTeamIds(match.team2_ids, match.team2, nameToIdMap));
    const isTeam1 = team1.includes(playerId);
    const isTeam2 = team2.includes(playerId);
    if (!isTeam1 && !isTeam2) return;

    // Note for non-coders: the app always starts matches with team A serving,
    // so we treat team 1 as the starter to keep these splits consistent.
    const team1ServesFirst = true;
    const playerServedFirst = (team1ServesFirst && isTeam1) || (!team1ServesFirst && isTeam2);

    const team1Won = match.team1_sets > match.team2_sets;
    const playerWon = (isTeam1 && team1Won) || (isTeam2 && !team1Won);

    if (playerServedFirst) {
      if (playerWon) {
        serveFirstWins += 1;
      } else {
        serveFirstLosses += 1;
      }
    } else {
      if (playerWon) {
        serveSecondWins += 1;
      } else {
        serveSecondLosses += 1;
      }
    }
  });

  return {
    serveFirstWins,
    serveFirstLosses,
    serveSecondWins,
    serveSecondLosses,
  };
};

export const buildHeadToHeadStats = (
  matches: Match[],
  playerId: string | undefined,
  opponentId: string,
  mode: string,
  nameToIdMap: Map<string, string>,
  playerDeltaMap: Map<string, number>
) => {
  const result = {
    wins: 0,
    losses: 0,
    matches: 0,
    totalSetsFor: 0,
    totalSetsAgainst: 0,
    totalEloExchange: 0,
    lastMatch: null as { date: string; setsFor: number; setsAgainst: number; won: boolean } | null,
    serveFirstWins: 0,
    serveFirstLosses: 0,
    serveSecondWins: 0,
    serveSecondLosses: 0,
    recentResults: [] as string[]
  };

  if (!playerId || !opponentId) return result;

  // Optimization: use a for-loop for better performance in the match processing loop.
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    // Optimization: skip matches where the player did not participate using the pre-indexed delta map.
    if (!playerDeltaMap.has(match.id)) continue;

    // Optimization: identify teams directly from IDs if possible to avoid redundant string normalization.
    const isT1 = (match.team1_ids && match.team1_ids.length > 0)
      ? (match.team1_ids[0] === playerId || match.team1_ids[1] === playerId)
      : normalizeTeam(resolveTeamIds(match.team1_ids, match.team1, nameToIdMap)).includes(playerId);

    const isT2 = !isT1 && ((match.team2_ids && match.team2_ids.length > 0)
      ? (match.team2_ids[0] === playerId || match.team2_ids[1] === playerId)
      : normalizeTeam(resolveTeamIds(match.team2_ids, match.team2, nameToIdMap)).includes(playerId));

    if (!isT1 && !isT2) continue;

    const oppT1 = (match.team1_ids && match.team1_ids.length > 0)
      ? (match.team1_ids[0] === opponentId || match.team1_ids[1] === opponentId)
      : normalizeTeam(resolveTeamIds(match.team1_ids, match.team1, nameToIdMap)).includes(opponentId);

    const oppT2 = (match.team2_ids && match.team2_ids.length > 0)
      ? (match.team2_ids[0] === opponentId || match.team2_ids[1] === opponentId)
      : normalizeTeam(resolveTeamIds(match.team2_ids, match.team2, nameToIdMap)).includes(opponentId);

    if (!oppT1 && !oppT2) continue;

    const together = (isT1 && oppT1) || (isT2 && oppT2);
    const against = (isT1 && oppT2) || (isT2 && oppT1);

    if ((mode === "together" && !together) || (mode === "against" && !against)) continue;

    if (match.team1_sets == null || match.team2_sets == null) continue;

    const s1 = Number(match.team1_sets || 0);
    const s2 = Number(match.team2_sets || 0);
    const team1Won = s1 > s2;
    const playerWon = (isT1 && team1Won) || (isT2 && !team1Won);

    result.matches++;
    if (playerWon) result.wins++; else result.losses++;

    let setsFor = isT1 ? s1 : s2;
    let setsAgainst = isT1 ? s2 : s1;

    // Track ELO exchange
    result.totalEloExchange += playerDeltaMap.get(match.id) || 0;

    // Track last match (assuming matches are already sorted descending as they come from Dashboard)
    if (!result.lastMatch) {
      result.lastMatch = {
        date: match.created_at,
        setsFor,
        setsAgainst,
        won: playerWon
      };
    }

    // Recent results (last 5)
    if (result.recentResults.length < 5) {
      result.recentResults.push(playerWon ? "V" : "F");
    }

    // Normalize point-based matches (from tournaments) to a 1-set win/loss
    if (match.score_type === "points") {
      if (setsFor > setsAgainst) { setsFor = 1; setsAgainst = 0; }
      else if (setsAgainst > setsFor) { setsFor = 0; setsAgainst = 1; }
      else { setsFor = 0; setsAgainst = 0; }
    }
    result.totalSetsFor += setsFor;
    result.totalSetsAgainst += setsAgainst;

    // Serve stats
    const playerServedFirst = isT1; // Team 1 always serves first
    if (playerServedFirst) {
      if (playerWon) result.serveFirstWins++; else result.serveFirstLosses++;
    } else {
      if (playerWon) result.serveSecondWins++; else result.serveSecondLosses++;
    }
  }

  return result;
};

export const buildHeadToHeadTournaments = (tournamentResults: TournamentResult[], playerId: string | undefined, opponentId: string) => {
  if (!playerId || !opponentId) return { wins: 0, matches: 0 };

  const playerResults = tournamentResults.filter(r => r.profile_id === playerId);
  const opponentResults = tournamentResults.filter(r => r.profile_id === opponentId);

  // Find tournaments where both played
  const playerTournamentIds = new Set(playerResults.map(r => r.tournament_id));
  const sharedTournaments = opponentResults.filter(r => playerTournamentIds.has(r.tournament_id));

  let wins = 0;
  let matches = 0;

  sharedTournaments.forEach(oppRes => {
    const playRes = playerResults.find(r => r.tournament_id === oppRes.tournament_id);
    if (!playRes) return;

    matches++;
    if (playRes.rank === 1) wins++;
  });

  return { wins, matches };
};
