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

// Note for non-coders: this hook keeps login info and player profile data in sync in one place.
export const useAuthProfile = () => {
  const { user: currentUser, setUser, setIsGuest } = useStore();
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasCheckedProfile, setHasCheckedProfile] = useState(false);
  const loadingTimeoutRef = useRef<number | null>(null);
  const syncLockRef = useRef<string | null>(null);
  const syncCounterRef = useRef(0);
  const userRef = useRef(currentUser);

  // Keep userRef in sync with the latest store value
  useEffect(() => {
    userRef.current = currentUser;
  }, [currentUser]);

  const startLoadingTimeout = useCallback(() => {
    // Note for non-coders: if login checks take too long, we stop showing the loading screen.
    if (loadingTimeoutRef.current !== null) {
      window.clearTimeout(loadingTimeoutRef.current);
    }
    loadingTimeoutRef.current = window.setTimeout(() => {
      setIsLoading(false);
    }, 2000);
  }, []);

  const clearLoadingTimeout = useCallback(() => {
    if (loadingTimeoutRef.current !== null) {
      window.clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
  }, []);

  const syncProfile = useCallback(
    async (authUser: User | null) => {
      if (!authUser) {
        setUser(null);
        return;
      }

      if (syncLockRef.current === authUser.id) return;
      syncLockRef.current = authUser.id;

      syncCounterRef.current++;
      const syncId = syncCounterRef.current;

      const metadataName = getMetadataName(authUser);
      const metadataAvatar = getMetadataAvatar(authUser);

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .single();

      if (error) {
        // PGRST116 means no profile found - this is normal for new users
        if (error.code !== "PGRST116") {
          setErrorMessage(error.message);
          setUser({ ...authUser } as AppUser);
          syncLockRef.current = null;
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
            setErrorMessage(createError.message);
            setUser({ ...authUser } as AppUser);
            syncLockRef.current = null;
            return;
          }

          setIsGuest(false);
          setUser(toAppUser(authUser, createdProfile));
          syncLockRef.current = null;
          return;
        }

        setUser({ ...authUser } as AppUser);
        syncLockRef.current = null;
        return;
      }

      const profileName =
        (profile as Profile | { full_name?: string })?.name?.trim() ||
        (profile as { full_name?: string })?.full_name?.trim() ||
        "";
      const cleanedProfileName = stripBadgeLabelFromName(
        profileName,
        profile?.featured_badge_id
      );
      // Note for non-coders: this keeps badge tags stored separately from the actual player name.
      const resolvedName = cleanedProfileName || metadataName;
      const resolvedAvatar = profile?.avatar_url || metadataAvatar || null;
      const needsProfileUpdate =
        (!!resolvedName && !profile?.name) ||
        (!!resolvedAvatar && !profile?.avatar_url) ||
        (!!profile?.featured_badge_id && profile?.name !== cleanedProfileName);

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
          setUser(toAppUser(authUser, updatedProfile));
          syncLockRef.current = null;
          return;
        }
      }

      if (syncId === syncCounterRef.current) {
        setIsGuest(false);
        setUser(
          toAppUser(authUser, {
            ...profile,
            name: resolvedName || profile?.name || "",
            avatar_url: resolvedAvatar ?? profile?.avatar_url,
          })
        );
      }
    },
    [setIsGuest, setUser]
  );

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    // Note for non-coders: we track when the profile check finishes so we don't show setup too early.
    setHasCheckedProfile(false);
    startLoadingTimeout();
    const timeoutMs = 8000;
    // Note for non-coders: we use a timeout so the loading screen doesn't get stuck forever.
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), timeoutMs);
    });

    // Note for non-coders: getSession is a fast local check, so we avoid waiting on the network.
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      setErrorMessage(sessionError.message);
      clearLoadingTimeout();
      setIsLoading(false);
      setHasCheckedProfile(true);
      return;
    }
    if (sessionData.session?.user) {
      await syncProfile(sessionData.session.user);
      clearLoadingTimeout();
      setIsLoading(false);
      setHasCheckedProfile(true);
      return;
    }

    const result = await Promise.race([supabase.auth.getUser(), timeoutPromise]);

    if (!result) {
      // Note for non-coders: if login is slow, we show the normal login screen instead of an error loop.
      setUser(null);
      setIsGuest(false);
      clearLoadingTimeout();
      setIsLoading(false);
      setHasCheckedProfile(true);
      return;
    }

    if ("error" in result && result.error) {
      setErrorMessage(result.error.message);
      clearLoadingTimeout();
      setIsLoading(false);
      setHasCheckedProfile(true);
      return;
    }

    await syncProfile(result.data.user ?? null);
    clearLoadingTimeout();
    setIsLoading(false);
    setHasCheckedProfile(true);
  }, [clearLoadingTimeout, startLoadingTimeout, syncProfile, setIsGuest, setUser]);

  useEffect(() => {
    let isMounted = true;
    refresh();

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return;
      setErrorMessage(null);
      // Note for non-coders: whenever the login state changes, we re-check the profile details.
      setHasCheckedProfile(false);
      await syncProfile(session?.user ?? null);
      setIsLoading(false);
      setHasCheckedProfile(true);
    });

    return () => {
      isMounted = false;
      clearLoadingTimeout();
      subscription.subscription.unsubscribe();
    };
  }, [clearLoadingTimeout, refresh, syncProfile]);

  return { isLoading, errorMessage, hasCheckedProfile, refresh };
};
