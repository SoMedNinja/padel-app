import React, { useEffect, useMemo, useState } from "react";
import { Alert, AlertTitle, Box, Button, Typography } from "@mui/material";
import IosShareIcon from "@mui/icons-material/IosShare";
import AddBoxOutlinedIcon from "@mui/icons-material/AddBoxOutlined";
import { isIosDevice } from "../utils/platform";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const isIosSafari = () => {
  if (typeof navigator === "undefined") return false;

  const userAgent = navigator.userAgent;
  const isSafariEngine = /Safari/i.test(userAgent);
  const isOtherIosBrowser = /CriOS|FxiOS|EdgiOS|OPiOS/i.test(userAgent);

  // Note for non-coders: iOS browsers all use Safari's engine, so we exclude known non-Safari apps by name.
  return isIosDevice() && isSafariEngine && !isOtherIosBrowser;
};

const isRunningStandalone = () => {
  if (typeof window === "undefined") return false;

  const inDisplayMode = window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

  // Note for non-coders: if either check is true, the app is already installed, so we hide this prompt.
  return inDisplayMode || iosStandalone;
};

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  const showIosInstructions = useMemo(() => isIosSafari(), []);

  useEffect(() => {
    setIsInstalled(isRunningStandalone());

    const mediaQuery = window.matchMedia("(display-mode: standalone)");

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    const handleDisplayModeChange = () => {
      setIsInstalled(isRunningStandalone());
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    mediaQuery.addEventListener("change", handleDisplayModeChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      mediaQuery.removeEventListener("change", handleDisplayModeChange);
    };
  }, []);

  if (isInstalled) {
    return null;
  }

  if (deferredPrompt) {
    return (
      <Alert
        severity="info"
        action={(
          <Button
            color="primary"
            variant="contained"
            size="small"
            onClick={async () => {
              await deferredPrompt.prompt();
              const choiceResult = await deferredPrompt.userChoice;

              // Note for non-coders: if users close the browser install popup, we keep showing this card for later.
              if (choiceResult.outcome === "accepted") {
                setDeferredPrompt(null);
                setIsInstalled(true);
              }
            }}
          >
            Installera
          </Button>
        )}
      >
        <AlertTitle>Installera appen</AlertTitle>
        Lägg till appen på hemskärmen för snabbare åtkomst och en mer app-lik upplevelse.
      </Alert>
    );
  }

  if (showIosInstructions) {
    return (
      <Alert severity="info">
        <AlertTitle>Installera på iPhone/iPad</AlertTitle>
        <Typography variant="body2" component="div">
          Safari stödjer inte den automatiska installationsknappen. Gör så här:
        </Typography>
        <Box component="ol" sx={{ mt: 1, mb: 0, pl: 2.5 }}>
          <Typography component="li" variant="body2" sx={{ display: "list-item" }}>
            Tryck på Dela <IosShareIcon sx={{ fontSize: 16, verticalAlign: "text-bottom" }} />.
          </Typography>
          <Typography component="li" variant="body2" sx={{ display: "list-item" }}>
            Välj Lägg till på hemskärmen <AddBoxOutlinedIcon sx={{ fontSize: 16, verticalAlign: "text-bottom" }} />.
          </Typography>
        </Box>
      </Alert>
    );
  }

  return null;
}
