import { PlatformIntent, getPlatformIntent } from "../utils/platform";

export type InstallPromptType = "browser_prompt" | "ios_manual" | "none";

export const INSTALL_GUIDANCE_COPY = {
  browserTitle: "Installera appen",
  iosTitle: "Installera på iPhone/iPad",
  valueProposition: "Lägg till appen på hemskärmen för snabbare åtkomst och en mer app-lik upplevelse.",
  iosManualIntro: "Safari stödjer inte den automatiska installationsknappen. Gör så här:",
  iosManualSteps: ["Tryck på Dela", "Välj Lägg till på hemskärmen"],
  cadenceLabels: {
    snooze: "Påminn mig om 7 dagar",
  },
  permissionGuideInstallLabel: "Installera på hemskärmen",
} as const;

export interface InstallGuidanceEligibilityInput {
  platformIntent: PlatformIntent;
  isGuest: boolean;
  sessionCount: number;
  hasActiveSnooze: boolean;
  isInstalled: boolean;
  hasDeferredPrompt: boolean;
  repeatedSessionThreshold: number;
}

export interface InstallGuidanceVisibility {
  showBrowserInstallPrompt: boolean;
  showIosInstallInstructions: boolean;
  promptType: InstallPromptType;
}

export function detectStandaloneInstallState(): boolean {
  if (typeof window === "undefined") return false;

  const inDisplayMode = window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

  // Note for non-coders: if either check is true, the app is already installed so we should not ask again.
  return inDisplayMode || iosStandalone;
}

export function getInstallGuidanceVisibility({
  platformIntent,
  isGuest,
  sessionCount,
  hasActiveSnooze,
  isInstalled,
  hasDeferredPrompt,
  repeatedSessionThreshold,
}: InstallGuidanceEligibilityInput): InstallGuidanceVisibility {
  if (isInstalled || hasActiveSnooze) {
    return { showBrowserInstallPrompt: false, showIosInstallInstructions: false, promptType: "none" };
  }

  if (hasDeferredPrompt) {
    return { showBrowserInstallPrompt: true, showIosInstallInstructions: false, promptType: "browser_prompt" };
  }

  const isFirstVisit = sessionCount <= 1;
  const hasRepeatedSessions = sessionCount >= repeatedSessionThreshold;
  const cadenceAllowsPrompt = isGuest || isFirstVisit || hasRepeatedSessions;

  if (platformIntent === "ios_safari" && cadenceAllowsPrompt) {
    return { showBrowserInstallPrompt: false, showIosInstallInstructions: true, promptType: "ios_manual" };
  }

  return { showBrowserInstallPrompt: false, showIosInstallInstructions: false, promptType: "none" };
}

export function getInstallGuidanceMessage(platformIntent: PlatformIntent): string {
  if (platformIntent === "ios_safari") {
    return "Öppna Safaris delningsmeny och välj \"Lägg till på hemskärmen\" så fungerar push och bakgrundsuppdatering stabilare.";
  }

  return "Installera appen från webbläsarens meny så den fungerar mer som en vanlig mobilapp.";
}

export function getInstallGuidanceContext() {
  const platformIntent = getPlatformIntent();
  const isStandalone = detectStandaloneInstallState();

  return {
    platformIntent,
    isStandalone,
    installHelpText: getInstallGuidanceMessage(platformIntent),
  };
}
