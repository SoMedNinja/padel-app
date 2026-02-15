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

    // Note for non-coders:
    // These are the built-in fallback quiet-hour values used when saved data is missing or invalid.
    private static let defaultStartHour = 22
    private static let defaultEndHour = 7
    private static let defaultEnabled = false

    static let `default` = NotificationQuietHours(
        enabled: defaultEnabled,
        startHour: defaultStartHour,
        endHour: defaultEndHour
    )

    enum CodingKeys: String, CodingKey {
        case enabled
        case startHour
        case endHour
    }

    init(enabled: Bool, startHour: Int, endHour: Int) {
        self.enabled = enabled
        self.startHour = NotificationQuietHours.safeHour(startHour, fallback: Self.defaultStartHour)
        self.endHour = NotificationQuietHours.safeHour(endHour, fallback: Self.defaultEndHour)
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.enabled = try container.decodeIfPresent(Bool.self, forKey: .enabled) ?? Self.defaultEnabled
        self.startHour = NotificationQuietHours.safeHour(
            try container.decodeIfPresent(Int.self, forKey: .startHour),
            fallback: Self.defaultStartHour
        )
        self.endHour = NotificationQuietHours.safeHour(
            try container.decodeIfPresent(Int.self, forKey: .endHour),
            fallback: Self.defaultEndHour
        )
    }

    static func safeHour(_ candidate: Int?, fallback: Int) -> Int {
        guard let candidate, (0...23).contains(candidate) else { return fallback }
        return candidate
    }
}

struct NotificationPreferences: Codable {
    var enabled: Bool
    var eventToggles: [String: Bool]
    var quietHours: NotificationQuietHours

    private static let defaultEnabled = true
    private static let defaultEventToggles: [String: Bool] = [
        NotificationEventType.scheduledMatchNew.rawValue: true,
        NotificationEventType.availabilityPollReminder.rawValue: true,
        NotificationEventType.adminAnnouncement.rawValue: true,
    ]

    static let eventOrder: [NotificationEventType] = [
        .scheduledMatchNew,
        .availabilityPollReminder,
        .adminAnnouncement,
    ]

    static let `default` = NotificationPreferences(
        enabled: defaultEnabled,
        eventToggles: defaultEventToggles,
        quietHours: .default,
        normalize: false
    )

    enum CodingKeys: String, CodingKey {
        case enabled
        case eventToggles
        case quietHours
    }

    init(enabled: Bool, eventToggles: [String: Bool], quietHours: NotificationQuietHours) {
        self.init(enabled: enabled, eventToggles: eventToggles, quietHours: quietHours, normalize: true)
    }

    private init(enabled: Bool, eventToggles: [String: Bool], quietHours: NotificationQuietHours, normalize: Bool) {
        self.enabled = enabled
        self.eventToggles = eventToggles
        self.quietHours = quietHours
        if normalize {
            self = normalizedForPersistence()
        }
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let decodedEnabled = try container.decodeIfPresent(Bool.self, forKey: .enabled) ?? Self.defaultEnabled
        let decodedToggles = try container.decodeIfPresent([String: Bool].self, forKey: .eventToggles) ?? [:]
        let decodedQuietHours = try container.decodeIfPresent(NotificationQuietHours.self, forKey: .quietHours) ?? .default
        self.init(enabled: decodedEnabled, eventToggles: decodedToggles, quietHours: decodedQuietHours)
    }

    // Note for non-coders:
    // This helper answers "is this event allowed right now?" using the user's switches and quiet hours.
    func allows(eventType: NotificationEventType, now: Date = .now) -> Bool {
        guard enabled else { return false }
        guard eventToggles[eventType.rawValue, default: true] else { return false }
        return !quietHours.isActive(at: now)
    }

    // Note for non-coders:
    // We always save one canonical JSON shape so web + iOS read/write identical keys.
    func normalizedForPersistence() -> NotificationPreferences {
        var normalizedEventToggles = Self.defaultEventToggles
        for eventType in Self.eventOrder {
            let key = eventType.rawValue
            normalizedEventToggles[key] = eventToggles[key] ?? Self.defaultEventToggles[key] ?? true
        }
        return NotificationPreferences(
            enabled: enabled,
            eventToggles: normalizedEventToggles,
            quietHours: quietHours,
            normalize: false
        )
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
    private let apnsTokenKey = "settings.apnsDeviceToken"
    private let pushPlatform = "ios"
    private let apiClient: SupabaseRESTClient
    private let authService: AuthService

    init(apiClient: SupabaseRESTClient = SupabaseRESTClient(), authService: AuthService = AuthService()) {
        self.apiClient = apiClient
        self.authService = authService
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
    @MainActor func registerForRemoteNotifications() {
        UIApplication.shared.registerForRemoteNotifications()
    }


    // Note for non-coders:
    // iOS gives us a device token after registration. We store it and sync it to backend for this signed-in user.
    func handleAPNsTokenReceipt(_ deviceTokenData: Data, profileId: UUID? = nil, store: UserDefaults = .standard) async {
        let token = deviceTokenData.map { String(format: "%02.2hhx", $0) }.joined()
        store.set(token, forKey: apnsTokenKey)
        await upsertStoredPushToken(profileId: profileId, store: store)
    }

    // Note for non-coders:
    // This retries backend registration using the last known APNs token (useful right after sign-in).
    func syncStoredPushRegistration(profileId: UUID?, store: UserDefaults = .standard) async {
        await upsertStoredPushToken(profileId: profileId, store: store)
    }

    // Note for non-coders:
    // Revoking tells backend to stop sending remote pushes to this specific device token.
    func revokeStoredPushRegistration(profileId: UUID?, store: UserDefaults = .standard) async {
        guard profileId != nil || authService.currentProfileId() != nil else { return }
        guard let token = store.string(forKey: apnsTokenKey), !token.isEmpty else { return }

        do {
            try await apiClient.revokePushSubscription(platform: pushPlatform, deviceToken: token)
        } catch {
            // Keep local token for a later retry if network is temporarily unavailable.
        }
    }

    private func upsertStoredPushToken(profileId: UUID?, store: UserDefaults) async {
        let resolvedProfileId = profileId ?? authService.currentProfileId()
        guard let resolvedProfileId else { return }
        guard let token = store.string(forKey: apnsTokenKey), !token.isEmpty else { return }

        do {
            try await apiClient.upsertPushSubscription(
                profileId: resolvedProfileId,
                platform: pushPlatform,
                deviceToken: token,
                subscription: ["bundle_id": Bundle.main.bundleIdentifier ?? "PadelNative"],
                userAgent: "ios-native"
            )
        } catch {
            // Token stays cached locally so we can retry later.
        }
    }

    func saveNotificationPreferences(_ preferences: NotificationPreferences, store: UserDefaults = .standard) {
        let normalized = preferences.normalizedForPersistence()
        if let data = try? JSONEncoder().encode(normalized) {
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
            try await apiClient.upsertNotificationPreferences(profileId: profileId, preferences: preferences.normalizedForPersistence())
        } catch {
            // Keep local copy as fallback if backend call fails.
        }
    }

    private func mergePreferences(_ decoded: NotificationPreferences) -> NotificationPreferences {
        decoded.normalizedForPersistence()
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
    func scheduleUpcomingGameReminders(_ games: [ScheduleEntry], preferences: NotificationPreferences) async {
        let reminderLimit = 3

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
            .prefix(reminderLimit)

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
