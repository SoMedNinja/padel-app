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
  const syncPromiseRef = useRef<Promise<void> | null>(null);
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
        setHasCheckedProfile(false);
        syncPromiseRef.current = null;
        setUser(null);
        setIsGuest(false);
        setIsLoading(false);
        setHasCheckedProfile(true);
        clearLoadingTimeout();
        return;
      }

      // Only show verification screen if we don't have a user yet or if the user changed
      if (!userRef.current || userRef.current.id !== authUser.id) {
        setHasCheckedProfile(false);
      }

      if (syncPromiseRef.current) {
        return syncPromiseRef.current;
      }

      syncPromiseRef.current = (async () => {
        try {
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
                return;
              }

              setIsGuest(false);
              setUser(toAppUser(authUser, createdProfile));
              return;
            }

            setUser({ ...authUser } as AppUser);
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

          // Optimization: Only update if there's actually a CHANGE or missing data that metadata can provide.
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
        } finally {
          syncPromiseRef.current = null;
          setIsLoading(false);
          setHasCheckedProfile(true);
          clearLoadingTimeout();
        }
      })();

      return syncPromiseRef.current;
    },
    [setIsGuest, setUser, clearLoadingTimeout]
  );

  const refresh = useCallback(async () => {
    if (syncPromiseRef.current) {
      await syncPromiseRef.current;
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    await syncProfile(session?.user ?? null);
  }, [syncProfile]);

  useEffect(() => {
    let isMounted = true;
    startLoadingTimeout();

    // Initial check: try to get session immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMounted) syncProfile(session?.user ?? null);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return;
      setErrorMessage(null);
      await syncProfile(session?.user ?? null);
    });

    return () => {
      isMounted = false;
      clearLoadingTimeout();
      subscription.subscription.unsubscribe();
    };
  }, [clearLoadingTimeout, startLoadingTimeout, syncProfile]);

  return { isLoading, errorMessage, hasCheckedProfile, refresh };
};
