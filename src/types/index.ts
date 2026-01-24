export interface Profile {
  id: string;
  name: string;
  avatar_url?: string | null;
  is_admin?: boolean;
  is_approved?: boolean;
  is_deleted?: boolean;
  featured_badge_id?: string | null;
  created_at?: string;
}

export type ScoreType = "sets" | "points";

export interface Match {
  id: string;
  team1: string | string[]; // Can be string names or array of names
  team2: string | string[];
  team1_ids: (string | null)[];
  team2_ids: (string | null)[];
  team1_sets: number;
  team2_sets: number;
  score_type?: ScoreType;
  score_target?: number | null;
  source_tournament_id?: string | null;
  source_tournament_type?: "mexicana" | "standalone" | "americano" | string | null;
  created_at: string;
  created_by?: string;
  team1_serves_first?: boolean;
}

export interface PlayerStats {
  id: string;
  name: string;
  elo: number;
  startElo: number;
  wins: number;
  losses: number;
  games: number;
  history: EloHistoryEntry[];
  partners: Record<string, PartnerStats>;
  avatarUrl?: string | null;
  featuredBadgeId?: string | null;
  recentResults: ("W" | "L")[];
  bestPartner?: BestPartner | null;
}

export interface EloHistoryEntry {
  result: "W" | "L";
  timestamp: number;
  delta: number;
  matchId: string;
}

export interface PartnerStats {
  games: number;
  wins: number;
}

export interface BestPartner {
  partnerId: string;
  games: number;
  wins: number;
  winRate: number;
  name: string;
}

export interface TournamentResult {
  id: string;
  player_id: string;
  profile_id?: string; // Some tables use profile_id
  rank: number;
  total_points: number;
  tournament_id: string;
  created_at: string;
  tournament_type?: string;
}
