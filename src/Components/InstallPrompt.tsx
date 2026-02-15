import React, { useEffect, useMemo, useState } from "react";
import { Alert, AlertTitle, Box, Button, Stack, Typography } from "@mui/material";
import IosShareIcon from "@mui/icons-material/IosShare";
import AddBoxOutlinedIcon from "@mui/icons-material/AddBoxOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { useStore } from "../store/useStore";
import { getInstallGuidanceContext, INSTALL_GUIDANCE_COPY, detectStandaloneInstallState } from "../shared/installGuidance";
import {
  getInstallPromptVisibility,
  hasActiveInstallPromptSnooze,
  INSTALL_PROMPT_CONFIG,
} from "./installPromptConfig";
import { recordInstallCtaEvent, requestOpenPermissionGuide } from "../services/permissionGuidanceService";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export default function InstallPrompt() {
  const isGuest = useStore((state) => state.isGuest);
  const platformIntent = useMemo(() => getInstallGuidanceContext().platformIntent, []);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isSnoozed, setIsSnoozed] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);

  const visibility = useMemo(
    () => getInstallPromptVisibility({
      platformIntent,
      isGuest,
      sessionCount,
      hasActiveSnooze: isSnoozed,
      isInstalled,
      hasDeferredPrompt: deferredPrompt !== null,
    }),
    [deferredPrompt, isGuest, isInstalled, isSnoozed, platformIntent, sessionCount]
  );

  const snoozeInstallPrompt = () => {
    const nextVisibleAt = Date.now() + INSTALL_PROMPT_CONFIG.snoozeDurationMs;
    localStorage.setItem(INSTALL_PROMPT_CONFIG.storage.snoozeUntilKey, String(nextVisibleAt));
    setIsSnoozed(true);
  };

  useEffect(() => {
    setIsInstalled(detectStandaloneInstallState());

    const snoozeUntilRaw = localStorage.getItem(INSTALL_PROMPT_CONFIG.storage.snoozeUntilKey);
    setIsSnoozed(hasActiveInstallPromptSnooze(snoozeUntilRaw));

    // Note for non-coders: this session counter helps us avoid nagging every single visit.
    const nextSessionCount = Number(localStorage.getItem(INSTALL_PROMPT_CONFIG.storage.sessionCountKey) ?? "0") + 1;
    localStorage.setItem(INSTALL_PROMPT_CONFIG.storage.sessionCountKey, String(nextSessionCount));
    setSessionCount(nextSessionCount);

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
      setIsInstalled(detectStandaloneInstallState());
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

  if (visibility.showBrowserInstallPrompt && deferredPrompt) {
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
              recordInstallCtaEvent({
                surface: "install_prompt",
                cta: "browser_install_button",
                promptType: "browser_prompt",
                platformIntent,
                result: choiceResult.outcome,
              });

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
        <AlertTitle>{INSTALL_GUIDANCE_COPY.browserTitle}</AlertTitle>
        {INSTALL_GUIDANCE_COPY.valueProposition}
        <Button
          color="inherit"
          size="small"
          sx={{ mt: 1 }}
          onClick={() => {
            recordInstallCtaEvent({
              surface: "install_prompt",
              cta: "snooze",
              promptType: "browser_prompt",
              platformIntent,
            });
            snoozeInstallPrompt();
          }}
        >
          {INSTALL_GUIDANCE_COPY.cadenceLabels.snooze}
        </Button>
        <Button
          color="inherit"
          size="small"
          sx={{ mt: 1, ml: 1 }}
          onClick={() => {
            recordInstallCtaEvent({
              surface: "install_prompt",
              cta: "open_permission_guide",
              promptType: "browser_prompt",
              platformIntent,
            });
            requestOpenPermissionGuide("install_prompt");
          }}
        >
          Behörighetshjälp
        </Button>
      </Alert>
    );
  }

  if (visibility.showIosInstallInstructions) {
    return (
      <Alert
        severity="info"
        action={(
        <Button color="inherit" size="small" onClick={() => {
          recordInstallCtaEvent({
            surface: "install_prompt",
            cta: "snooze",
            promptType: "ios_manual",
            platformIntent,
          });
          snoozeInstallPrompt();
        }}>
          {INSTALL_GUIDANCE_COPY.cadenceLabels.snooze}
        </Button>
      )}
      >
        <AlertTitle>{INSTALL_GUIDANCE_COPY.iosTitle}</AlertTitle>
        <Typography variant="body2" component="div" sx={{ mb: 0.75 }}>
          {INSTALL_GUIDANCE_COPY.valueProposition}
        </Typography>
        <Typography variant="body2" component="div">
          {INSTALL_GUIDANCE_COPY.iosManualIntro}
        </Typography>
        <Box component="ol" sx={{ mt: 1, mb: 0, pl: 2.5 }}>
          <Typography component="li" variant="body2" sx={{ display: "list-item" }}>
            {INSTALL_GUIDANCE_COPY.iosManualSteps[0]} <IosShareIcon sx={{ fontSize: 16, verticalAlign: "text-bottom" }} />.
          </Typography>
          <Typography component="li" variant="body2" sx={{ display: "list-item" }}>
            {INSTALL_GUIDANCE_COPY.iosManualSteps[1]} <AddBoxOutlinedIcon sx={{ fontSize: 16, verticalAlign: "text-bottom" }} />.
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
        <Button color="inherit" size="small" sx={{ mt: 1 }} onClick={() => {
          recordInstallCtaEvent({
            surface: "install_prompt",
            cta: "open_permission_guide",
            promptType: "ios_manual",
            platformIntent,
          });
          requestOpenPermissionGuide("install_prompt");
        }}>
          Behörighetshjälp
        </Button>
      </Alert>
    );
  }

  return null;
}
