// Note for non-coders:
// These are the three notification "event types" that both web and iOS understand.
// Keeping one shared list avoids mismatches between clients and backend payloads.
export const NOTIFICATION_EVENT_TYPES = [
  "scheduled_match_new",
  "availability_poll_reminder",
  "admin_announcement",
] as const;

export type NotificationEventType = (typeof NOTIFICATION_EVENT_TYPES)[number];

export type NotificationChannelPreferences = Record<NotificationEventType, boolean>;

export interface QuietHoursWindow {
  enabled: boolean;
  startHour: number;
  endHour: number;
}

export interface NotificationPreferences {
  // Master switch for all notifications in this client.
  enabled: boolean;
  // Per-event switches so users can mute only certain categories.
  eventToggles: NotificationChannelPreferences;
  // Quiet hours suppress delivery during sleeping/focus time.
  quietHours: QuietHoursWindow;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabled: true,
  eventToggles: {
    scheduled_match_new: true,
    availability_poll_reminder: true,
    admin_announcement: true,
  },
  quietHours: {
    enabled: false,
    startHour: 22,
    endHour: 7,
  },
};

// Note for non-coders:
// This is the canonical persistence shape used in `notification_preferences.preferences` on both clients.
// We always write this exact key set so older or partial payloads cannot corrupt shared settings.
export function normalizeNotificationPreferencesForPersistence(raw: unknown): NotificationPreferences {
  const defaults = DEFAULT_NOTIFICATION_PREFERENCES;
  const candidate = isRecord(raw) ? raw : {};
  const quietCandidate = isRecord(candidate.quietHours) ? candidate.quietHours : {};
  const eventCandidate = isRecord(candidate.eventToggles) ? candidate.eventToggles : {};

  const eventToggles = NOTIFICATION_EVENT_TYPES.reduce((acc, eventType) => {
    acc[eventType] = asBoolean(eventCandidate[eventType], defaults.eventToggles[eventType]);
    return acc;
  }, {} as NotificationChannelPreferences);

  return {
    enabled: asBoolean(candidate.enabled, defaults.enabled),
    eventToggles,
    quietHours: {
      enabled: asBoolean(quietCandidate.enabled, defaults.quietHours.enabled),
      startHour: asHour(quietCandidate.startHour, defaults.quietHours.startHour),
      endHour: asHour(quietCandidate.endHour, defaults.quietHours.endHour),
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function asHour(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 23 ? value : fallback;
}

export interface NotificationEventPayload {
  eventType: NotificationEventType;
  title: string;
  body: string;
  route?: string;
  metadata?: Record<string, string>;
  sentAtIso?: string;
}
