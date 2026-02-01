import { Match, Profile, EveningRecap, EveningRecapLeader } from "../types";
import { getTeamAverageElo } from "./rotation";
import { getIdDisplayName, resolveTeamIds } from "./profileMap";
import { formatFullDate } from "./format";
import { GUEST_ID } from "./guest";
import { calculateEloWithStats } from "./elo";
import { EVENING_MIN_GAMES, getMvpWinner, scorePlayersForMvp } from "./mvp";
import { PlayerStats } from "../types";

/**
 * Utility to calculate evening statistics for a recap.
 * This logic is used by both MatchForm (for current evening) and Reports (for past evenings).
 */
export const calculateEveningStats = (
  matches: Match[],
  targetDate: Date,
  eloMap: Record<string, number>,
  profileMap: Map<string, Profile>,
  nameToIdMap: Map<string, string>,
  eloPlayers?: PlayerStats[],
  eloDeltaByMatch?: Record<string, Record<string, number>>
): EveningRecap | null => {
  // Optimization: Use ISO string comparison for faster filtering and avoid redundant mapping
  // of matches that aren't part of the target evening.
  const targetISO = targetDate.toISOString().slice(0, 10);

  // Optimization: Use a single pass to filter and map matches to avoid intermediate array allocations.
  const eveningMatches: Match[] = [];
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    if (match.created_at?.slice(0, 10) === targetISO) {
      eveningMatches.push({
        ...match,
        team1_ids: resolveTeamIds(match.team1_ids, match.team1, nameToIdMap),
        team2_ids: resolveTeamIds(match.team2_ids, match.team2, nameToIdMap),
      });
    }
  }

  if (!eveningMatches.length) {
    return null;
  }

  const stats: Record<string, EveningRecapLeader & { partners: Set<string>; opponentElos: number[] }> = {};
  let totalSets = 0;

  eveningMatches.forEach(match => {
    const team1Ids = (match.team1_ids || []) as string[];
    const team2Ids = (match.team2_ids || []) as string[];
    const team1Sets = Number(match.team1_sets || 0);
    const team2Sets = Number(match.team2_sets || 0);
    const team1Won = team1Sets > team2Sets;
    totalSets += team1Sets + team2Sets;

    const team1Elo = getTeamAverageElo(team1Ids, eloMap);
    const team2Elo = getTeamAverageElo(team2Ids, eloMap);

    const recordTeam = (teamIds: string[], opponentIds: string[], opponentElo: number, didWin: boolean, setsFor: number, setsAgainst: number) => {
      teamIds.forEach(id => {
        if (!id || id === GUEST_ID) return;
        if (!stats[id]) {
          stats[id] = {
            id,
            name: getIdDisplayName(id, profileMap),
            games: 0,
            wins: 0,
            losses: 0,
            setsFor: 0,
            setsAgainst: 0,
            rotations: 0,
            avgEloOpponents: 0,
            winRate: 0,
            partners: new Set(),
            opponentElos: [],
          };
        }
        stats[id].games += 1;
        stats[id].wins += didWin ? 1 : 0;
        stats[id].losses += didWin ? 0 : 1;
        stats[id].setsFor += setsFor;
        stats[id].setsAgainst += setsAgainst;
        stats[id].opponentElos.push(opponentElo);

        teamIds.forEach(partnerId => {
          if (partnerId && partnerId !== id) {
            stats[id].partners.add(partnerId);
          }
        });
      });
    };

    recordTeam(team1Ids, team2Ids, team2Elo, team1Won, team1Sets, team2Sets);
    recordTeam(team2Ids, team1Ids, team1Elo, !team1Won, team2Sets, team1Sets);
  });

  const players = Object.values(stats).map(p => ({
    ...p,
    rotations: p.partners.size,
    avgEloOpponents: p.opponentElos.length ? p.opponentElos.reduce((a, b) => a + b, 0) / p.opponentElos.length : 0,
    winRate: p.games ? p.wins / p.games : 0,
  }));

  // Optimization: Skip expensive full-history ELO calculation if data is already provided by the caller.
  // This reduces complexity from O(M) to O(1) for the ELO part when generating recaps.
  // We check if eloDeltaByMatch has keys to ensure we don't skip calculation when provided with empty objects.
  const eloData = (eloPlayers && eloDeltaByMatch && Object.keys(eloDeltaByMatch).length > 0)
    ? { players: eloPlayers, eloDeltaByMatch }
    : calculateEloWithStats(matches, Array.from(profileMap.values()));

  const mvpResults = scorePlayersForMvp(eveningMatches, eloData.players, EVENING_MIN_GAMES, eloData.eloDeltaByMatch);
  const mvpWinner = getMvpWinner(mvpResults);
  const mvp = mvpWinner ? players.find(p => p.id === mvpWinner.id) || null : null;

  const leaders = (players as EveningRecapLeader[])
    .slice()
    .sort((a, b) => b.wins - a.wins)
    .slice(0, 3);

  const mostRotations = [...players].sort((a, b) => b.rotations - a.rotations).slice(0, 3);
  const strongest = players.filter(p => p.games >= 2).sort((a, b) => b.winRate - a.winRate).slice(0, 3);
  const marathon = [...players].sort((a, b) => (b.setsFor + b.setsAgainst) - (a.setsFor + a.setsAgainst))[0] || null;

  return {
    dateLabel: formatFullDate(targetDate),
    matches: eveningMatches.length,
    totalSets,
    mvp: mvp || null,
    leaders,
    funFacts: {
      mostRotations,
      strongest,
      marathon: marathon ? { name: marathon.name, sets: marathon.setsFor + marathon.setsAgainst } : null
    }
  };
};
