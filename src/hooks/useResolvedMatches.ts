import { useMemo } from 'react';
import { Match, Profile } from '../types';
import { getProfileDisplayName, normalizeProfileName } from '../utils/profileMap';
import { GUEST_NAME } from '../utils/guest';

export interface ResolvedMatch {
  m: Match;
  t1: { resolved: string[]; hasGuest: boolean; hasUnknown: boolean };
  t2: { resolved: string[]; hasGuest: boolean; hasUnknown: boolean };
  normalizedServeFlag: boolean | null;
}

const normalizeServeFlag = (value: any) => {
  if (value === true || value === 1 || value === "1" || value === "true") return true;
  if (value === false || value === 0 || value === "0" || value === "false") return false;
  return null;
};

export function useResolvedMatches(
  matches: Match[],
  profiles: Profile[],
  profileMap: Map<string, Profile>
): ResolvedMatch[] {

  const sortedMatches = useMemo(() => {
    // Optimization: check if matches are already sorted in O(N) to avoid expensive O(N log N) sort.
    let isSorted = true;
    for (let i = 1; i < matches.length; i++) {
      if (matches[i].created_at > matches[i - 1].created_at) {
        isSorted = false;
        break;
      }
    }

    if (isSorted) return matches;

    // Optimization: Use ISO string lexicographical comparison instead of expensive new Date() calls.
    return [...matches].sort(
      (a, b) => (b.created_at < a.created_at ? -1 : b.created_at > a.created_at ? 1 : 0)
    );
  }, [matches]);

  const allowedNameMap = useMemo(() => {
    const map = new Map<string, string>();
    profiles.forEach(profile => {
      const name = getProfileDisplayName(profile);
      const key = normalizeProfileName(name);
      if (key && !map.has(key)) {
        map.set(key, name);
      }
    });
    map.set(normalizeProfileName(GUEST_NAME), GUEST_NAME);
    return map;
  }, [profiles]);

  // Optimization: Pre-resolve match data to avoid expensive ID resolution and normalization in the hot loop.
  return useMemo(() => {
    const guestKey = normalizeProfileName(GUEST_NAME);
    return sortedMatches.map(m => {
      // Optimization: Resolve and normalize in a single pass directly from IDs/Names to final names.
      // This avoids multiple iterations and intermediate array allocations in the hot loop.
      const resolveTeam = (ids: (string | null)[] | undefined, names: string | string[] | undefined) => {
        const resolved: string[] = [];
        let hasGuest = false;
        let hasUnknown = false;

        const players = (ids && ids.length > 0) ? ids : (Array.isArray(names) ? names : (typeof names === "string" ? names.split(",") : []));

        for (let i = 0; i < players.length; i++) {
          let p = players[i];
          if (!p) continue;
          if (typeof p === "string") p = p.trim();
          if (!p) continue;

          const key = normalizeProfileName(p);
          if (key === guestKey) {
            hasGuest = true;
            break;
          }

          // Try resolving by ID first if it's an ID string, then fallback to normalized name lookup.
          const profile = (ids && ids.length > 0) ? profileMap.get(p as string) : null;
          const finalName = profile ? getProfileDisplayName(profile) : allowedNameMap.get(key);

          if (finalName && finalName !== "Okänd") {
            resolved.push(finalName);
          } else if (allowedNameMap.size) {
            hasUnknown = true;
            break;
          }
        }
        return { resolved, hasGuest, hasUnknown };
      };

      return {
        m,
        t1: resolveTeam(m.team1_ids, m.team1),
        t2: resolveTeam(m.team2_ids, m.team2),
        normalizedServeFlag: normalizeServeFlag(m.team1_serves_first)
      };
    });
  }, [sortedMatches, profileMap, allowedNameMap]);
}
