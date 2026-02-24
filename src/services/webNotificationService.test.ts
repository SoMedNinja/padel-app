import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { buildWebPermissionSnapshots, isQuietHoursActive, canDeliverEvent } from "./webNotificationService";
import { NotificationPreferences, DEFAULT_NOTIFICATION_PREFERENCES, NotificationEventPayload } from "../types/notifications";

// Mock globals for browser APIs
const mockMatchMedia = vi.fn();
const mockServiceWorker = {
  getRegistration: vi.fn(),
  ready: Promise.resolve({
    pushManager: {
      getSubscription: vi.fn().mockResolvedValue(null),
    },
    active: {},
  }),
};
const mockNotification = {
  permission: "default",
  requestPermission: vi.fn(),
};
const mockPublicKeyCredential = {
  isUserVerifyingPlatformAuthenticatorAvailable: vi.fn().mockResolvedValue(false),
};

describe("webNotificationService", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {
      isSecureContext: true,
      matchMedia: mockMatchMedia,
      Notification: mockNotification,
      PushManager: {},
      PublicKeyCredential: mockPublicKeyCredential,
      SyncManager: {}, // for background sync check
    });
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36",
      serviceWorker: mockServiceWorker,
      standalone: false, // for iOS standalone check
    });
    vi.stubGlobal("Notification", mockNotification);
    vi.stubGlobal("PublicKeyCredential", mockPublicKeyCredential);

    mockMatchMedia.mockReturnValue({ matches: false });
    mockServiceWorker.getRegistration.mockResolvedValue({ active: {} });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("buildWebPermissionSnapshots", () => {
    it("returns correct snapshots when everything is supported but not granted", async () => {
      mockNotification.permission = "default";
      const snapshots = await buildWebPermissionSnapshots();

      expect(snapshots).toHaveLength(4);
      const notifications = snapshots.find((s) => s.capability === "notifications");
      expect(notifications?.state).toBe("action_needed");

      const bgRefresh = snapshots.find((s) => s.capability === "background_refresh");
      expect(bgRefresh?.state).toBe("allowed"); // swReady is mocked to be true via getRegistration returning object

      const biometrics = snapshots.find((s) => s.capability === "biometric_passkey");
      expect(biometrics?.state).toBe("limited"); // platform auth mocked false
    });

    it("returns allowed for notifications when granted and push endpoint exists", async () => {
      mockNotification.permission = "granted";
      // We need to ensure logic uses the mocked ready promise
      const mockReady = Promise.resolve({
        pushManager: {
          getSubscription: vi.fn().mockResolvedValue({ endpoint: "test" }),
        },
        active: {},
      });

      // Override the navigator mock specifically for this test
      vi.stubGlobal("navigator", {
          userAgent: "Mozilla/5.0",
          serviceWorker: {
              ...mockServiceWorker,
              ready: mockReady
          },
          standalone: false
      });

      const snapshots = await buildWebPermissionSnapshots();
      const notifications = snapshots.find((s) => s.capability === "notifications");
      expect(notifications?.state).toBe("allowed");
    });

    it("handles blocked notifications", async () => {
      mockNotification.permission = "denied";
      const snapshots = await buildWebPermissionSnapshots();
      const notifications = snapshots.find((s) => s.capability === "notifications");
      expect(notifications?.state).toBe("blocked");
    });

    it("handles limited environment (insecure context)", async () => {
      vi.stubGlobal("window", {
        isSecureContext: false,
        matchMedia: mockMatchMedia,
      });

      const snapshots = await buildWebPermissionSnapshots();

      const notifications = snapshots.find((s) => s.capability === "notifications");
      expect(notifications?.state).toBe("limited");

      const bgRefresh = snapshots.find((s) => s.capability === "background_refresh");
      expect(bgRefresh?.state).toBe("limited");
    });
  });

  describe("isQuietHoursActive", () => {
    const createPreferences = (startHour: number, endHour: number, enabled = true): NotificationPreferences => ({
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      quietHours: {
        enabled,
        startHour,
        endHour,
      },
    });

    const createDateAtHour = (hour: number): Date => {
      const date = new Date();
      date.setHours(hour, 0, 0, 0);
      return date;
    };

    it("returns false if quiet hours are disabled", () => {
      const prefs = createPreferences(22, 7, false);
      const now = createDateAtHour(23); // Inside typical quiet hours
      expect(isQuietHoursActive(prefs, now)).toBe(false);
    });

    it("returns true if startHour equals endHour (all day quiet)", () => {
      const prefs = createPreferences(10, 10);
      const now = createDateAtHour(15);
      expect(isQuietHoursActive(prefs, now)).toBe(true);
    });

    describe("same day window (e.g., 09:00 to 17:00)", () => {
      const prefs = createPreferences(9, 17);

      it("returns true when time is within window", () => {
        expect(isQuietHoursActive(prefs, createDateAtHour(10))).toBe(true);
        expect(isQuietHoursActive(prefs, createDateAtHour(16))).toBe(true);
      });

      it("returns true inclusive of start hour", () => {
        expect(isQuietHoursActive(prefs, createDateAtHour(9))).toBe(true);
      });

      it("returns false at end hour", () => {
        expect(isQuietHoursActive(prefs, createDateAtHour(17))).toBe(false);
      });

      it("returns false when time is outside window", () => {
        expect(isQuietHoursActive(prefs, createDateAtHour(8))).toBe(false);
        expect(isQuietHoursActive(prefs, createDateAtHour(18))).toBe(false);
      });
    });

    describe("overnight window (e.g., 22:00 to 07:00)", () => {
      const prefs = createPreferences(22, 7);

      it("returns true before midnight", () => {
        expect(isQuietHoursActive(prefs, createDateAtHour(23))).toBe(true);
      });

      it("returns true inclusive of start hour", () => {
        expect(isQuietHoursActive(prefs, createDateAtHour(22))).toBe(true);
      });

      it("returns true after midnight", () => {
        expect(isQuietHoursActive(prefs, createDateAtHour(2))).toBe(true);
        expect(isQuietHoursActive(prefs, createDateAtHour(6))).toBe(true);
      });

      it("returns false at end hour", () => {
        expect(isQuietHoursActive(prefs, createDateAtHour(7))).toBe(false);
      });

      it("returns false when time is outside window", () => {
        expect(isQuietHoursActive(prefs, createDateAtHour(12))).toBe(false);
        expect(isQuietHoursActive(prefs, createDateAtHour(21))).toBe(false);
      });
    });
  });

  describe("canDeliverEvent", () => {
    const mockPayload: NotificationEventPayload = {
      eventType: "scheduled_match_new",
      title: "Test",
      body: "Test body",
    };

    it("returns false if global notifications are disabled", () => {
      const prefs: NotificationPreferences = {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        enabled: false,
      };
      expect(canDeliverEvent(mockPayload, prefs)).toBe(false);
    });

    it("returns false if specific event type is disabled", () => {
      const prefs: NotificationPreferences = {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        eventToggles: {
          ...DEFAULT_NOTIFICATION_PREFERENCES.eventToggles,
          scheduled_match_new: false,
        },
      };
      expect(canDeliverEvent(mockPayload, prefs)).toBe(false);
    });

    it("returns false if quiet hours are active", () => {
      // Mock Date to ensure isQuietHoursActive returns true
      // Or rely on isQuietHoursActive logic by setting appropriate hours
      // Since isQuietHoursActive creates `new Date()` internally if not provided,
      // we can't easily mock `now` inside `canDeliverEvent` unless we mock `Date` constructor or pass `now`.
      // `canDeliverEvent` calls `isQuietHoursActive(preferences)`.
      // `isQuietHoursActive` defaults `now` to `new Date()`.

      // Let's rely on setting quiet hours to cover current time.
      const nowHour = new Date().getHours();
      const prefs: NotificationPreferences = {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        quietHours: {
          enabled: true,
          startHour: nowHour, // Starts now
          endHour: (nowHour + 1) % 24, // Ends later (or wraps)
        },
      };

      // If start == end, it's always true, which is simpler
      const alwaysQuietPrefs: NotificationPreferences = {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        quietHours: {
            enabled: true,
            startHour: 10,
            endHour: 10,
        }
      };

      expect(canDeliverEvent(mockPayload, alwaysQuietPrefs)).toBe(false);
    });

    it("returns true if all conditions are met", () => {
        // Ensure quiet hours are NOT active
        const nowHour = new Date().getHours();
        // Set quiet hours to be a 1-hour window 12 hours away
        const safeStartHour = (nowHour + 12) % 24;
        const safeEndHour = (safeStartHour + 1) % 24;

        const prefs: NotificationPreferences = {
            ...DEFAULT_NOTIFICATION_PREFERENCES,
            quietHours: {
                enabled: true,
                startHour: safeStartHour,
                endHour: safeEndHour
            }
        };

        expect(canDeliverEvent(mockPayload, prefs)).toBe(true);
    });

    it("returns true if quiet hours are disabled regardless of time", () => {
        const prefs: NotificationPreferences = {
            ...DEFAULT_NOTIFICATION_PREFERENCES,
            quietHours: {
                enabled: false,
                startHour: 0,
                endHour: 0 // Would be active if enabled
            }
        };
        expect(canDeliverEvent(mockPayload, prefs)).toBe(true);
    });
  });
});
