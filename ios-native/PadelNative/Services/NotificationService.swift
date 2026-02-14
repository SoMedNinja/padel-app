import Foundation
import UserNotifications
import UIKit

struct NotificationService {
    private let center = UNUserNotificationCenter.current()
    private let schedulePrefix = "schedule.upcoming."

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


    func clearScheduledGameReminders() async {
        let pending = await center.pendingNotificationRequests()
        let existingIds = pending.map(\.identifier).filter { $0.hasPrefix(schedulePrefix) }
        if !existingIds.isEmpty {
            center.removePendingNotificationRequests(withIdentifiers: existingIds)
        }
    }

    // Note for non-coders:
    // We keep only a few upcoming reminders so notifications stay useful instead of noisy.
    func scheduleUpcomingGameReminders(_ games: [ScheduleEntry], limit: Int = 3) async {
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

            // Note for non-coders:
            // Some schedule fields can be empty. We choose friendly fallback text so reminders always read naturally.
            let gameSummary = game.description ?? "Match"
            let gameLocation = game.location ?? "okänd plats"

            let content = UNMutableNotificationContent()
            content.title = "Padel snart"
            content.body = "\(gameSummary) kl \(timeLabel(for: game.startsAt)) på \(gameLocation)."
            content.sound = .default
            content.userInfo = ["route": "schedule"]

            let triggerDate = Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: reminderDate)
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
