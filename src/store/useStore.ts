import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { AppUser, Profile, Match, MatchFilter } from "../types";

interface AppState {
  user: AppUser | null;
  setUser: (user: AppUser | null) => void;
  isGuest: boolean;
  setIsGuest: (isGuest: boolean) => void;
  guestModeStartedAt: string | null;
  setGuestModeStartedAt: (timestamp: string | null) => void;
  matchFilter: MatchFilter;
  setMatchFilter: (filter: MatchFilter) => void;
  profiles: Profile[];
  setProfiles: (profiles: Profile[]) => void;
  matches: Match[];
  setMatches: (matches: Match[]) => void;
  dismissedMatchId: string | null;
  dismissedRecentMatchId: string | null;
  lastSeenMatchDate: string | null;
  dismissMatch: (matchId: string, matchDate: string) => void;
  dismissRecentMatch: (matchId: string) => void;
  checkAndResetDismissed: (latestMatchDate: string) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      isGuest: false,
      setIsGuest: (isGuest) => set({ isGuest }),
      guestModeStartedAt: null,
      setGuestModeStartedAt: (guestModeStartedAt) => set({ guestModeStartedAt }),
      matchFilter: { type: "all" },
      setMatchFilter: (matchFilter) => set({ matchFilter }),
      profiles: [],
      setProfiles: (profiles) => set({ profiles }),
      matches: [],
      setMatches: (matches) => set({ matches }),
      dismissedMatchId: null,
      dismissedRecentMatchId: null,
      lastSeenMatchDate: null,
      dismissMatch: (matchId, matchDate) => set({
        dismissedMatchId: matchId,
        lastSeenMatchDate: matchDate
      }),
      dismissRecentMatch: (matchId) => set({
        dismissedRecentMatchId: matchId
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
      // Only persist these fields. Note: 'user' is deliberately not persisted to prevent
      // persistent tampering of authorization flags (is_admin/is_approved) in localStorage.
      // useAuthProfile will re-hydrate the user state from the authoritative Supabase session.
      partialize: (state) => ({
        matchFilter: state.matchFilter,
        dismissedMatchId: state.dismissedMatchId,
        dismissedRecentMatchId: state.dismissedRecentMatchId,
        lastSeenMatchDate: state.lastSeenMatchDate,
        isGuest: state.isGuest,
        guestModeStartedAt: state.guestModeStartedAt,
      }),
    }
  )
);
