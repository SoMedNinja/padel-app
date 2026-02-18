import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { buildWebPermissionSnapshots } from "./webNotificationService";

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
