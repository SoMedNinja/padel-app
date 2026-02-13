import Foundation

struct AppBootstrapSnapshot {
    let players: [Player]
    let matches: [Match]
    let allMatches: [Match]
    let schedule: [ScheduleEntry]
    let polls: [AvailabilityPoll]

    // Note for non-coders:
    // This is a safe fallback package used when internet/config is unavailable,
    // so the app can still render screens instead of looking broken.
    static let sampleFallback = AppBootstrapSnapshot(
        players: SampleData.players,
        matches: SampleData.matches,
        allMatches: SampleData.matches,
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
        async let allMatchesTask = apiClient.fetchAllMatches()
        async let scheduleTask = apiClient.fetchSchedule()
        async let pollsTask = apiClient.fetchAvailabilityPolls()

        return AppBootstrapSnapshot(
            players: try await playersTask,
            matches: try await matchesTask,
            allMatches: try await allMatchesTask,
            schedule: try await scheduleTask,
            polls: try await pollsTask
        )
    }

    struct PartialSnapshot {
        let players: [Player]?
        let matches: [Match]?
        let allMatches: [Match]?
        let schedule: [ScheduleEntry]?
        let polls: [AvailabilityPoll]?
        let errorsBySection: [String: String]

        var hasAnySuccess: Bool {
            players != nil || matches != nil || allMatches != nil || schedule != nil || polls != nil
        }
    }

    // Note for non-coders:
    // This version is more resilient than all-or-nothing loading: each section loads
    // independently, so one backend failure does not hide all other real data.
    func fetchInitialSnapshotPartial(historyPageSize: Int) async -> PartialSnapshot {
        async let playersTask: Result<[Player], Error> = capture { try await apiClient.fetchLeaderboard() }
        async let matchesTask: Result<[Match], Error> = capture { try await apiClient.fetchRecentMatches(limit: historyPageSize) }
        async let allMatchesTask: Result<[Match], Error> = capture { try await apiClient.fetchAllMatches() }
        async let scheduleTask: Result<[ScheduleEntry], Error> = capture { try await apiClient.fetchSchedule() }
        async let pollsTask: Result<[AvailabilityPoll], Error> = capture { try await apiClient.fetchAvailabilityPolls() }

        let playersResult = await playersTask
        let matchesResult = await matchesTask
        let allMatchesResult = await allMatchesTask
        let scheduleResult = await scheduleTask
        let pollsResult = await pollsTask

        var errorsBySection: [String: String] = [:]

        func addError(_ error: Error, section: String) {
            // Note for non-coders:
            // If the error is just 'cancelled', we don't count it as a failure for the UI
            // because it's a normal lifecycle event (e.g. user pulled to refresh twice).
            if (error as? URLError)?.code == .cancelled || error is CancellationError {
                return
            }
            errorsBySection[section] = error.localizedDescription
        }

        if case .failure(let error) = playersResult { addError(error, section: "leaderboard") }
        if case .failure(let error) = matchesResult { addError(error, section: "matches") }
        if case .failure(let error) = allMatchesResult { addError(error, section: "allMatches") }
        if case .failure(let error) = scheduleResult { addError(error, section: "schedule") }
        if case .failure(let error) = pollsResult { addError(error, section: "polls") }

        return PartialSnapshot(
            players: try? playersResult.get(),
            matches: try? matchesResult.get(),
            allMatches: try? allMatchesResult.get(),
            schedule: try? scheduleResult.get(),
            polls: try? pollsResult.get(),
            errorsBySection: errorsBySection
        )
    }

    private func capture<T>(_ operation: () async throws -> T) async -> Result<T, Error> {
        do {
            return .success(try await operation())
        } catch {
            // Note for non-coders:
            // We ignore cancellation errors here because they usually mean the user navigated away
            // or started a new refresh, and showing a "cancelled" warning is confusing.
            if (error as? URLError)?.code == .cancelled || error is CancellationError {
                return .failure(error)
            }
            return .failure(error)
        }
    }
}
