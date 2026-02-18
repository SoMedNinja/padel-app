export interface Profile {
  id: string;
  name: string;
  avatar_url?: string | null;
  featured_badge_id?: string | null;
  email?: string | null;
}

export interface Match {
  id: string;
  team1_ids: (string | null)[];
  team2_ids: (string | null)[];
  team1_sets: number;
  team2_sets: number;
  score_type?: string;
  score_target?: number | null;
  source_tournament_id?: string | null;
  created_at: string;
}

export interface PlayerStats {
  id: string;
  name: string;
  elo: number;
  wins: number;
  losses: number;
  games: number;
  history: { matchId: string; delta: number; result: "W" | "L" }[];
}

export interface PlayerDeltaParams {
  playerElo: number;
  playerGames: number;
  teamAverageElo: number;
  expectedScore: number;
  didWin: boolean;
  marginMultiplier: number;
  matchWeight: number;
}

export interface WeeklyPlayerStats {
  id: string;
  name: string;
  matchesPlayed: number;
  eloDelta: number;
  currentElo: number;
  winRate: number;
  partners: { name: string; count: number }[];
  avatarUrl: string | null;
  synergy: PartnerStat | null;
  rivalry: RivalStat | null;
  bestComeback: ComebackStat | null;
  recentResults: string[];
  resultsByDate: { dateLabel: string; scores: string[] }[];
  wins: number;
  featuredBadgeId: string | null;
}

export interface PartnerStat {
  id: string;
  name: string;
  avatarUrl: string | null;
  games: number;
  winRate: number;
}

export interface RivalStat {
  id: string;
  name: string;
  avatarUrl: string | null;
  games: number;
  winRate: number;
}

export interface ComebackStat {
  score: string;
  margin: number;
  teamsLabel: string;
}

export interface MvpCandidate extends WeeklyPlayerStats {
  score: number;
  periodEloGain: number;
  eloNet: number;
}

export interface WeekHighlight {
  type: 'upset' | 'thriller' | 'crush' | 'titans';
  score: number;
  title: string;
  description: string;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  elo: number;
  rank: number;
  trend: "up" | "down" | "same";
  avatarUrl: string | null;
}

export interface EmailResult {
  id: string;
  name: string;
  success: boolean;
  error?: string;
  previewHtml?: string;
}
