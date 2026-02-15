import React, { useEffect, useMemo, useState } from "react";
import { Alert, AlertTitle, Box, Button, Stack, Typography } from "@mui/material";
import IosShareIcon from "@mui/icons-material/IosShare";
import AddBoxOutlinedIcon from "@mui/icons-material/AddBoxOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { useStore } from "../store/useStore";
import { isIosSafariBrowser } from "../utils/platform";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const INSTALL_PROMPT_SNOOZE_UNTIL_KEY = "install-prompt-snooze-until";
const INSTALL_PROMPT_SESSIONS_KEY = "install-prompt-session-count";
const SNOOZE_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const REPEATED_SESSION_THRESHOLD = 3;

const isRunningStandalone = () => {
  if (typeof window === "undefined") return false;

  const inDisplayMode = window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

  // Note for non-coders: if either check is true, the app is already installed, so we hide this prompt.
  return inDisplayMode || iosStandalone;
};

export default function InstallPrompt() {
  const isGuest = useStore((state) => state.isGuest);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isSnoozed, setIsSnoozed] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState(false);
  const [hasRepeatedSessions, setHasRepeatedSessions] = useState(false);

  const showIosInstructions = useMemo(
    () => isIosSafariBrowser() && (isGuest || isFirstVisit || hasRepeatedSessions),
    [hasRepeatedSessions, isFirstVisit, isGuest]
  );

  const snoozeInstallPrompt = () => {
    const nextVisibleAt = Date.now() + SNOOZE_DURATION_MS;
    localStorage.setItem(INSTALL_PROMPT_SNOOZE_UNTIL_KEY, String(nextVisibleAt));
    setIsSnoozed(true);
  };

  useEffect(() => {
    setIsInstalled(isRunningStandalone());

    const now = Date.now();
    const snoozeUntilRaw = localStorage.getItem(INSTALL_PROMPT_SNOOZE_UNTIL_KEY);
    const snoozeUntil = snoozeUntilRaw ? Number(snoozeUntilRaw) : 0;
    const hasActiveSnooze = Number.isFinite(snoozeUntil) && snoozeUntil > now;
    setIsSnoozed(hasActiveSnooze);

    // Note for non-coders: this session counter helps us avoid nagging every single visit.
    const sessionCount = Number(localStorage.getItem(INSTALL_PROMPT_SESSIONS_KEY) ?? "0") + 1;
    localStorage.setItem(INSTALL_PROMPT_SESSIONS_KEY, String(sessionCount));
    setIsFirstVisit(sessionCount <= 1);
    setHasRepeatedSessions(sessionCount >= REPEATED_SESSION_THRESHOLD);

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

  if (isSnoozed) {
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

              if (choiceResult.outcome === "accepted") {
                setDeferredPrompt(null);
                setIsInstalled(true);
              } else {
                // Note for non-coders: when users dismiss install, we pause this reminder for a week.
                snoozeInstallPrompt();
              }
            }}
          >
            Installera
          </Button>
        )}
      >
        <AlertTitle>Installera appen</AlertTitle>
        Lägg till appen på hemskärmen för snabbare åtkomst och en mer app-lik upplevelse.
        <Button
          color="inherit"
          size="small"
          sx={{ mt: 1 }}
          onClick={snoozeInstallPrompt}
        >
          Påminn mig om 7 dagar
        </Button>
      </Alert>
    );
  }

  if (showIosInstructions) {
    return (
      <Alert
        severity="info"
        action={(
          <Button color="inherit" size="small" onClick={snoozeInstallPrompt}>
            Senare
          </Button>
        )}
      >
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
        <Box
          sx={{
            mt: 1.5,
            px: 1,
            py: 0.75,
            borderRadius: 1,
            border: "1px dashed",
            borderColor: "info.main",
          }}
        >
          <Typography variant="caption" sx={{ display: "block", mb: 0.5 }}>
            Mini-guide: dela-menyn till hemskärm
          </Typography>
          <Stack direction="row" alignItems="center" spacing={0.75}>
            <IosShareIcon sx={{ fontSize: 18 }} />
            <ArrowForwardIcon sx={{ fontSize: 14, opacity: 0.7 }} />
            <AddBoxOutlinedIcon sx={{ fontSize: 18 }} />
          </Stack>
        </Box>
      </Alert>
    );
  }

  return null;
}
