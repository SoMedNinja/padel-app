import assert from 'node:assert';
import {
  getTournamentState,
  getRestCycle,
  pickAmericanoRestingPlayers,
  pickAmericanoTeams,
  pickMexicanoRestingPlayers,
  pickMexicanoTeams,
  getNextSuggestion
} from './tournamentLogic.js';

const participants = ['p1', 'p2', 'p3', 'p4', 'p5'];

// Test 1: Initial State
console.log('Test 1: Initial State');
const { standings, teammatesFaced, opponentsFaced } = getTournamentState([], participants);
assert.strictEqual(Object.keys(standings).length, 5);
assert.strictEqual(standings['p1'].totalPoints, 0);
assert.strictEqual(teammatesFaced['p1']['p2'], 0);

// Test 2: Americano Rest Cycle A1
console.log('Test 2: Americano Rest Cycle A1');
const roundsA = [
  { mode: 'americano', resting_ids: ['p1'], team1_ids: ['p2', 'p3'], team2_ids: ['p4', 'p5'], team1_score: 12, team2_score: 12 },
];
const cycleA = getRestCycle(roundsA, participants, 'americano');
assert.deepStrictEqual(Array.from(cycleA), ['p1']);

// p1 has rested, so someone else should rest next.
const { standings: standingsA } = getTournamentState(roundsA, participants);
const nextRestingA = pickAmericanoRestingPlayers(standingsA, cycleA, participants, 1);
assert.notStrictEqual(nextRestingA[0], 'p1');

// Test 3: Americano Team Mixing A2
console.log('Test 3: Americano Team Mixing A2');
const teammatesFacedA = {
  p2: { p3: 1, p4: 0, p5: 0 },
  p3: { p2: 1, p4: 0, p5: 0 },
  p4: { p2: 0, p3: 0, p5: 0 },
  p5: { p2: 0, p3: 0, p4: 0 },
};
// If p1 rests, active are p2, p3, p4, p5. p2 and p3 have already been teammates.
const teamsA = pickAmericanoTeams(['p2', 'p3', 'p4', 'p5'], {}, teammatesFacedA);
// Should not pair p2 and p3 again if possible.
// Possible splits:
// {t1: [p2, p3], t2: [p4, p5]} -> repeatCount = 1 + 0 = 1
// {t1: [p2, p4], t2: [p3, p5]} -> repeatCount = 0 + 0 = 0
// {t1: [p2, p5], t2: [p3, p4]} -> repeatCount = 0 + 0 = 0
assert.notDeepStrictEqual(teamsA.t1.sort(), ['p2', 'p3'].sort());

// Test 4: Mexicano Rest Rule M1 + M2
console.log('Test 4: Mexicano Rest Rule M1 + M2');
const roundsM = [
  { mode: 'mexicano', resting_ids: ['p5'], team1_ids: ['p1', 'p2'], team2_ids: ['p3', 'p4'], team1_score: 20, team2_score: 4 },
];
// Standings: p1: 20, p2: 20, p3: 4, p4: 4, p5: 0
const { standings: standingsM } = getTournamentState(roundsM, participants);
const cycleM = getRestCycle(roundsM, participants, 'mexicano');
assert.deepStrictEqual(Array.from(cycleM), ['p5']);

// Next resting should be someone with lowest points but NOT p5 (because of M2)
const nextRestingM = pickMexicanoRestingPlayers(standingsM, cycleM, participants, 1);
assert.ok(['p3', 'p4'].includes(nextRestingM[0]));

// Test 5: Mexicano Team Balance
console.log('Test 5: Mexicano Team Balance');
// p3 rests. Active: p1(20), p2(20), p4(4), p5(0)
const teamsM = pickMexicanoTeams(['p1', 'p2', 'p4', 'p5'], standingsM);
// Possible splits:
// [p1, p2] (40) vs [p4, p5] (4) -> diff 36
// [p1, p4] (24) vs [p2, p5] (20) -> diff 4
// [p1, p5] (20) vs [p2, p4] (24) -> diff 4
assert.strictEqual(Math.abs((standingsM[teamsM.t1[0]].totalPoints + standingsM[teamsM.t1[1]].totalPoints) - (standingsM[teamsM.t2[0]].totalPoints + standingsM[teamsM.t2[1]].totalPoints)), 4);

// Test 6: Deterministic Tie-breaking
console.log('Test 6: Deterministic Tie-breaking');
// All zero standings
const nextRestingT = pickAmericanoRestingPlayers({}, new Set(), participants, 1);
assert.strictEqual(nextRestingT[0], 'p1'); // Should pick first in list if all equal

console.log('All tests passed!');
