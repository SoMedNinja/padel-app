import { Match, Profile, PlayerStats, PlayerDeltaParams } from "./types.ts";
import {
  GUEST_ID,
  ELO_BASELINE,
} from "./constants.ts";
import { escapeHtml } from "./utils.ts";
import {
  getExpectedScore,
  getMarginMultiplier,
  getSinglesAdjustedMatchWeight,
  buildPlayerDelta,
} from "./shared_elo/math.ts";

export {
  getExpectedScore,
  getMarginMultiplier,
  getSinglesAdjustedMatchWeight,
  buildPlayerDelta,
};

export function calculateElo(matches: Match[], profileMap: Map<string, Profile>, initialState?: Record<string, PlayerStats>): Record<string, PlayerStats> {
  const players: Record<string, PlayerStats> = {};

  if (initialState) {
    for (const [id, stats] of Object.entries(initialState)) {
      players[id] = { ...stats, history: [...stats.history] };
    }
  }

  const ensurePlayer = (id: string) => {
    if (players[id]) return;
    const p = profileMap.get(id);
    const name = p ? p.name : (id.startsWith("name:") ? escapeHtml(id.replace("name:", "")) : "Okänd");
    players[id] = { id, name, elo: ELO_BASELINE, wins: 0, losses: 0, games: 0, history: [] };
  };

  profileMap.forEach(p => {
    ensurePlayer(p.id);
  });

  const sortedMatches = [...matches].sort((a, b) => a.created_at.localeCompare(b.created_at));

  sortedMatches.forEach(m => {
    const t1Raw = m.team1_ids.filter(id => id && id !== GUEST_ID) as string[];
    const t2Raw = m.team2_ids.filter(id => id && id !== GUEST_ID) as string[];

    const t1Active: string[] = [];
    const t2Active: string[] = [];

    t1Raw.forEach(id => {
      ensurePlayer(id);
      if (players[id]) t1Active.push(id);
    });
    t2Raw.forEach(id => {
      ensurePlayer(id);
      if (players[id]) t2Active.push(id);
    });

    if (!t1Active.length || !t2Active.length) return;

    const e1 = t1Active.reduce((s, id) => s + players[id].elo, 0) / t1Active.length;
    const e2 = t2Active.reduce((s, id) => s + players[id].elo, 0) / t2Active.length;

    const exp1 = getExpectedScore(e1, e2);
    const team1Won = m.team1_sets > m.team2_sets;
    const marginMultiplier = getMarginMultiplier(m.team1_sets, m.team2_sets);
    const isSinglesMatch = t1Active.length === 1 && t2Active.length === 1;
    const matchWeight = getSinglesAdjustedMatchWeight(m, isSinglesMatch);

    t1Active.forEach(id => {
      const p = players[id];
      const delta = buildPlayerDelta({
        playerElo: p.elo,
        playerGames: p.games,
        teamAverageElo: e1,
        expectedScore: exp1,
        didWin: team1Won,
        marginMultiplier,
        matchWeight
      });
      p.elo += delta;
      if (team1Won) p.wins++; else p.losses++;
      p.games++;
      p.history.push({ matchId: m.id, delta, result: team1Won ? "W" : "L" });
    });

    t2Active.forEach(id => {
      const p = players[id];
      const delta = buildPlayerDelta({
        playerElo: p.elo,
        playerGames: p.games,
        teamAverageElo: e2,
        expectedScore: 1 - exp1,
        didWin: !team1Won,
        marginMultiplier,
        matchWeight
      });
      p.elo += delta;
      if (!team1Won) p.wins++; else p.losses++;
      p.games++;
      p.history.push({ matchId: m.id, delta, result: !team1Won ? "W" : "L" });
    });
  });

  return players;
}
