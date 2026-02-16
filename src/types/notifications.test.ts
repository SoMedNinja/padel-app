import { describe, expect, it } from "vitest";
import { DEFAULT_NOTIFICATION_PREFERENCES, normalizeNotificationPreferencesForPersistence } from "./notifications";

describe("normalizeNotificationPreferencesForPersistence", () => {
  it("fills missing keys from old rows and preserves canonical JSON shape", () => {
    const normalized = normalizeNotificationPreferencesForPersistence({
      eventToggles: {
        scheduled_match_new: false,
      },
      quietHours: {
        enabled: true,
      },
    });

    expect(normalized).toEqual({
      enabled: true,
      eventToggles: {
        scheduled_match_new: false,
        match_result_new: true,
        availability_poll_reminder: true,
        admin_announcement: true,
      },
      quietHours: {
        enabled: true,
        startHour: 22,
        endHour: 7,
      },
    });

    expect(Object.keys(normalized)).toEqual(["enabled", "eventToggles", "quietHours"]);
    expect(Object.keys(normalized.eventToggles)).toEqual([
      "scheduled_match_new",
      "match_result_new",
      "availability_poll_reminder",
      "admin_announcement",
    ]);
  });

  it("ignores invalid scalar values and falls back safely", () => {
    const normalized = normalizeNotificationPreferencesForPersistence({
      enabled: "yes",
      eventToggles: {
        admin_announcement: "true",
      },
      quietHours: {
        startHour: 99,
        endHour: -1,
      },
    });

    expect(normalized).toEqual(DEFAULT_NOTIFICATION_PREFERENCES);
  });
});
