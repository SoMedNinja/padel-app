import { useEffect, useState } from "react";
import { matchService } from "../services/matchService";

export function useMatchSyncStatus() {
  const [syncState, setSyncState] = useState(matchService.getMutationQueueState());

  useEffect(() => {
    const unsubscribe = matchService.subscribeToMutationQueue(setSyncState);
    return unsubscribe;
  }, []);

  return syncState;
}
