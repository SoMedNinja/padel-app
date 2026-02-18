export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-token',
};

export const GUEST_ID = "guest";
export const ELO_BASELINE = 1000;
export const BASE_K = 20;
export const HIGH_K = 40;
export const MID_K = 30;
export const MAX_MARGIN_MULTIPLIER = 1.2;
export const MAX_PLAYER_WEIGHT = 1.25;
export const MIN_PLAYER_WEIGHT = 0.75;
export const EXPECTED_SCORE_DIVISOR = 300;
export const PLAYER_WEIGHT_DIVISOR = 800;
export const SHORT_SET_MAX = 3;
export const LONG_SET_MIN = 6;
export const SHORT_POINTS_MAX = 15;
export const MID_POINTS_MAX = 21;
export const SHORT_MATCH_WEIGHT = 0.5;
export const MID_MATCH_WEIGHT = 0.5;
export const LONG_MATCH_WEIGHT = 1;
export const SINGLES_MATCH_WEIGHT = 0.5;
export const ALLOWED_TEST_ROLES = new Set(["authenticated", "service_role"]);
export const ALLOWED_BROADCAST_ROLES = new Set(["admin", "service_role"]);
export const WEEKLY_MIN_GAMES = 1;

export const romanNumerals = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

export const BADGE_ICON_MAP: Record<string, string> = {
  matches: "🏟️",
  wins: "🏆",
  losses: "🧱",
  streak: "🔥",
  activity: "📅",
  elo: "📈",
  upset: "🎯",
  "win-rate": "📊",
  "elo-lift": "🚀",
  marathon: "⏱️",
  "fast-win": "⚡",
  clutch: "🧊",
  partners: "🤝",
  rivals: "👀",
  "tournaments-played": "🎲",
  "tournaments-wins": "🥇",
  "tournaments-podiums": "🥉",
  "americano-wins": "🇺🇸",
  "mexicano-wins": "🇲🇽",
  "night-owl": "🦉",
  "early-bird": "🌅",
  "clean-sheets": "🧹",
  "giant-slayer": "⚔️",
  "king-of-elo": "👑",
  "most-active": "🐜",
  "win-machine": "🤖",
  "upset-king": "⚡",
  "marathon-pro": "🏃",
  "clutch-pro": "🧊",
  "social-butterfly": "🦋",
  "monthly-giant": "🐘",
  "the-wall": "🧱"
};

export const BADGE_THRESHOLD_MAP: Record<string, number[]> = {
  matches: [1, 5, 10, 25, 50, 75, 100, 150, 200],
  wins: [1, 5, 10, 25, 50, 75, 100, 150],
  losses: [1, 5, 10, 25, 50, 75],
  streak: [3, 5, 7, 10, 15],
  activity: [3, 6, 10, 15, 20],
  elo: [1100, 1200, 1300, 1400, 1500],
  upset: [25, 50, 100, 150, 200, 250],
  "win-rate": [50, 60, 70, 80, 90],
  "elo-lift": [50, 100],
  marathon: [1, 3, 5, 10, 15],
  "fast-win": [1, 3, 5, 8, 12],
  clutch: [1, 3, 5, 8, 12],
  partners: [2, 4, 6, 10, 15],
  rivals: [3, 5, 8, 12, 20],
  "tournaments-played": [1, 3, 5, 8],
  "tournaments-wins": [1, 2, 3],
  "tournaments-podiums": [1, 3, 5],
  "americano-wins": [1, 3, 5],
  "mexicano-wins": [1, 3, 5],
  "night-owl": [5, 10, 25],
  "early-bird": [5, 10, 25],
  "clean-sheets": [5, 10, 25, 50]
};
