import Foundation

@MainActor
final class AppViewModel: ObservableObject {
    @Published var players: [Player] = []
    @Published var matches: [Match] = []
    @Published var schedule: [ScheduleEntry] = []
    @Published var lastErrorMessage: String?

    private let apiClient = SupabaseRESTClient()

    func bootstrap() async {
        do {
            async let playersTask = apiClient.fetchLeaderboard()
            async let matchesTask = apiClient.fetchRecentMatches()
            async let scheduleTask = apiClient.fetchSchedule()

            self.players = try await playersTask
            self.matches = try await matchesTask
            self.schedule = try await scheduleTask
            self.lastErrorMessage = nil
        } catch {
            // Note for non-coders:
            // If backend values are missing or internet is unavailable,
            // we still show sample data so the app stays usable.
            self.players = SampleData.players
            self.matches = SampleData.matches
            self.schedule = SampleData.schedule
            self.lastErrorMessage = error.localizedDescription
        }
    }
}

enum SampleData {
    static let players: [Player] = [
        Player(id: UUID(), fullName: "Alex", elo: 1510, isAdmin: true),
        Player(id: UUID(), fullName: "Sam", elo: 1465, isAdmin: false),
        Player(id: UUID(), fullName: "Robin", elo: 1430, isAdmin: false)
    ]

    static let matches: [Match] = [
        Match(id: UUID(), playedAt: .now.addingTimeInterval(-86_400), teamAName: "Alex & Sam", teamBName: "Robin & Kim", teamAScore: 6, teamBScore: 4),
        Match(id: UUID(), playedAt: .now.addingTimeInterval(-172_800), teamAName: "Alex & Kim", teamBName: "Sam & Robin", teamAScore: 7, teamBScore: 5)
    ]

    static let schedule: [ScheduleEntry] = [
        ScheduleEntry(id: UUID(), startsAt: .now.addingTimeInterval(172_800), location: "Center Court", description: "Friendly doubles"),
        ScheduleEntry(id: UUID(), startsAt: .now.addingTimeInterval(345_600), location: "North Hall", description: "Weekly ladder"),
    ]
}
