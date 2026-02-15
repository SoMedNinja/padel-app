import { useEffect, useState } from "react";
import { Alert, AlertTitle, Box, Button, Typography } from "@mui/material";
import {
  AppVersionState,
  evaluateWebVersionPolicy,
  getCurrentWebAppVersion,
  resolveWebPolicy,
} from "../services/appVersionService";

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

  const isRequired = versionState.kind === "updateRequired";
  const title = isRequired ? "Uppdatering krävs" : "Uppdatering rekommenderas";
  const defaultMessage = isRequired
    ? "Din webbapp är för gammal för den här miljön. Ladda om för att hämta den senaste säkra versionen."
    : "En ny version av webbappen finns. Ladda om för senaste förbättringar.";

  return (
    <Alert
      severity={isRequired ? "error" : "info"}
      action={(
        <Button color="inherit" size="small" variant={isRequired ? "contained" : "text"} onClick={() => window.location.reload()}>
          Ladda om
        </Button>
      )}
    >
      <AlertTitle>{title}</AlertTitle>
      <Typography variant="body2">{versionState.policy.releaseNotes ?? defaultMessage}</Typography>
      <Box sx={{ mt: 0.75 }}>
        <Typography variant="caption" color="text.secondary">
          Minst stödd version: {versionState.policy.minimumSupportedVersion}
          {versionState.policy.latestAvailableVersion ? ` • Senaste version: ${versionState.policy.latestAvailableVersion}` : ""}
        </Typography>
      </Box>
    </Alert>
  );
}
