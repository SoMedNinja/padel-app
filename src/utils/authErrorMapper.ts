import { AuthError } from "../services/authUtils";

export const getAuthErrorMessage = (error: unknown, fallback: string) => {
  // Note for non-coders: we translate special auth errors into clear messages,
  // so people know whether to wait for login or request admin access.
  if (error instanceof AuthError) {
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error) {
    const rawMessage = (error as { message?: unknown }).message;

    // We only accept strings or numbers as valid message contents.
    // Complex types like objects or arrays would just return "[object Object]",
    // which isn't helpful, so we use the fallback instead.
    if (typeof rawMessage === "string" || typeof rawMessage === "number") {
      const message = String(rawMessage).trim();
      return message || fallback;
    }
  }

  return fallback;
};
