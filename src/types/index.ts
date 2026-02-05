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

export type MatchFilterType =
  | "all"
  | "short"
  | "long"
  | "tournaments"
  | "last7"
  | "last30"
  | "range";

export interface MatchFilter {
  type: MatchFilterType;
  startDate?: string | null;
  endDate?: string | null;
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
  streak?: string;
  trend?: string;
  bestPartner?: BestPartner | null;
}

export interface EloHistoryEntry {
  result: "W" | "L";
  timestamp: number;
  date: string;
  delta: number;
  elo: number;
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
  player_id?: string;
  profile_id?: string;
  rank: number;
  points_for: number;
  points_against: number;
  matches_played: number;
  wins: number;
  losses: number;
  tournament_id: string;
  created_at: string;
  tournament_type?: string;
}

export interface TournamentRound {
  id: string;
  tournament_id: string;
  round_number: number;
  team1_ids: string[];
  team2_ids: string[];
  resting_ids?: string[];
  team1_score?: number | null;
  team2_score?: number | null;
  mode?: "americano" | "mexicano";
  created_at?: string;
}

export interface AppUser extends Profile {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, any>;
}

export interface MatchRecapPlayer {
  id: string;
  name: string;
  elo: number;
  delta: number;
}

export interface MatchRecapTeam {
  ids: string[];
  averageElo: number;
  players: MatchRecapPlayer[];
}

export interface MatchRecap {
  createdAt: string;
  scoreline: string;
  teamAWon: boolean;
  fairness: number;
  winProbability: number;
  teamA: MatchRecapTeam;
  teamB: MatchRecapTeam;
  team1ServesFirst: boolean;
}

export interface EveningRecapLeader {
  id: string;
  name: string;
  games: number;
  wins: number;
  losses: number;
  setsFor: number;
  setsAgainst: number;
  rotations: number; // Number of unique partners
  avgEloOpponents: number;
  winRate: number;
}

export interface EveningRecap {
  dateLabel: string;
  matches: number;
  totalSets: number;
  mvp: EveningRecapLeader | null;
  leaders: EveningRecapLeader[];
  funFacts: {
    mostRotations: EveningRecapLeader[];
    strongest: EveningRecapLeader[]; // Highest win rate (min 2 games)
    marathon: { name: string; sets: number } | null;
  };
}

export interface MatchSuggestionRound {
  round: number;
  teamA: string[];
  teamB: string[];
  rest: string[];
}

export interface MatchSuggestion {
  mode: "single" | "rotation";
  fairness: number;
  winProbability?: number;
  teamA?: string[];
  teamB?: string[];
  rounds?: MatchSuggestionRound[];
  targetGames?: number;
}

export type AvailabilitySlot = "morning" | "day" | "evening";

export interface AvailabilityVote {
  id: string;
  poll_day_id: string;
  profile_id: string;
  // Note for non-coders: old votes may still use a single slot (slot), while new votes can store many choices.
  slot?: AvailabilitySlot | null;
  slot_preferences?: AvailabilitySlot[] | null;
  created_at: string;
  updated_at?: string;
}

export interface AvailabilityPollDay {
  id: string;
  poll_id: string;
  date: string;
  created_at?: string;
  votes?: AvailabilityVote[];
}

export interface AvailabilityPollMailLog {
  id: string;
  poll_id: string;
  sent_by: string;
  sent_at: string;
  created_at?: string;
}

export interface AvailabilityPoll {
  id: string;
  created_by: string;
  week_year: number;
  week_number: number;
  start_date: string;
  end_date: string;
  status: "open" | "closed";
  closed_at?: string | null;
  created_at: string;
  days?: AvailabilityPollDay[];
  mail_logs?: AvailabilityPollMailLog[];
}
