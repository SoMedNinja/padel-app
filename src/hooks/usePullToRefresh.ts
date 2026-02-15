import { useCallback } from "react";
import { isIosDevice } from "../utils/platform";

type RefreshAction = () => Promise<unknown> | unknown;

const REFRESH_ACTION_TIMEOUT_MS = 12000;
const IOS_MIN_REFRESH_ANIMATION_MS = 900;

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
    const refreshStartedAt = Date.now();

    await Promise.all(
      actions.map(async (action) => {
        try {
          await waitForAction(action);
        } catch {
          // Note for non-coders: one failed refresh task should not block the whole screen refresh animation.
        }
      })
    );

    if (isIosDevice()) {
      const elapsedMs = Date.now() - refreshStartedAt;
      const remainingAnimationMs = IOS_MIN_REFRESH_ANIMATION_MS - elapsedMs;

      // Note for non-coders: iOS can finish network requests very fast, so we keep the animation alive briefly to avoid a flash.
      if (remainingAnimationMs > 0) {
        await new Promise<void>((resolve) => {
          window.setTimeout(resolve, remainingAnimationMs);
        });
      }
    }
  }, [actions]);
};
