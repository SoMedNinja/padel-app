import { PlatformIntent } from "../utils/platform";

export const INSTALL_PROMPT_CONFIG = {
  storage: {
    snoozeUntilKey: "install-prompt-snooze-until",
    sessionCountKey: "install-prompt-session-count",
  },
  snoozeDurationMs: 7 * 24 * 60 * 60 * 1000,
  repeatedSessionThreshold: 3,
  copy: {
    browserTitle: "Installera appen",
    iosTitle: "Installera på iPhone/iPad",
    valueProposition: "Lägg till appen på hemskärmen för snabbare åtkomst och en mer app-lik upplevelse.",
    iosManualIntro: "Safari stödjer inte den automatiska installationsknappen. Gör så här:",
    iosManualSteps: [
      "Tryck på Dela",
      "Välj Lägg till på hemskärmen",
    ],
    cadenceLabels: {
      snooze: "Påminn mig om 7 dagar",
    },
  },
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
  if (isInstalled || hasActiveSnooze) {
    return { showBrowserInstallPrompt: false, showIosInstallInstructions: false };
  }

  if (hasDeferredPrompt) {
    return { showBrowserInstallPrompt: true, showIosInstallInstructions: false };
  }

  const { isFirstVisit, hasRepeatedSessions } = getSessionCadence(sessionCount);
  const cadenceAllowsPrompt = isGuest || isFirstVisit || hasRepeatedSessions;

  // Note for non-coders: we only show iPhone manual steps when the user's visit cadence says "this is a good moment".
  const showIosInstallInstructions = platformIntent === "ios_safari" && cadenceAllowsPrompt;

  return {
    showBrowserInstallPrompt: false,
    showIosInstallInstructions,
  };
};
