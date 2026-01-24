import { create } from "zustand";
import { Profile, Match } from "../types";

interface AppState {
  user: any | null;
  setUser: (user: any | null) => void;
  isGuest: boolean;
  setIsGuest: (isGuest: boolean) => void;
  matchFilter: string;
  setMatchFilter: (filter: string) => void;
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
  matchFilter: "all",
  setMatchFilter: (matchFilter) => set({ matchFilter }),
  profiles: [],
  setProfiles: (profiles) => set({ profiles }),
  matches: [],
  setMatches: (matches) => set({ matches }),
}));
