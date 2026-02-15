import { supabase } from "../supabaseClient";

export interface FirstPerfectPuzzleMeritRecord {
  merit_key: string;
  user_id: string;
  achieved_at: string;
}

const FIRST_PERFECT_MERIT_KEY = "padel-quiz-first-perfect";

export const puzzleMeritService = {
  async getFirstPerfectPlayer() {
    const { data, error } = await supabase
      .from("puzzle_unique_merits")
      .select("merit_key,user_id,achieved_at")
      .eq("merit_key", FIRST_PERFECT_MERIT_KEY)
      .maybeSingle();

    if (error) throw error;
    return (data as FirstPerfectPuzzleMeritRecord | null) ?? null;
  },

  async claimFirstPerfectPlayer(userId: string) {
    // Note for non-coders: the database table has a unique key per merit,
    // so this insert succeeds only for the first player and safely fails for later players.
    const { error: insertError } = await supabase
      .from("puzzle_unique_merits")
      .insert({ merit_key: FIRST_PERFECT_MERIT_KEY, user_id: userId });

    // Postgres unique-violation code: another player already claimed it.
    if (insertError && insertError.code !== "23505") {
      throw insertError;
    }

    return this.getFirstPerfectPlayer();
  },
};
