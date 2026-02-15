import { describe, expect, it } from "vitest";
import {
  getInstallPromptVisibility,
  hasActiveInstallPromptSnooze,
  INSTALL_PROMPT_CONFIG,
} from "./installPromptConfig";

describe("getInstallPromptVisibility", () => {
  it("shows iOS manual install instructions on first visit without snooze", () => {
    const visibility = getInstallPromptVisibility({
      platformIntent: "ios_safari",
      isGuest: false,
      sessionCount: 1,
      hasActiveSnooze: false,
      isInstalled: false,
      hasDeferredPrompt: false,
    });

    expect(visibility).toEqual({
      showBrowserInstallPrompt: false,
      showIosInstallInstructions: true,
    });
  });

  it("hides iOS instructions when session cadence is between first and repeat visits", () => {
    const visibility = getInstallPromptVisibility({
      platformIntent: "ios_safari",
      isGuest: false,
      sessionCount: 2,
      hasActiveSnooze: false,
      isInstalled: false,
      hasDeferredPrompt: false,
    });

    // Note for non-coders: this is a quiet period to avoid repeating the same hint too often.
    expect(visibility.showIosInstallInstructions).toBe(false);
  });

  it("shows iOS instructions again after repeat-session threshold", () => {
    const visibility = getInstallPromptVisibility({
      platformIntent: "ios_safari",
      isGuest: false,
      sessionCount: INSTALL_PROMPT_CONFIG.repeatedSessionThreshold,
      hasActiveSnooze: false,
      isInstalled: false,
      hasDeferredPrompt: false,
    });

    expect(visibility.showIosInstallInstructions).toBe(true);
  });

  it("hides all prompts while snooze is active", () => {
    const visibility = getInstallPromptVisibility({
      platformIntent: "ios_safari",
      isGuest: true,
      sessionCount: 1,
      hasActiveSnooze: true,
      isInstalled: false,
      hasDeferredPrompt: true,
    });

    expect(visibility).toEqual({
      showBrowserInstallPrompt: false,
      showIosInstallInstructions: false,
    });
  });
});

describe("hasActiveInstallPromptSnooze", () => {
  it("returns true when snooze timestamp is in the future", () => {
    const now = 1_000;
    expect(hasActiveInstallPromptSnooze("2000", now)).toBe(true);
  });

  it("returns false when snooze timestamp is missing or expired", () => {
    const now = 1_000;
    expect(hasActiveInstallPromptSnooze(null, now)).toBe(false);
    expect(hasActiveInstallPromptSnooze("1000", now)).toBe(false);
  });
});
