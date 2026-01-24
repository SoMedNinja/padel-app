import { describe, it, expect } from 'vitest';
import {
  getTournamentState,
  getRestCycle,
  pickAmericanoRestingPlayers,
  pickAmericanoTeams,
  pickMexicanoRestingPlayers,
  pickMexicanoTeams,
  generateAmericanoRounds,
  getNextSuggestion
} from './tournamentLogic';

describe('Tournament Logic', () => {
  const participants = ['p1', 'p2', 'p3', 'p4', 'p5'];

  it('should initialize tournament state correctly', () => {
    const { standings } = getTournamentState([], participants);
    expect(Object.keys(standings)).toHaveLength(5);
    expect(standings['p1'].totalPoints).toBe(0);
  });

  it('should calculate rest cycle correctly', () => {
    const rounds: any[] = [
      { mode: 'americano', resting_ids: ['p1'] }
    ];
    const restCycle = getRestCycle(rounds, participants, 'americano');
    expect(restCycle.has('p1')).toBe(true);
    expect(restCycle.has('p2')).toBe(false);
  });

  it('should pick americano resting players correctly', () => {
    const standings: any = {
      p1: { gamesPlayed: 0 },
      p2: { gamesPlayed: 1 },
      p3: { gamesPlayed: 0 },
      p4: { gamesPlayed: 0 },
      p5: { gamesPlayed: 0 }
    };
    const restCycle = new Set(['p2']);
    const resting = pickAmericanoRestingPlayers(standings, restCycle, participants, 1);
    // Should prefer someone NOT in restCycle (p2) and with lowest gamesPlayed
    expect(resting).toHaveLength(1);
    expect(resting[0]).not.toBe('p2');
  });

  it('should pick balanced teams for mexicano', () => {
    const standings: any = {
      p1: { totalPoints: 100 },
      p2: { totalPoints: 10 },
      p3: { totalPoints: 90 },
      p4: { totalPoints: 20 }
    };
    const active = ['p1', 'p2', 'p3', 'p4'];
    const teams = pickMexicanoTeams(active, standings);
    // Best split should be (p1+p2=110) vs (p3+p4=110) or similar
    const score1 = standings[teams.t1[0]].totalPoints + standings[teams.t1[1]].totalPoints;
    const score2 = standings[teams.t2[0]].totalPoints + standings[teams.t2[1]].totalPoints;
    expect(Math.abs(score1 - score2)).toBeLessThanOrEqual(20);
  });

  it('should generate suggested rounds for americano', () => {
    const rounds = generateAmericanoRounds(participants);
    expect(rounds).toHaveLength(5); // For 5 players, it's 5 rounds
    expect(rounds[0].mode).toBe('americano');
  });
});
