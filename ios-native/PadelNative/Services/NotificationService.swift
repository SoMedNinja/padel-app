import Foundation
import UserNotifications
import UIKit

enum NotificationEventType: String, CaseIterable {
    case scheduledMatchNew = "scheduled_match_new"
    case availabilityPollReminder = "availability_poll_reminder"
    case adminAnnouncement = "admin_announcement"
}

struct NotificationQuietHours: Codable {
    var enabled: Bool
    var startHour: Int
    var endHour: Int

    static let `default` = NotificationQuietHours(enabled: false, startHour: 22, endHour: 7)
}

struct NotificationPreferences: Codable {
    var enabled: Bool
    var eventToggles: [String: Bool]
    var quietHours: NotificationQuietHours

    static let `default` = NotificationPreferences(
        enabled: true,
        eventToggles: [
            NotificationEventType.scheduledMatchNew.rawValue: true,
            NotificationEventType.availabilityPollReminder.rawValue: true,
            NotificationEventType.adminAnnouncement.rawValue: true,
        ],
        quietHours: .default
    )

    // Note for non-coders:
    // This helper answers "is this event allowed right now?" using the user's switches and quiet hours.
    func allows(eventType: NotificationEventType, now: Date = .now) -> Bool {
        guard enabled else { return false }
        guard eventToggles[eventType.rawValue, default: true] else { return false }
        return !quietHours.isActive(at: now)
    }
}

extension NotificationQuietHours {
    func isActive(at date: Date = .now) -> Bool {
        guard enabled else { return false }

        let hour = Calendar.current.component(.hour, from: date)
        if startHour == endHour { return true }
        if startHour < endHour {
            return hour >= startHour && hour < endHour
        }
        return hour >= startHour || hour < endHour
    }

    func adjustedDeliveryDate(for candidateDate: Date, calendar: Calendar = .current) -> Date {
        guard isActive(at: candidateDate) else { return candidateDate }

        let components = calendar.dateComponents([.year, .month, .day], from: candidateDate)
        guard var dayStart = calendar.date(from: components) else { return candidateDate }

        if startHour > endHour {
            if calendar.component(.hour, from: candidateDate) >= startHour {
                dayStart = calendar.date(byAdding: .day, value: 1, to: dayStart) ?? dayStart
            }
        }

        return calendar.date(byAdding: .hour, value: endHour, to: dayStart) ?? candidateDate
    }
}

struct NotificationService {
    private let center = UNUserNotificationCenter.current()
    private let schedulePrefix = "schedule.upcoming."
    private let notificationPreferencesKey = "settings.notificationPreferences"
    private let apiClient: SupabaseRESTClient

    init(apiClient: SupabaseRESTClient = SupabaseRESTClient()) {
        self.apiClient = apiClient
    }

    // Note for non-coders:
    // This asks iOS for notification permission once. Users can change this later in Settings.
    func requestAuthorization() async throws -> Bool {
        try await center.requestAuthorization(options: [.alert, .sound, .badge])
    }

    func currentStatus() async -> UNAuthorizationStatus {
        let settings = await center.notificationSettings()
        return settings.authorizationStatus
    }

    // Note for non-coders:
    // APNs registration gives iOS a channel for remote push notifications.
    func registerForRemoteNotifications() {
        UIApplication.shared.registerForRemoteNotifications()
    }

    func saveNotificationPreferences(_ preferences: NotificationPreferences, store: UserDefaults = .standard) {
        if let data = try? JSONEncoder().encode(preferences) {
            store.set(data, forKey: notificationPreferencesKey)
        }
    }

    func loadNotificationPreferences(store: UserDefaults = .standard) -> NotificationPreferences {
        guard
            let data = store.data(forKey: notificationPreferencesKey),
            let decoded = try? JSONDecoder().decode(NotificationPreferences.self, from: data)
        else {
            return .default
        }

        return mergePreferences(decoded)
    }


    private func hasStoredLocalPreferences(store: UserDefaults) -> Bool {
        store.data(forKey: notificationPreferencesKey) != nil
    }

    // Note for non-coders:
    // After sign-in we fetch backend notification settings; local UserDefaults remains an offline safety copy.
    func loadNotificationPreferencesWithSync(profileId: UUID?, store: UserDefaults = .standard) async -> NotificationPreferences {
        let localPreferences = loadNotificationPreferences(store: store)

        guard let profileId else {
            return localPreferences
        }

        do {
            if let backendPreferences = try await apiClient.fetchNotificationPreferences(profileId: profileId) {
                let merged = mergePreferences(backendPreferences)
                saveNotificationPreferences(merged, store: store)
                return merged
            }

            if hasStoredLocalPreferences(store: store) {
                try await apiClient.upsertNotificationPreferences(profileId: profileId, preferences: localPreferences)
                return localPreferences
            }

            try await apiClient.upsertNotificationPreferences(profileId: profileId, preferences: localPreferences)
            return localPreferences
        } catch {
            return localPreferences
        }
    }

    // Note for non-coders:
    // Saving writes locally first (works offline), then syncs to backend when possible.
    func saveNotificationPreferencesWithSync(_ preferences: NotificationPreferences, profileId: UUID?, store: UserDefaults = .standard) async {
        saveNotificationPreferences(preferences, store: store)

        guard let profileId else {
            return
        }

        do {
            try await apiClient.upsertNotificationPreferences(profileId: profileId, preferences: preferences)
        } catch {
            // Keep local copy as fallback if backend call fails.
        }
    }

    private func mergePreferences(_ decoded: NotificationPreferences) -> NotificationPreferences {
        var merged = NotificationPreferences.default
        merged.enabled = decoded.enabled
        merged.quietHours = decoded.quietHours
        merged.eventToggles.merge(decoded.eventToggles) { _, new in new }
        return merged
    }

    func eventType(from userInfo: [AnyHashable: Any]) -> NotificationEventType? {
        guard let rawType = userInfo["eventType"] as? String else { return nil }
        return NotificationEventType(rawValue: rawType)
    }

    func shouldDeliverRemoteNotification(userInfo: [AnyHashable: Any], preferences: NotificationPreferences) -> Bool {
        guard let eventType = eventType(from: userInfo) else {
            return preferences.enabled && !preferences.quietHours.isActive()
        }
        return preferences.allows(eventType: eventType)
    }

    func clearScheduledGameReminders() async {
        let pending = await center.pendingNotificationRequests()
        let existingIds = pending.map(\.identifier).filter { $0.hasPrefix(schedulePrefix) }
        if !existingIds.isEmpty {
            center.removePendingNotificationRequests(withIdentifiers: existingIds)
        }
    }

    // Note for non-coders:
    // We keep only a few upcoming reminders so notifications stay useful instead of noisy.
    func scheduleUpcomingGameReminders(_ games: [ScheduleEntry], preferences: NotificationPreferences, limit: Int = 3) async {
        guard preferences.enabled else {
            await clearScheduledGameReminders()
            return
        }

        guard preferences.eventToggles[NotificationEventType.scheduledMatchNew.rawValue, default: true] else {
            await clearScheduledGameReminders()
            return
        }

        let futureGames = games
            .filter { $0.startsAt > .now }
            .sorted { $0.startsAt < $1.startsAt }
            .prefix(limit)

        let pending = await center.pendingNotificationRequests()
        let existingIds = pending
            .map(\.identifier)
            .filter { $0.hasPrefix(schedulePrefix) }

        if !existingIds.isEmpty {
            center.removePendingNotificationRequests(withIdentifiers: existingIds)
        }

        for game in futureGames {
            let reminderDate = game.startsAt.addingTimeInterval(-60 * 60)
            guard reminderDate > .now else { continue }
            let deliveryDate = preferences.quietHours.adjustedDeliveryDate(for: reminderDate)
            guard deliveryDate > .now else { continue }

            // Note for non-coders:
            // Some schedule fields can be empty. We choose friendly fallback text so reminders always read naturally.
            let gameSummary = game.description ?? String(localized: "notification.upcoming.default_summary")
            let gameLocation = game.location ?? String(localized: "notification.upcoming.default_location")

            let content = UNMutableNotificationContent()
            content.title = String(localized: "notification.upcoming.title")
            content.body = String(format: String(localized: "notification.upcoming.body"), gameSummary, timeLabel(for: game.startsAt), gameLocation)
            content.sound = .default
            content.userInfo = [
                "route": "schedule",
                "eventType": NotificationEventType.scheduledMatchNew.rawValue,
            ]

            let triggerDate = Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: deliveryDate)
            let trigger = UNCalendarNotificationTrigger(dateMatching: triggerDate, repeats: false)
            let request = UNNotificationRequest(identifier: "\(schedulePrefix)\(game.id.uuidString)", content: content, trigger: trigger)
            try? await center.add(request)
        }
    }

    private func timeLabel(for date: Date) -> String {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        formatter.dateStyle = .none
        return formatter.string(from: date)
    }
}
