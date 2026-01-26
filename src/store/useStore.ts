import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { AppUser, Profile, Match, MatchFilter } from "../types";

interface AppState {
  user: AppUser | null;
  setUser: (user: AppUser | null) => void;
  isGuest: boolean;
  setIsGuest: (isGuest: boolean) => void;
  matchFilter: MatchFilter;
  setMatchFilter: (filter: MatchFilter) => void;
  profiles: Profile[];
  setProfiles: (profiles: Profile[]) => void;
  matches: Match[];
  setMatches: (matches: Match[]) => void;
  dismissedMatchId: string | null;
  lastSeenMatchDate: string | null;
  dismissMatch: (matchId: string, matchDate: string) => void;
  checkAndResetDismissed: (latestMatchDate: string) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      isGuest: false,
      setIsGuest: (isGuest) => set({ isGuest }),
      matchFilter: { type: "all" },
      setMatchFilter: (matchFilter) => set({ matchFilter }),
      profiles: [],
      setProfiles: (profiles) => set({ profiles }),
      matches: [],
      setMatches: (matches) => set({ matches }),
      dismissedMatchId: null,
      lastSeenMatchDate: null,
      dismissMatch: (matchId, matchDate) => set({
        dismissedMatchId: matchId,
        lastSeenMatchDate: matchDate
      }),
      checkAndResetDismissed: (latestMatchDate) => set((state) => {
        if (state.lastSeenMatchDate && state.lastSeenMatchDate !== latestMatchDate) {
          return { dismissedMatchId: null, lastSeenMatchDate: latestMatchDate };
        }
        return { lastSeenMatchDate: latestMatchDate };
      }),
    }),
    {
      name: "padel-store",
      storage: createJSONStorage(() => localStorage),
      // Only persist these fields
      partialize: (state) => ({
        matchFilter: state.matchFilter,
        dismissedMatchId: state.dismissedMatchId,
        lastSeenMatchDate: state.lastSeenMatchDate,
        // We might want to persist user/isGuest as well if they were intended to be persistent
        user: state.user,
        isGuest: state.isGuest,
      }),
    }
  )
);
