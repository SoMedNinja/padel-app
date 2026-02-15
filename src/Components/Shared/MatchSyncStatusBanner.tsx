import CloudDoneIcon from "@mui/icons-material/CloudDone";
import CloudOffIcon from "@mui/icons-material/CloudOff";
import SyncProblemIcon from "@mui/icons-material/SyncProblem";
import { Alert, AlertTitle, Button } from "@mui/material";
import { matchService } from "../../services/matchService";
import { useMatchSyncStatus } from "../../hooks/useMatchSyncStatus";

export default function MatchSyncStatusBanner() {
  const sync = useMatchSyncStatus();

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
            Försök synka igen
          </Button>
        )}
      >
        <AlertTitle>Synkningen behöver hjälp</AlertTitle>
        {/* Note for non-coders: failed means the app kept your match locally, but server sync still failed after retries. */}
        {sync.failedCount} match(er) väntar på manuell synk. {sync.lastError || "Kontrollera internet och försök igen."}
      </Alert>
    );
  }

  if (sync.status === "pending") {
    return (
      <Alert severity="warning" icon={<CloudOffIcon />}>
        <AlertTitle>Offline-kö aktiv</AlertTitle>
        {/* Note for non-coders: pending means your action is safely queued and will auto-send when connection is back. */}
        {sync.pendingCount} match(er) väntar på uppladdning. Du kan fortsätta använda appen.
      </Alert>
    );
  }

  return (
    <Alert severity="success" icon={<CloudDoneIcon />}>
      <AlertTitle>Alla matcher synkade</AlertTitle>
      Senaste synk: {sync.lastSyncedAt ? new Date(sync.lastSyncedAt).toLocaleTimeString() : "nyss"}.
    </Alert>
  );
}
