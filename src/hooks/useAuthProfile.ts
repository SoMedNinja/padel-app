import { useCallback, useEffect, useRef, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "../supabaseClient";
import { useStore } from "../store/useStore";
import { AppUser, Profile } from "../types";
import { stripBadgeLabelFromName } from "../utils/profileName";

const toAppUser = (authUser: User, profile?: Profile | null): AppUser => ({
  ...authUser,
  ...(profile ?? {}),
});

const getMetadataName = (authUser: User) => {
  const rawName = authUser.user_metadata?.full_name || authUser.user_metadata?.name || "";
  return typeof rawName === "string" ? rawName.trim() : "";
};

const getMetadataAvatar = (authUser: User) => {
  const rawAvatar = authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || null;
  return typeof rawAvatar === "string" ? rawAvatar : null;
};

const isAvatarColumnMissing = (error?: { message?: string } | null) =>
  error?.message?.includes("avatar_url") && error.message.includes("schema cache");

const isAbortLikeError = (error?: { message?: string; name?: string } | null) => {
  const message = error?.message?.toLowerCase() || "";
  const name = error?.name?.toLowerCase() || "";
  return name.includes("abort") || message.includes("aborterror") || message.includes("operation was aborted");
};

export type AuthStatus = "initializing" | "recovering" | "authenticated" | "unauthenticated";

const SESSION_NULL_GRACE_MS = 1500;
const LOADING_HINT_DELAY_MS = 2000;
const RESUME_RECOVERY_COOLDOWN_MS = 400;
const SESSION_FETCH_TIMEOUT_MS = 4000;
const SESSION_REFRESH_TIMEOUT_MS = 5000;
const maxRecoveryAttempts = 2;

// Note for non-coders: this hook keeps login info and player profile data in sync in one place.
export const useAuthProfile = () => {
  const { user: currentUser, setUser, setIsGuest, isGuest } = useStore();
  const [authStatus, setAuthStatus] = useState<AuthStatus>("initializing");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasCheckedProfile, setHasCheckedProfile] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [isRecoveringSession, setIsRecoveringSession] = useState(false);
  const [hasRecoveryFailed, setHasRecoveryFailed] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [isAutoRecoveryRetry, setIsAutoRecoveryRetry] = useState(false);
  const [showLoadingHint, setShowLoadingHint] = useState(false);
  const loadingHintTimeoutRef = useRef<number | null>(null);
  const syncPromiseRef = useRef<Promise<void> | null>(null);
  const syncCounterRef = useRef(0);
  const userRef = useRef(currentUser);
  const isGuestRef = useRef(isGuest);
  const recoveryAttemptRef = useRef(0);
  const recoveryPromiseRef = useRef<Promise<User | null> | null>(null);
  const nullGracePromiseRef = useRef<Promise<boolean> | null>(null);
  const resumeRecoveryPromiseRef = useRef<Promise<void> | null>(null);
  const resumeRecoveryStartedAtRef = useRef(0);

  const isDebugAuth = (import.meta as any).env.DEV && (import.meta as any).env.VITE_DEBUG_AUTH === "true";
  const debugAuth = useCallback(
    (...args: unknown[]) => {
      if (isDebugAuth) {
        console.info("[auth-recovery]", ...args);
      }
    },
    [isDebugAuth]
  );

  const withTimeout = useCallback(
    async <T,>(work: Promise<T>, timeoutMs: number, timeoutLabel: string): Promise<T> => {
      // Note for non-coders: this is a safety timer so one slow network call cannot freeze the whole login flow forever.
      return await Promise.race([
        work,
        new Promise<T>((_, reject) => {
          window.setTimeout(() => {
            reject(new Error(timeoutLabel));
          }, timeoutMs);
        }),
      ]);
    },
    []
  );

  // Keep userRef in sync with the latest store value
  useEffect(() => {
    userRef.current = currentUser;
    isGuestRef.current = isGuest;
  }, [currentUser, isGuest]);

  const startLoadingHintTimeout = useCallback(() => {
    // Note for non-coders: if checks take a while, we show a friendly hint but keep waiting.
    if (loadingHintTimeoutRef.current !== null) {
      window.clearTimeout(loadingHintTimeoutRef.current);
    }
    loadingHintTimeoutRef.current = window.setTimeout(() => {
      setShowLoadingHint(true);
    }, LOADING_HINT_DELAY_MS);
  }, []);

  const clearLoadingHintTimeout = useCallback(() => {
    if (loadingHintTimeoutRef.current !== null) {
      window.clearTimeout(loadingHintTimeoutRef.current);
      loadingHintTimeoutRef.current = null;
    }
    setShowLoadingHint(false);
  }, []);

  const setAsConfirmedUnauthenticated = useCallback(() => {
    setAuthStatus("unauthenticated");
    setHasCheckedProfile(true);
    syncPromiseRef.current = null;
    setUser(null);
    setIsGuest(false);
    setProfileName("");
    setIsLoading(false);
    clearLoadingHintTimeout();
  }, [clearLoadingHintTimeout, setIsGuest, setUser]);

  const attemptSessionRecovery = useCallback(async () => {
    if (recoveryPromiseRef.current) {
      return recoveryPromiseRef.current;
    }

    if (recoveryAttemptRef.current >= maxRecoveryAttempts) {
      setHasRecoveryFailed(true);
      return null;
    }

    setIsRecoveringSession(true);
    setAuthStatus("recovering");
    setRecoveryError(null);
    recoveryAttemptRef.current += 1;
    const attemptNumber = recoveryAttemptRef.current;
    const delayMs = attemptNumber === 1 ? 250 : 750;

    // Note for non-coders: we wait a beat before retrying so temporary hiccups can clear.
    recoveryPromiseRef.current = (async () => {
      if (delayMs > 0) {
        await new Promise((resolve) => window.setTimeout(resolve, delayMs));
      }

      let recoveredUser: User | null = null;

      try {
        const { data, error } = await withTimeout(
          supabase.auth.refreshSession(),
          SESSION_REFRESH_TIMEOUT_MS,
          "Session refresh timed out"
        );
        recoveredUser = data.session?.user ?? null;

        if (error) {
          setRecoveryError(error.message);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Session refresh failed";
        setRecoveryError(message);
      }

      if (!recoveredUser && attemptNumber >= maxRecoveryAttempts) {
        setHasRecoveryFailed(true);
      }

      if (recoveredUser) {
        setHasRecoveryFailed(false);
        recoveryAttemptRef.current = 0;
      }

      setIsRecoveringSession(false);
      setIsAutoRecoveryRetry(false);
      recoveryPromiseRef.current = null;
      return recoveredUser;
    })();

    return recoveryPromiseRef.current;
  }, [withTimeout]);

  const syncProfile = useCallback(
    async (authUser: User | null, options?: { skipRecovery?: boolean }) => {
      if (!authUser) {
        if (!options?.skipRecovery) {
          setAuthStatus("recovering");
          const recoveredUser = await attemptSessionRecovery();
          if (recoveredUser) {
            await syncProfile(recoveredUser);
            return;
          }
        }

        setAsConfirmedUnauthenticated();
        return;
      }

      setAuthStatus("authenticated");
      setHasRecoveryFailed(false);
      setIsRecoveringSession(false);
      setRecoveryError(null);
      setIsAutoRecoveryRetry(false);
      recoveryAttemptRef.current = 0;

      // Only show verification screen if we don't have a user yet or if the user changed
      if (!userRef.current || userRef.current.id !== authUser.id) {
        setHasCheckedProfile(false);
      }

      if (syncPromiseRef.current) {
        return syncPromiseRef.current;
      }

      syncPromiseRef.current = (async () => {
        try {
          syncCounterRef.current += 1;
          const syncId = syncCounterRef.current;

          const metadataName = getMetadataName(authUser);
          const metadataAvatar = getMetadataAvatar(authUser);

          const { data: profile, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", authUser.id)
            .single();

          if (error) {
            if (isAbortLikeError(error)) {
              // Note for non-coders: waking the app can cancel an in-flight request.
              // We treat that as temporary noise instead of showing a scary blocking error.
              setUser({ ...authUser } as AppUser);
              setProfileName(metadataName);
              return;
            }

            // PGRST116 means no profile found - this is normal for new users
            if (error.code !== "PGRST116") {
              setErrorMessage(error.message);
              setUser({ ...authUser } as AppUser);
              // Note for non-coders: keep the best name we have even if the profile fetch failed.
              setProfileName(metadataName);
              return;
            }

            if (metadataName || metadataAvatar) {
              // Note for non-coders: if we already know your name/photo from login data,
              // we save it right away so you don't see the setup screen every time.
              const payload: Profile = { id: authUser.id, name: metadataName || "" };
              if (metadataAvatar) {
                payload.avatar_url = metadataAvatar;
              }

              let { data: createdProfile, error: createError } = await supabase
                .from("profiles")
                .upsert(payload, { onConflict: "id" })
                .select()
                .single();

              if (createError && isAvatarColumnMissing(createError) && payload.avatar_url) {
                ({ data: createdProfile, error: createError } = await supabase
                  .from("profiles")
                  .upsert({ id: authUser.id, name: payload.name }, { onConflict: "id" })
                  .select()
                  .single());
              }

              if (createError) {
                if (isAbortLikeError(createError)) {
                  // Note for non-coders: an aborted save can happen when the app/tab is resuming.
                  // We avoid interrupting the player and simply keep going with known local data.
                  setUser({ ...authUser } as AppUser);
                  setProfileName(metadataName);
                  return;
                }

                setErrorMessage(createError.message);
                setUser({ ...authUser } as AppUser);
                setProfileName(metadataName);
                return;
              }

              setIsGuest(false);
              setProfileName(createdProfile?.name || metadataName);
              setUser(toAppUser(authUser, createdProfile));
              return;
            }

            setProfileName(metadataName);
            setUser({ ...authUser } as AppUser);
            return;
          }

          const persistedProfile = profile as Profile;
          // Note for non-coders: we store only one player name field ("name") in profiles.
          const resolvedProfileName = persistedProfile?.name?.trim() || "";
          const cleanedProfileName = stripBadgeLabelFromName(
            resolvedProfileName,
            persistedProfile?.featured_badge_id
          );
          // Note for non-coders: this keeps badge tags stored separately from the actual player name.
          const resolvedName = cleanedProfileName || metadataName;
          const resolvedAvatar = persistedProfile?.avatar_url || metadataAvatar || null;
          // Note for non-coders: we cache the best-known name so the app knows your profile is complete.
          setProfileName(resolvedName);

          // Optimization: Only update if there's actually a CHANGE or missing data that metadata can provide.
          const needsProfileUpdate =
            (!!resolvedName && !persistedProfile?.name) ||
            (!!resolvedAvatar && !persistedProfile?.avatar_url) ||
            (!!persistedProfile?.featured_badge_id && persistedProfile?.name !== cleanedProfileName);

          if (needsProfileUpdate) {
            // Note for non-coders: we fill in missing profile details from login info so
            // returning players don't have to retype their name or photo.
            const payload: Profile = { id: authUser.id, name: resolvedName || "" };
            if (resolvedAvatar) {
              payload.avatar_url = resolvedAvatar;
            }

            let { data: updatedProfile, error: updateError } = await supabase
              .from("profiles")
              .upsert(payload, { onConflict: "id" })
              .select()
              .single();

            if (updateError && isAvatarColumnMissing(updateError) && payload.avatar_url) {
              ({ data: updatedProfile, error: updateError } = await supabase
                .from("profiles")
                .upsert({ id: authUser.id, name: payload.name }, { onConflict: "id" })
                .select()
                .single());
            }

            if (!updateError) {
              setIsGuest(false);
              setProfileName(updatedProfile?.name || resolvedName);
              setUser(toAppUser(authUser, updatedProfile));
              return;
            }
          }

          if (syncId === syncCounterRef.current) {
            setIsGuest(false);
            setProfileName(resolvedName || persistedProfile?.name || metadataName);
            setUser(
              toAppUser(authUser, {
                ...persistedProfile,
                name: resolvedName || persistedProfile?.name || "",
                avatar_url: resolvedAvatar ?? persistedProfile?.avatar_url,
              })
            );
          }
        } finally {
          syncPromiseRef.current = null;
          setIsLoading(false);
          setHasCheckedProfile(true);
          clearLoadingHintTimeout();
        }
      })();

      return syncPromiseRef.current;
    },
    [attemptSessionRecovery, clearLoadingHintTimeout, setAsConfirmedUnauthenticated, setIsGuest, setUser]
  );

  const waitForNullSessionGrace = useCallback(async () => {
    if (nullGracePromiseRef.current) {
      return nullGracePromiseRef.current;
    }

    // Note for non-coders: we briefly wait before treating an empty session as "logged out"
    // because waking a tab can report stale auth state for a moment.
    nullGracePromiseRef.current = (async () => {
      await new Promise((resolve) => window.setTimeout(resolve, SESSION_NULL_GRACE_MS));
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const stillNull = !session?.user;
      nullGracePromiseRef.current = null;
      return stillNull;
    })();

    return nullGracePromiseRef.current;
  }, []);

  const runRecoveryPipeline = useCallback(
    async (source: "bootstrap" | "visibility" | "focus" | "online" | "manual-refresh") => {
      if (resumeRecoveryPromiseRef.current) {
        debugAuth(source, "deduped: already running");
        return resumeRecoveryPromiseRef.current;
      }

      const now = Date.now();
      if (source !== "bootstrap" && now - resumeRecoveryStartedAtRef.current < RESUME_RECOVERY_COOLDOWN_MS) {
        debugAuth(source, "deduped: cooldown");
        return;
      }

      resumeRecoveryStartedAtRef.current = now;
      resumeRecoveryPromiseRef.current = (async () => {
        if (source !== "bootstrap" && !userRef.current && !isGuestRef.current) {
          setIsAutoRecoveryRetry(true);
        }

        let sessionUser: User | null = null;

        try {
          const {
            data: { session },
          } = await withTimeout(
            supabase.auth.getSession(),
            SESSION_FETCH_TIMEOUT_MS,
            "Session lookup timed out"
          );
          sessionUser = session?.user ?? null;
        } catch (error) {
          debugAuth(source, "getSession failed", error);
        }

        if (sessionUser) {
          debugAuth(source, "session present from getSession");
          await syncProfile(sessionUser);
          return;
        }

        if (source !== "bootstrap") {
          const stillNullAfterGrace = await waitForNullSessionGrace();
          if (!stillNullAfterGrace) {
            debugAuth(source, "session restored during grace period");
            try {
              const {
                data: { session: recoveredByGraceSession },
              } = await withTimeout(
                supabase.auth.getSession(),
                SESSION_FETCH_TIMEOUT_MS,
                "Session lookup timed out"
              );
              await syncProfile(recoveredByGraceSession?.user ?? null);
            } catch (error) {
              debugAuth(source, "post-grace getSession failed", error);
              setAsConfirmedUnauthenticated();
            }
            return;
          }
        }

        if (!userRef.current && !isGuestRef.current) {
          recoveryAttemptRef.current = 0;
        }

        const recoveredUser = await attemptSessionRecovery();
        if (recoveredUser) {
          debugAuth(source, "session recovered via refreshSession");
          await syncProfile(recoveredUser);
          return;
        }

        if (isGuestRef.current) {
          debugAuth(source, "guest mode preserved");
          setIsLoading(false);
          setAuthStatus("unauthenticated");
          setHasCheckedProfile(true);
          return;
        }

        debugAuth(source, "confirmed unauthenticated");
        setAsConfirmedUnauthenticated();
      })().finally(() => {
        resumeRecoveryPromiseRef.current = null;
      });

      return resumeRecoveryPromiseRef.current;
    },
    [attemptSessionRecovery, debugAuth, isGuest, setAsConfirmedUnauthenticated, syncProfile, waitForNullSessionGrace, withTimeout]
  );

  const refresh = useCallback(async () => {
    if (syncPromiseRef.current) {
      await syncPromiseRef.current;
      return;
    }

    setHasRecoveryFailed(false);
    setRecoveryError(null);
    await runRecoveryPipeline("manual-refresh");
  }, [runRecoveryPipeline]);

  useEffect(() => {
    let isMounted = true;
    startLoadingHintTimeout();

    // Note for non-coders: if boot-time recovery crashes, we safely continue to the login screen instead of spinning forever.
    void runRecoveryPipeline("bootstrap").catch((error) => {
      debugAuth("bootstrap", "pipeline failed", error);
      setAsConfirmedUnauthenticated();
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      setErrorMessage(null);

      if (event === "SIGNED_OUT") {
        // Note for non-coders: explicit logout means we should stop recovering and show login now.
        setHasRecoveryFailed(false);
        setRecoveryError(null);
        recoveryAttemptRef.current = 0;
        setIsRecoveringSession(false);
        setIsAutoRecoveryRetry(false);
        setAsConfirmedUnauthenticated();
        return;
      }

      // Note for non-coders: Supabase warns against waiting (`await`) inside this listener.
      // If we wait here, Chrome can keep this auth event "open" and the app may appear stuck.
      // We instead schedule the real sync right after this listener returns.
      queueMicrotask(() => {
        if (!isMounted) {
          return;
        }

        void syncProfile(session?.user ?? null, { skipRecovery: false });
      });
    });

    // Note for non-coders: these listeners refresh login info when you return to the tab or regain internet.
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void runRecoveryPipeline("visibility");
      }
    };

    const handleFocus = () => {
      void runRecoveryPipeline("focus");
    };

    const handleOnline = () => {
      void runRecoveryPipeline("online");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("online", handleOnline);

    return () => {
      isMounted = false;
      clearLoadingHintTimeout();
      subscription.subscription.unsubscribe();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("online", handleOnline);
    };
  }, [clearLoadingHintTimeout, debugAuth, runRecoveryPipeline, setAsConfirmedUnauthenticated, startLoadingHintTimeout, syncProfile]);

  return {
    authStatus,
    isLoading,
    errorMessage,
    hasCheckedProfile,
    profileName,
    refresh,
    isRecoveringSession,
    hasRecoveryFailed,
    recoveryError,
    isAutoRecoveryRetry,
    showLoadingHint,
  };
};
