import Foundation
import UserNotifications
import EventKit

// Note for non-coders:
// These small protocols are "plug points". Production uses the real services,
// while tests can inject fake versions to make results stable and predictable.
protocol NotificationServicing {
    func currentStatus() async -> UNAuthorizationStatus
    func requestAuthorization() async throws -> Bool
    func registerForRemoteNotifications()
    func scheduleUpcomingGameReminders(_ entries: [ScheduleEntry], preferences: NotificationPreferences) async
    func clearScheduledGameReminders() async
    func saveNotificationPreferences(_ preferences: NotificationPreferences, store: UserDefaults)
    func loadNotificationPreferences(store: UserDefaults) -> NotificationPreferences
}

extension NotificationService: NotificationServicing {}

protocol CalendarServicing {
    func currentAuthorizationStatus() -> EKAuthorizationStatus
    func requestAccessIfNeeded() async throws -> Bool
    func upsertLocalEvent(title: String, date: Date, startTime: Date, endTime: Date, location: String?) async throws
}

extension CalendarService: CalendarServicing {}

protocol TournamentDataLoading {
    func fetchTournaments() async throws -> [Tournament]
    func fetchTournamentRounds(tournamentId: UUID) async throws -> [TournamentRound]
    func fetchTournamentStandings(tournamentId: UUID) async throws -> [TournamentResult]
    func fetchTournamentParticipants(tournamentId: UUID) async throws -> [TournamentParticipant]
    func fetchCompletedTournamentResults() async throws -> [TournamentResult]
}

struct SupabaseTournamentDataLoader: TournamentDataLoading {
    private let apiClient: SupabaseRESTClient

    init(apiClient: SupabaseRESTClient) {
        self.apiClient = apiClient
    }

    func fetchTournaments() async throws -> [Tournament] {
        try await apiClient.fetchTournaments()
    }

    func fetchTournamentRounds(tournamentId: UUID) async throws -> [TournamentRound] {
        try await apiClient.fetchTournamentRounds(tournamentId: tournamentId)
    }

    func fetchTournamentStandings(tournamentId: UUID) async throws -> [TournamentResult] {
        try await apiClient.fetchTournamentStandings(tournamentId: tournamentId)
    }

    func fetchTournamentParticipants(tournamentId: UUID) async throws -> [TournamentParticipant] {
        try await apiClient.fetchTournamentParticipants(tournamentId: tournamentId)
    }

    func fetchCompletedTournamentResults() async throws -> [TournamentResult] {
        try await apiClient.fetchCompletedTournamentResults()
    }
}
