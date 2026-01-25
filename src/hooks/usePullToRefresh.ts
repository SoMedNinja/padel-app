import { useCallback } from "react";

type RefreshAction = () => Promise<unknown>;

// Note for non-coders: this hook bundles multiple "reload" actions into one pull-to-refresh gesture.
export const usePullToRefresh = (actions: RefreshAction[]) => {
  return useCallback(async () => {
    await Promise.all(actions.map(action => action()));
  }, [actions]);
};
