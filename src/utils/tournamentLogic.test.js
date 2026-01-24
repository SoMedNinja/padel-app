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

// Test 2: Americano Rest Cycle A1 (Deterministic)
console.log('Test 2: Americano Rest Cycle A1');
const roundsA = [
  { mode: 'americano', resting_ids: ['p1'], team1_ids: ['p2', 'p3'], team2_ids: ['p4', 'p5'], team1_score: 12, team2_score: 12 },
];
const cycleA = getRestCycle(roundsA, participants, 'americano');
assert.deepStrictEqual(Array.from(cycleA), ['p1']);

// p1 has rested, so p2 should rest next (alphabetical tie-breaker)
const { standings: standingsA } = getTournamentState(roundsA, participants);
const nextRestingA = pickAmericanoRestingPlayers(standingsA, cycleA, participants, 1);
assert.strictEqual(nextRestingA[0], 'p2');

// Test 3: Americano Team Mixing A2
console.log('Test 3: Americano Team Mixing A2');
const teammatesFacedA = {
  p2: { p3: 1, p4: 0, p5: 0 },
  p3: { p2: 1, p4: 0, p5: 0 },
  p4: { p2: 0, p3: 0, p5: 0 },
  p5: { p2: 0, p3: 0, p4: 0 },
};
const teamsA = pickAmericanoTeams(['p2', 'p3', 'p4', 'p5'], {}, teammatesFacedA);
assert.notDeepStrictEqual(teamsA.t1.sort(), ['p2', 'p3'].sort());

// Test 4: Mexicano Rest Rule M1 + M2
console.log('Test 4: Mexicano Rest Rule M1 + M2');
const roundsM = [
  { mode: 'mexicano', resting_ids: ['p5'], team1_ids: ['p1', 'p2'], team2_ids: ['p3', 'p4'], team1_score: 20, team2_score: 4 },
];
const { standings: standingsM } = getTournamentState(roundsM, participants);
const cycleM = getRestCycle(roundsM, participants, 'mexicano');
const nextRestingM = pickMexicanoRestingPlayers(standingsM, cycleM, participants, 1);
assert.ok(['p3', 'p4'].includes(nextRestingM[0]));

// Test 5: Americano 5-player sequence
console.log('Test 5: Americano 5-player sequence');
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
  assert.strictEqual(finalStandings[p].rests, 1);
  assert.strictEqual(finalStandings[p].gamesPlayed, 4);
});

console.log('All tests passed!');
