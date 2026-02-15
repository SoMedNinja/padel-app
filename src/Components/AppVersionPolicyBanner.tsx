import { useEffect, useState } from "react";
import { Alert, AlertTitle, Box, Button, Typography } from "@mui/material";
import {
  AppVersionState,
  evaluateWebVersionPolicy,
  getCurrentWebAppVersion,
  resolveWebPolicy,
} from "../services/appVersionService";
import { UPDATE_STATE_CONTENT, UpdateUrgency } from "../shared/updateStates";

export default function AppVersionPolicyBanner() {
  const [versionState, setVersionState] = useState<AppVersionState>({ kind: "upToDate" });

  useEffect(() => {
    let isMounted = true;

    const loadPolicy = async () => {
      const policy = await resolveWebPolicy();
      if (!isMounted || !policy) {
        return;
      }

      // Note for non-coders: we compare the running app build to policy numbers to decide if update is optional or mandatory.
      setVersionState(evaluateWebVersionPolicy(getCurrentWebAppVersion(), policy));
    };

    void loadPolicy();

    return () => {
      isMounted = false;
    };
  }, []);

  if (versionState.kind === "upToDate") return null;

  const urgency: UpdateUrgency = versionState.kind === "updateRequired" ? "required" : "recommended";
  const content = UPDATE_STATE_CONTENT[urgency];

  return (
    <Alert
      severity={urgency === "required" ? "error" : "info"}
      action={(
        <Button color="inherit" size="small" variant={urgency === "required" ? "contained" : "text"} onClick={() => window.location.reload()}>
          {content.primaryActionLabel}
        </Button>
      )}
    >
      <AlertTitle>{content.title}</AlertTitle>
      <Typography variant="body2">{versionState.policy.releaseNotes ?? content.message}</Typography>
      <Box sx={{ mt: 0.75 }}>
        <Typography variant="caption" color="text.secondary">
          Minst stödd version: {versionState.policy.minimumSupportedVersion}
          {versionState.policy.latestAvailableVersion ? ` • Senaste version: ${versionState.policy.latestAvailableVersion}` : ""}
        </Typography>
      </Box>
    </Alert>
  );
}
