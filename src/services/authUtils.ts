import { supabase } from "../supabaseClient";

/**
 * Security utility to check if a user has administrative privileges.
 * This provides defense-in-depth by verifying roles in the database
 * in addition to Row Level Security (RLS) policies.
 */
export async function checkIsAdmin(userId?: string): Promise<boolean> {
  if (!userId) return false;
  const { data } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .single();
  return data?.is_admin === true;
}
