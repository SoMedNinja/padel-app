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

export interface NotificationEventPayload {
  eventType: NotificationEventType;
  title: string;
  body: string;
  route?: string;
  metadata?: Record<string, string>;
  sentAtIso?: string;
}
