import Foundation

struct AppBootstrapSnapshot {
    let players: [Player]
    let matches: [Match]
    let schedule: [ScheduleEntry]
    let polls: [AvailabilityPoll]

    // Note for non-coders:
    // This is a safe fallback package used when internet/config is unavailable,
    // so the app can still render screens instead of looking broken.
    static let sampleFallback = AppBootstrapSnapshot(
        players: SampleData.players,
        matches: SampleData.matches,
        schedule: SampleData.schedule,
        polls: []
    )
}

struct AppBootstrapService {
    private let apiClient: SupabaseRESTClient

    init(apiClient: SupabaseRESTClient) {
        self.apiClient = apiClient
    }

    // Note for non-coders:
    // We fetch core home-screen data in parallel to reduce startup waiting time.
    func fetchInitialSnapshot(historyPageSize: Int) async throws -> AppBootstrapSnapshot {
        async let playersTask = apiClient.fetchLeaderboard()
        async let matchesTask = apiClient.fetchRecentMatches(limit: historyPageSize)
        async let scheduleTask = apiClient.fetchSchedule()
        async let pollsTask = apiClient.fetchAvailabilityPolls()

        return AppBootstrapSnapshot(
            players: try await playersTask,
            matches: try await matchesTask,
            schedule: try await scheduleTask,
            polls: try await pollsTask
        )
    }
}
