import { create } from "zustand";
import { AppUser, Profile, Match, MatchFilter } from "../types";

const MATCH_FILTER_STORAGE_KEY = "padel.matchFilter";

const loadMatchFilter = (): MatchFilter => {
  if (typeof window === "undefined") return { type: "all" };
  const raw = window.localStorage.getItem(MATCH_FILTER_STORAGE_KEY);
  if (!raw) return { type: "all" };
  try {
    return JSON.parse(raw) as MatchFilter;
  } catch {
    return { type: "all" };
  }
};

const persistMatchFilter = (filter: MatchFilter) => {
  if (typeof window === "undefined") return;
  // Note for non-coders: localStorage saves a small preference in the browser so filters persist.
  window.localStorage.setItem(MATCH_FILTER_STORAGE_KEY, JSON.stringify(filter));
};

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
  matchFilter: loadMatchFilter(),
  setMatchFilter: (matchFilter) => {
    persistMatchFilter(matchFilter);
    set({ matchFilter });
  },
  profiles: [],
  setProfiles: (profiles) => set({ profiles }),
  matches: [],
  setMatches: (matches) => set({ matches }),
}));
