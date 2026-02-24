import { describe, it, expect } from 'vitest';
import { queryKeys } from './queryKeys';
import { MatchFilter } from '../types';

describe('queryKeys', () => {
  it('profiles returns correct key', () => {
    expect(queryKeys.profiles()).toEqual(['profiles']);
  });

  it('matches returns correct key without filter', () => {
    expect(queryKeys.matches()).toEqual(['matches']);
  });

  it('matches returns correct key with filter', () => {
    const filter: MatchFilter = { type: 'all', limit: 10 };
    expect(queryKeys.matches(filter)).toEqual(['matches', filter]);
  });

  it('matchesInfinite returns correct key', () => {
    const filter: MatchFilter = { type: 'last30' };
    expect(queryKeys.matchesInfinite(filter)).toEqual(['matches-infinite', filter]);
  });

  it('matchesInfiniteBase returns correct key', () => {
    expect(queryKeys.matchesInfiniteBase()).toEqual(['matches-infinite']);
  });

  it('tournaments returns correct key', () => {
    expect(queryKeys.tournaments()).toEqual(['tournaments']);
  });

  it('tournamentDetailsBase returns correct key', () => {
    expect(queryKeys.tournamentDetailsBase()).toEqual(['tournamentDetails']);
  });

  it('tournamentDetails returns correct key without id', () => {
    expect(queryKeys.tournamentDetails()).toEqual(['tournamentDetails', undefined]);
  });

  it('tournamentDetails returns correct key with id', () => {
    const tournamentId = '123';
    expect(queryKeys.tournamentDetails(tournamentId)).toEqual(['tournamentDetails', tournamentId]);
  });

  it('tournamentResults returns correct key', () => {
    expect(queryKeys.tournamentResults()).toEqual(['tournamentResults']);
  });

  it('tournamentResultsHistory returns correct key', () => {
    expect(queryKeys.tournamentResultsHistory()).toEqual(['tournamentResultsHistory']);
  });

  it('availabilityPolls returns correct key', () => {
    expect(queryKeys.availabilityPolls()).toEqual(['availabilityPolls']);
  });

  it('scheduledGames returns correct key', () => {
    expect(queryKeys.scheduledGames()).toEqual(['availabilityScheduledGames']);
  });
});
