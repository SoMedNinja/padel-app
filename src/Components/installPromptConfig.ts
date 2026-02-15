import { PlatformIntent } from "../utils/platform";
import { getInstallGuidanceVisibility } from "../shared/installGuidance";

export const INSTALL_PROMPT_CONFIG = {
  storage: {
    snoozeUntilKey: "install-prompt-snooze-until",
    sessionCountKey: "install-prompt-session-count",
  },
  snoozeDurationMs: 7 * 24 * 60 * 60 * 1000,
  repeatedSessionThreshold: 3,
};

export const getSessionCadence = (sessionCount: number) => ({
  isFirstVisit: sessionCount <= 1,
  hasRepeatedSessions: sessionCount >= INSTALL_PROMPT_CONFIG.repeatedSessionThreshold,
});

export const hasActiveInstallPromptSnooze = (snoozeUntilRaw: string | null, now = Date.now()) => {
  const snoozeUntil = snoozeUntilRaw ? Number(snoozeUntilRaw) : 0;
  return Number.isFinite(snoozeUntil) && snoozeUntil > now;
};

interface InstallPromptVisibilityInput {
  platformIntent: PlatformIntent;
  isGuest: boolean;
  sessionCount: number;
  hasActiveSnooze: boolean;
  isInstalled: boolean;
  hasDeferredPrompt: boolean;
}

export const getInstallPromptVisibility = ({
  platformIntent,
  isGuest,
  sessionCount,
  hasActiveSnooze,
  isInstalled,
  hasDeferredPrompt,
}: InstallPromptVisibilityInput) => {
  const visibility = getInstallGuidanceVisibility({
    platformIntent,
    isGuest,
    sessionCount,
    hasActiveSnooze,
    isInstalled,
    hasDeferredPrompt,
    repeatedSessionThreshold: INSTALL_PROMPT_CONFIG.repeatedSessionThreshold,
  });

  return {
    showBrowserInstallPrompt: visibility.showBrowserInstallPrompt,
    showIosInstallInstructions: visibility.showIosInstallInstructions,
  };
};
