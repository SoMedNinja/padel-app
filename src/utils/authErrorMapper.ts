import { AuthError } from "../services/authUtils";

export const getAuthErrorMessage = (error: unknown, fallback: string) => {
  // Note for non-coders: we translate special auth errors into clear messages,
  // so people know whether to wait for login or request admin access.
  if (error instanceof AuthError) {
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message?: string }).message || "").trim();
    return message || fallback;
  }

  return fallback;
};
