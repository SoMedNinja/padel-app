import { GUEST_ID } from "./guest";
import {
  getIdDisplayName,
  getProfileDisplayName,
  makeNameToIdMap,
  makeProfileMap,
  resolveTeamIds,
} from "./profileMap";

const K = 20;
const ELO_BASELINE = 1000;

export function calculateElo(matches, profiles = []) {
  const players = {};
  const profileMap = makeProfileMap(profiles);
  const nameToIdMap = makeNameToIdMap(profiles);

  const ensurePlayer = (id, name = "Okänd") => {
    if (id === GUEST_ID) return;
    if (!players[id]) {
      players[id] = {
        id,
        name,
        elo: ELO_BASELINE,
        startElo: ELO_BASELINE,
        wins: 0,
        losses: 0,
        history: [],
        partners: {},
      };
    } else if (name && players[id].name === "Okänd") {
      players[id].name = name;
    }
  };

  profiles.forEach(p => {
    ensurePlayer(p.id, getProfileDisplayName(p));
  });

  const normalizeTeam = (team) => (Array.isArray(team) ? team.filter(Boolean) : []);
  const hasPlayer = (id) => Boolean(players[id]);
  const activeTeam = (team) => team.filter(id => id !== GUEST_ID && hasPlayer(id));
  const avg = (team) =>
    team.reduce((s, id) => s + (players[id]?.elo ?? ELO_BASELINE), 0) / team.length;
  const recordPartners = (team, didWin) => {
    team.forEach((playerId) => {
      team.forEach((partnerId) => {
        if (playerId === partnerId) return;
        const partnerStats = players[playerId].partners[partnerId] || { games: 0, wins: 0 };
        partnerStats.games += 1;
        if (didWin) partnerStats.wins += 1;
        players[playerId].partners[partnerId] = partnerStats;
      });
    });
  };

  const resolveName = (id) => getIdDisplayName(id, profileMap);

  matches.forEach(m => {
    const t1 = normalizeTeam(resolveTeamIds(m.team1_ids, m.team1, nameToIdMap));
    const t2 = normalizeTeam(resolveTeamIds(m.team2_ids, m.team2, nameToIdMap));
    [...t1, ...t2].forEach(id => ensurePlayer(id, resolveName(id)));
    const t1Active = activeTeam(t1);
    const t2Active = activeTeam(t2);

    if (!t1Active.length || !t2Active.length) return;

    const e1 = avg(t1Active);
    const e2 = avg(t2Active);

    const exp1 = 1 / (1 + Math.pow(10, (e2 - e1) / 400));
    const team1Won = m.team1_sets > m.team2_sets;
    const timestamp = new Date(m.created_at).getTime();
    const historyStamp = Number.isNaN(timestamp) ? 0 : timestamp;

    t1Active.forEach(id => {
      players[id].elo += Math.round(K * ((team1Won ? 1 : 0) - exp1));
      team1Won ? players[id].wins++ : players[id].losses++;
      players[id].history.push({ result: team1Won ? "W" : "L", timestamp: historyStamp });
    });

    t2Active.forEach(id => {
      players[id].elo += Math.round(K * ((team1Won ? 0 : 1) - (1 - exp1)));
      team1Won ? players[id].losses++ : players[id].wins++;
      players[id].history.push({ result: team1Won ? "L" : "W", timestamp: historyStamp });
    });

    recordPartners(t1Active, team1Won);
    recordPartners(t2Active, !team1Won);
  });

  return Object.values(players).map(player => {
    const recentResults = [...player.history]
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(entry => entry.result);
    const bestPartnerEntry = Object.entries(player.partners)
      .map(([partnerId, stats]) => ({
        partnerId,
        games: stats.games,
        wins: stats.wins,
        winRate: stats.games ? stats.wins / stats.games : 0,
      }))
      .filter(entry => entry.games >= 2)
      .sort((a, b) => {
        if (b.winRate !== a.winRate) return b.winRate - a.winRate;
        if (b.games !== a.games) return b.games - a.games;
        return b.wins - a.wins;
      })[0];

    const bestPartner = bestPartnerEntry
      ? {
        ...bestPartnerEntry,
        name: resolveName(bestPartnerEntry.partnerId),
      }
      : null;

    return { ...player, recentResults, bestPartner };
  });
}
