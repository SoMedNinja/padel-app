import { supabase } from "../supabaseClient";

export interface PuzzleLeaderboardEntry {
  userId: string;
  name: string;
  avatarUrl: string | null;
  score: number;
}

export const puzzleScoreService = {
  async incrementScore(delta: number): Promise<void> {
    const { error } = await supabase.rpc("increment_puzzle_score", {
      score_delta: delta,
    });
    if (error) throw error;
  },

  async getLeaderboard(limit = 50): Promise<PuzzleLeaderboardEntry[]> {
    const { data, error } = await supabase
      .from("puzzle_scores")
      .select(`
        user_id,
        score,
        profiles (
          name,
          avatar_url
        )
      `)
      .order("score", { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map((row: any) => ({
      userId: row.user_id,
      score: row.score,
      name: row.profiles?.name ?? "Unknown Player",
      avatarUrl: row.profiles?.avatar_url ?? null,
    }));
  },

  async getUserScore(userId: string): Promise<number> {
    const { data, error } = await supabase
      .from("puzzle_scores")
      .select("score")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    return data?.score ?? 0;
  },
};
