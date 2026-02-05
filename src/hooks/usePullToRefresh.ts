import { useCallback } from "react";

type RefreshAction = () => Promise<unknown> | unknown;

const REFRESH_ACTION_TIMEOUT_MS = 12000;

const waitForAction = async (action: RefreshAction) => {
  const timeoutPromise = new Promise<null>((resolve) => {
    window.setTimeout(() => resolve(null), REFRESH_ACTION_TIMEOUT_MS);
  });

  // Note for non-coders: we stop waiting after a while so the pull-to-refresh spinner never gets stuck forever.
  await Promise.race([Promise.resolve(action()), timeoutPromise]);
};

// Note for non-coders: this hook bundles multiple "reload" actions into one pull-to-refresh gesture.
export const usePullToRefresh = (actions: RefreshAction[]) => {
  return useCallback(async () => {
    await Promise.all(
      actions.map(async (action) => {
        try {
          await waitForAction(action);
        } catch {
          // Note for non-coders: one failed refresh task should not block the whole screen refresh animation.
        }
      })
    );
  }, [actions]);
};
