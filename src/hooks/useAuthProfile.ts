import { useCallback, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "../supabaseClient";
import { useStore } from "../store/useStore";
import { AppUser, Profile } from "../types";

const toAppUser = (authUser: User, profile?: Profile | null): AppUser => ({
  ...authUser,
  ...(profile ?? {}),
});

// Note for non-coders: this hook keeps login info and player profile data in sync in one place.
export const useAuthProfile = () => {
  const { setUser, setIsGuest } = useStore();
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const syncProfile = useCallback(
    async (authUser: User | null) => {
      if (!authUser) {
        setUser(null);
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .single();

      if (error) {
        setErrorMessage(error.message);
        setUser({ ...authUser });
        return;
      }

      setIsGuest(false);
      setUser(toAppUser(authUser, profile));
    },
    [setIsGuest, setUser]
  );

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    const timeoutMs = 8000;
    // Note for non-coders: we use a timeout so the loading screen doesn't get stuck forever.
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), timeoutMs);
    });

    try {
      const result = await Promise.race([
        supabase.auth.getUser(),
        timeoutPromise,
      ]);

      if (!result) {
        setErrorMessage("Inloggningen tog för lång tid. Försök igen.");
        return;
      }

      if ("error" in result && result.error) {
        setErrorMessage(result.error.message);
        return;
      }

      await syncProfile(result.data.user ?? null);
    } finally {
      setIsLoading(false);
    }
  }, [syncProfile]);

  useEffect(() => {
    let isMounted = true;
    refresh();

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return;
      setErrorMessage(null);
      await syncProfile(session?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [refresh, syncProfile]);

  return { isLoading, errorMessage, refresh };
};
