import CloudDoneIcon from "@mui/icons-material/CloudDone";
import CloudOffIcon from "@mui/icons-material/CloudOff";
import SyncProblemIcon from "@mui/icons-material/SyncProblem";
import { Alert, AlertTitle, Button } from "@mui/material";
import { matchService } from "../../services/matchService";
import { useMatchSyncStatus } from "../../hooks/useMatchSyncStatus";

export default function MatchSyncStatusBanner() {
  const sync = useMatchSyncStatus();
  const hasConflict = (sync.lastError || "").toLowerCase().includes("konflikt");

  if (sync.status === "synced" && !sync.pendingCount && !sync.failedCount) {
    return null;
  }

  if (sync.status === "failed") {
    return (
      <Alert
        severity="error"
        icon={<SyncProblemIcon />}
        action={(
          <Button color="inherit" size="small" onClick={() => void matchService.flushMutationQueue()}>
            Försök igen
          </Button>
        )}
      >
        <AlertTitle>{hasConflict ? "Konflikt kräver åtgärd" : "Synkningen behöver hjälp"}</AlertTitle>
        {/* Note for non-coders: failed means the app kept your data locally, but server sync paused after repeated failures or a conflict. */}
        {sync.failedCount} ändring(ar) väntar på manuell hantering. {sync.lastError || "Kontrollera internet och försök igen."}
      </Alert>
    );
  }

  if (sync.status === "pending") {
    return (
      <Alert severity="warning" icon={<CloudOffIcon />}>
        <AlertTitle>Offline-kö aktiv</AlertTitle>
        {/* Note for non-coders: pending means your action is safely queued and will auto-send when connection is back. */}
        {sync.pendingCount} ändring(ar) väntar på uppladdning. Du kan fortsätta använda appen.
      </Alert>
    );
  }

  return (
    <Alert severity="success" icon={<CloudDoneIcon />}>
      <AlertTitle>Alla ändringar synkade</AlertTitle>
      Senaste synk: {sync.lastSyncedAt ? new Date(sync.lastSyncedAt).toLocaleTimeString() : "nyss"}.
    </Alert>
  );
}
