import { usePullToRefresh } from "./usePullToRefresh";

type InvalidationAction = () => Promise<unknown>;

// Note for non-coders: this helper turns a list of "refresh this data" actions into one onRefresh callback.
export const useRefreshInvalidations = (invalidations: InvalidationAction[]) => {
  return usePullToRefresh(invalidations);
};
