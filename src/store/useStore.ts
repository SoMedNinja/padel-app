import { create } from "zustand";
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
}

export const useStore = create<AppState>((set) => ({
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
}));
