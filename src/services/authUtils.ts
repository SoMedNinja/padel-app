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

export type AuthErrorCode = "session-not-ready" | "not-admin";

export class AuthError extends Error {
  code: AuthErrorCode;

  constructor(code: AuthErrorCode, message: string) {
    super(message);
    this.name = "AuthError";
    this.code = code;
  }
}

export async function requireAdmin(notAdminMessage: string) {
  const { data: sessionData } = await supabase.auth.getSession();
  const currentUser = sessionData.session?.user;

  // Note for non-coders: this tells the UI when the login session hasn't finished loading yet,
  // so we can show a "try again" message instead of looking like the button did nothing.
  if (!currentUser) {
    throw new AuthError(
      "session-not-ready",
      "Din session laddas fortfarande. Försök igen om en stund."
    );
  }

  const isAdmin = await checkIsAdmin(currentUser.id);
  if (!isAdmin) {
    throw new AuthError("not-admin", notAdminMessage);
  }

  return currentUser;
}

export async function ensureAuthSessionReady() {
  // Note for non-coders: this waits for Supabase to finish restoring any saved login
  // so first-load data requests don't run with a missing session and hang.
  await supabase.auth.getSession();
}
