import { describe, it, expect } from 'vitest';
import {
  getTournamentState,
  getRestCycle,
  pickAmericanoRestingPlayers,
  pickAmericanoTeams,
  pickMexicanoRestingPlayers,
  pickMexicanoTeams,
  getNextSuggestion
} from './tournamentLogic.js';

describe('Tournament Logic', () => {
  const participants = ['p1', 'p2', 'p3', 'p4', 'p5'];

  it('Initial State', () => {
    const { standings, teammatesFaced } = getTournamentState([], participants);
    expect(Object.keys(standings).length).toBe(5);
    expect(standings['p1'].totalPoints).toBe(0);
    expect(teammatesFaced['p1']['p2']).toBe(0);
  });

  it('Americano Rest Cycle A1 (Deterministic)', () => {
    const roundsA = [
      { mode: 'americano', resting_ids: ['p1'], team1_ids: ['p2', 'p3'], team2_ids: ['p4', 'p5'], team1_score: 12, team2_score: 12 },
    ];
    const cycleA = getRestCycle(roundsA, participants, 'americano');
    expect(Array.from(cycleA)).toEqual(['p1']);

    const { standings: standingsA } = getTournamentState(roundsA, participants);
    const nextRestingA = pickAmericanoRestingPlayers(standingsA, cycleA, participants, 1);
    expect(nextRestingA[0]).toBe('p2');
  });

  it('Americano Team Mixing A2', () => {
    const teammatesFacedA = {
      p1: { p2: 0, p3: 0, p4: 0, p5: 0 },
      p2: { p1: 0, p3: 1, p4: 0, p5: 0 },
      p3: { p1: 0, p2: 1, p4: 0, p5: 0 },
      p4: { p1: 0, p2: 0, p3: 0, p5: 0 },
      p5: { p1: 0, p2: 0, p3: 0, p4: 0 },
    };
    const teamsA = pickAmericanoTeams(['p2', 'p3', 'p4', 'p5'], {}, teammatesFacedA);
    // Should NOT pair p2 and p3 again
    const t1 = teamsA.t1.sort();
    expect(t1).not.toEqual(['p2', 'p3'].sort());
  });

  it('Mexicano Rest Rule M1 + M2', () => {
    const roundsM = [
      { mode: 'mexicano', resting_ids: ['p5'], team1_ids: ['p1', 'p2'], team2_ids: ['p3', 'p4'], team1_score: 20, team2_score: 4 },
    ];
    const { standings: standingsM } = getTournamentState(roundsM, participants);
    const cycleM = getRestCycle(roundsM, participants, 'mexicano');
    const nextRestingM = pickMexicanoRestingPlayers(standingsM, cycleM, participants, 1);
    // p3 and p4 have the lowest points (4)
    expect(['p3', 'p4']).toContain(nextRestingM[0]);
  });

  it('Americano 5-player sequence', () => {
    let currentRounds = [];
    for (let i = 0; i < 5; i++) {
      const suggestion = getNextSuggestion(currentRounds, participants, 'americano');
      currentRounds.push({
        ...suggestion,
        mode: 'americano',
        team1_score: 10,
        team2_score: 10
      });
    }
    // Everyone should have rested exactly once
    const finalStandings = getTournamentState(currentRounds, participants).standings;
    participants.forEach(p => {
      expect(finalStandings[p].rests).toBe(1);
      expect(finalStandings[p].gamesPlayed).toBe(4);
    });
  });
});
