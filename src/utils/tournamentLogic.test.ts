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

  describe('getTournamentState', () => {
    it('should initialize tournament state correctly', () => {
      const { standings } = getTournamentState([], participants);
      expect(Object.keys(standings)).toHaveLength(5);
      expect(standings['p1'].totalPoints).toBe(0);
      expect(standings['p1'].gamesPlayed).toBe(0);
    });

    it('should update standings correctly with scores', () => {
      const rounds: any[] = [
        {
          team1_ids: ['p1', 'p2'],
          team2_ids: ['p3', 'p4'],
          team1_score: 21,
          team2_score: 15
        }
      ];
      const { standings } = getTournamentState(rounds, participants);
      expect(standings['p1'].totalPoints).toBe(21);
      expect(standings['p1'].wins).toBe(1);
      expect(standings['p3'].totalPoints).toBe(15);
      expect(standings['p3'].losses).toBe(1);
    });

    it('should track teammates and opponents faced', () => {
      const rounds: any[] = [
        {
          team1_ids: ['p1', 'p2'],
          team2_ids: ['p3', 'p4']
        }
      ];
      const { teammatesFaced, opponentsFaced } = getTournamentState(rounds, participants);
      expect(teammatesFaced['p1']['p2']).toBe(1);
      expect(teammatesFaced['p2']['p1']).toBe(1);
      expect(opponentsFaced['p1']['p3']).toBe(1);
      expect(opponentsFaced['p3']['p1']).toBe(1);
    });
  });

  describe('getRestCycle', () => {
    it('should calculate rest cycle correctly', () => {
      const rounds: any[] = [
        { mode: 'americano', resting_ids: ['p1'] }
      ];
      const restCycle = getRestCycle(rounds, participants, 'americano');
      expect(restCycle.has('p1')).toBe(true);
      expect(restCycle.has('p2')).toBe(false);
    });

    it('should handle multiple rests in cycle', () => {
      const rounds: any[] = [
        { mode: 'americano', resting_ids: ['p1'] },
        { mode: 'americano', resting_ids: ['p2'] }
      ];
      // minRests is 0 (p3, p4, p5 have 0 rests), so anyone with > 0 is in restCycle
      const restCycle = getRestCycle(rounds, participants, 'americano');
      expect(restCycle.has('p1')).toBe(true);
      expect(restCycle.has('p2')).toBe(true);
      expect(restCycle.has('p3')).toBe(false);
    });
  });

  describe('pickAmericanoRestingPlayers', () => {
    it('should prefer someone NOT in restCycle and with lowest gamesPlayed', () => {
      const standings: any = {
        p1: { gamesPlayed: 0 },
        p2: { gamesPlayed: 1 },
        p3: { gamesPlayed: 0 },
        p4: { gamesPlayed: 0 },
        p5: { gamesPlayed: 0 }
      };
      const restCycle = new Set(['p2']);
      const resting = pickAmericanoRestingPlayers(standings, restCycle, participants, 1);
      expect(resting).toHaveLength(1);
      expect(resting[0]).not.toBe('p2');
    });
  });

  describe('pickAmericanoTeams', () => {
    it('should minimize repeat teammates', () => {
      const teammatesFaced = {
        p1: { p2: 1, p3: 0, p4: 0 },
        p2: { p1: 1, p3: 0, p4: 0 },
        p3: { p1: 0, p2: 0, p4: 1 },
        p4: { p1: 0, p2: 0, p3: 1 },
      } as any;
      const active = ['p1', 'p2', 'p3', 'p4'];
      const teams = pickAmericanoTeams(active, {}, teammatesFaced, {});
      // p1 should NOT be with p2 if possible
      const t1Set = new Set(teams.t1);
      if (t1Set.has('p1')) {
        expect(t1Set.has('p2')).toBe(false);
      }
    });
  });

  describe('pickMexicanoTeams', () => {
    it('should pick balanced teams for mexicano', () => {
      const standings: any = {
        p1: { totalPoints: 100 },
        p2: { totalPoints: 10 },
        p3: { totalPoints: 90 },
        p4: { totalPoints: 20 }
      };
      const active = ['p1', 'p2', 'p3', 'p4'];
      const teams = pickMexicanoTeams(active, standings);
      const score1 = standings[teams.t1[0]].totalPoints + standings[teams.t1[1]].totalPoints;
      const score2 = standings[teams.t2[0]].totalPoints + standings[teams.t2[1]].totalPoints;
      expect(Math.abs(score1 - score2)).toBeLessThanOrEqual(20);
    });
  });

  describe('generateAmericanoRounds', () => {
    it('should generate suggested rounds for 4 players', () => {
      const rounds = generateAmericanoRounds(['p1', 'p2', 'p3', 'p4']);
      expect(rounds).toHaveLength(3);
    });

    it('should generate suggested rounds for 5 players', () => {
      const rounds = generateAmericanoRounds(participants);
      expect(rounds).toHaveLength(5);
    });
  });

  describe('getNextSuggestion', () => {
    it('should return a valid suggestion', () => {
      const suggestion = getNextSuggestion([], participants, 'americano');
      expect(suggestion.team1_ids).toHaveLength(2);
      expect(suggestion.team2_ids).toHaveLength(2);
      expect(suggestion.resting_ids).toHaveLength(1);

      const allPlayers = [...suggestion.team1_ids, ...suggestion.team2_ids, ...suggestion.resting_ids];
      expect(new Set(allPlayers).size).toBe(5);
    });
  });
});
