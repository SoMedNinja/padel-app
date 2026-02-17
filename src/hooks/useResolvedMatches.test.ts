import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useResolvedMatches } from './useResolvedMatches';
import { Match, Profile } from '../types';
import { makeProfileMap } from '../utils/profileMap';
import { GUEST_NAME } from '../utils/guest';

describe('useResolvedMatches', () => {
  const profile1: Profile = { id: 'p1', name: 'Alice' };
  const profile2: Profile = { id: 'p2', name: 'Bob' };
  const profiles = [profile1, profile2];
  const profileMap = makeProfileMap(profiles);

  it('should return empty array for empty matches', () => {
    const { result } = renderHook(() => useResolvedMatches([], profiles, profileMap));
    expect(result.current).toEqual([]);
  });

  it('should resolve matches with IDs', () => {
    const match = {
      id: 'm1',
      team1: [],
      team2: [],
      team1_ids: ['p1'],
      team2_ids: ['p2'],
      team1_sets: 6,
      team2_sets: 4,
      created_at: '2023-01-01',
    } as unknown as Match;

    const { result } = renderHook(() => useResolvedMatches([match], profiles, profileMap));

    expect(result.current).toHaveLength(1);
    const resolved = result.current[0];
    expect(resolved.t1.resolved).toEqual(['Alice']);
    expect(resolved.t2.resolved).toEqual(['Bob']);
    expect(resolved.t1.hasGuest).toBe(false);
    expect(resolved.t1.hasUnknown).toBe(false);
  });

  it('should resolve matches with names', () => {
    const match = {
      id: 'm2',
      team1: ['Alice'],
      team2: ['Bob'],
      team1_ids: [],
      team2_ids: [],
      team1_sets: 6,
      team2_sets: 4,
      created_at: '2023-01-01',
    } as unknown as Match;

    const { result } = renderHook(() => useResolvedMatches([match], profiles, profileMap));

    expect(result.current).toHaveLength(1);
    const resolved = result.current[0];
    expect(resolved.t1.resolved).toEqual(['Alice']);
    expect(resolved.t2.resolved).toEqual(['Bob']);
  });

  it('should handle guest players', () => {
    const match = {
      id: 'm3',
      team1: [GUEST_NAME],
      team2: ['Alice'],
      team1_ids: [],
      team2_ids: [],
      team1_sets: 6,
      team2_sets: 4,
      created_at: '2023-01-01',
    } as unknown as Match;

    const { result } = renderHook(() => useResolvedMatches([match], profiles, profileMap));

    expect(result.current).toHaveLength(1);
    const resolved = result.current[0];
    expect(resolved.t1.hasGuest).toBe(true);
    expect(resolved.t1.resolved).toEqual([]);
  });

  it('should handle unknown players', () => {
    const match = {
      id: 'm4',
      team1: ['UnknownPlayer'],
      team2: ['Alice'],
      team1_ids: [],
      team2_ids: [],
      team1_sets: 6,
      team2_sets: 4,
      created_at: '2023-01-01',
    } as unknown as Match;

    const { result } = renderHook(() => useResolvedMatches([match], profiles, profileMap));

    expect(result.current).toHaveLength(1);
    const resolved = result.current[0];
    expect(resolved.t1.hasUnknown).toBe(true);
    expect(resolved.t1.resolved).toEqual([]);
  });

  it('should sort matches by created_at descending', () => {
    const m1 = { id: 'm1', created_at: '2023-01-01', team1_ids: [], team2_ids: [] } as unknown as Match;
    const m2 = { id: 'm2', created_at: '2023-01-02', team1_ids: [], team2_ids: [] } as unknown as Match;

    const { result } = renderHook(() => useResolvedMatches([m1, m2], profiles, profileMap));

    expect(result.current).toHaveLength(2);
    expect(result.current[0].m.id).toBe('m2');
    expect(result.current[1].m.id).toBe('m1');
  });

  it('should normalize serve flag', () => {
    const m1 = { id: 'm1', team1_serves_first: true, team1_ids: [], team2_ids: [], created_at: '2023-01-01' } as unknown as Match;
    const m2 = { id: 'm2', team1_serves_first: false, team1_ids: [], team2_ids: [], created_at: '2023-01-01' } as unknown as Match;
    const m3 = { id: 'm3', team1_serves_first: null, team1_ids: [], team2_ids: [], created_at: '2023-01-01' } as unknown as Match;

    const { result } = renderHook(() => useResolvedMatches([m1, m2, m3], profiles, profileMap));

    expect(result.current[0].normalizedServeFlag).toBe(true);
    expect(result.current[1].normalizedServeFlag).toBe(false);
    expect(result.current[2].normalizedServeFlag).toBe(null);
  });
});
