export interface EloMatch {
  team1_sets: number;
  team2_sets: number;
  score_type?: string;
  score_target?: number | null;
  source_tournament_id?: string | null;
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
