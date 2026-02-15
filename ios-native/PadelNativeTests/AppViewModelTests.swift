import XCTest
import UserNotifications
@testable import PadelNative

final class AppViewModelTests: XCTestCase {
    @MainActor
    func testHandleIncomingScheduleURLSetsPollAndVoteDraft() {
        let viewModel = AppViewModel()
        viewModel.isAuthenticated = true
        viewModel.isGuestMode = false
        viewModel.injectIdentityForTests(AuthIdentity(profileId: UUID(), email: "member@padel.se", fullName: "Member", isAdmin: false, isRegular: true, isApproved: true))

        let pollId = UUID()
        let dayId = UUID()
        let url = URL(string: "padelnative://schedule?v=1&pollId=\(pollId.uuidString)&dayId=\(dayId.uuidString)&slots=morning,evening")!

        viewModel.handleIncomingURL(url)

        XCTAssertEqual(viewModel.selectedMainTab, 3)
        XCTAssertEqual(viewModel.deepLinkedPollId, pollId)
        XCTAssertEqual(viewModel.deepLinkedPollDayId, dayId)
        XCTAssertEqual(viewModel.scheduleActionMessage, nil)
    }

    @MainActor
    func testHandleIncomingUniversalScheduleURLSetsPollAndVoteDraft() {
        let viewModel = AppViewModel()
        viewModel.isAuthenticated = true
        viewModel.isGuestMode = false
        viewModel.injectIdentityForTests(AuthIdentity(profileId: UUID(), email: "member@padel.se", fullName: "Member", isAdmin: false, isRegular: true, isApproved: true))

        let pollId = UUID()
        let dayId = UUID()
        let url = URL(string: "https://padelnative.app/schema?poll=\(pollId.uuidString)&day=\(dayId.uuidString)&slots=day")!

        viewModel.handleIncomingURL(url)

        XCTAssertEqual(viewModel.selectedMainTab, 3)
        XCTAssertEqual(viewModel.deepLinkedPollId, pollId)
        XCTAssertEqual(viewModel.deepLinkedPollDayId, dayId)
    }

    @MainActor
    func testHandleIncomingSingleGameURLRequiresAuthenticatedMember() {
        let viewModel = AppViewModel()
        viewModel.isAuthenticated = false
        viewModel.isGuestMode = false

        let url = URL(string: "padelnative://single-game?mode=practice")!
        viewModel.handleIncomingURL(url)

        XCTAssertEqual(viewModel.authMessage, "Logga in för att öppna matchformuläret från en länk.")
        XCTAssertNotEqual(viewModel.selectedMainTab, 1)
    }

    @MainActor
    func testHandleIncomingMatchShareURLOpensHistoryTab() {
        let viewModel = AppViewModel()
        viewModel.isAuthenticated = true
        viewModel.isGuestMode = false

        let url = URL(string: "https://padelnative.app/match/8d388ea3-bf54-45aa-ba0b-c1146caecdf8")!
        viewModel.handleIncomingURL(url)

        XCTAssertEqual(viewModel.selectedMainTab, 4)
    }

    @MainActor
    func testPermissionGatingUsesIdentityRoleFallbackWhenProfileNotLoaded() {
        let regularId = UUID()
        let regularIdentity = AuthIdentity(profileId: regularId, email: "regular@padel.se", fullName: "Regular", isAdmin: false, isRegular: true, isApproved: true)

        let viewModel = AppViewModel()
        viewModel.isAuthenticated = true
        viewModel.isGuestMode = false
        viewModel.injectIdentityForTests(regularIdentity)
        viewModel.players = []

        XCTAssertTrue(viewModel.canSeeSchedule)
        XCTAssertTrue(viewModel.canUseSingleGame)
        XCTAssertFalse(viewModel.canUseAdmin)
    }

    @MainActor
    func testLoadTournamentDataMapsNetworkErrorsAndKeepsPreviousState() async {
        let existingTournament = Tournament(
            id: UUID(),
            name: "Existing",
            status: "in_progress",
            tournamentType: "americano",
            scheduledAt: nil,
            completedAt: nil,
            location: nil,
            scoreTarget: nil,
            createdAt: .now
        )
        let loader = MockTournamentDataLoader(nextTournamentsResult: .failure(URLError(.notConnectedToInternet)))
        let viewModel = AppViewModel(tournamentDataLoader: loader)
        viewModel.tournaments = [existingTournament]

        await viewModel.loadTournamentData()

        XCTAssertEqual(viewModel.tournaments.map(\.id), [existingTournament.id])
        XCTAssertEqual(viewModel.tournamentStatusMessage, "Could not load tournament data: No internet connection. Please reconnect and retry.")
    }

    @MainActor
    func testLoadTournamentDataCanBeRetriedAfterFailure() async {
        let tournament = Tournament(
            id: UUID(),
            name: "Retry Cup",
            status: "draft",
            tournamentType: "americano",
            scheduledAt: nil,
            completedAt: nil,
            location: nil,
            scoreTarget: nil,
            createdAt: .now
        )
        let loader = MockTournamentDataLoader(
            nextTournamentsResult: .failure(URLError(.timedOut)),
            fallbackTournamentsResult: .success([tournament])
        )
        let viewModel = AppViewModel(tournamentDataLoader: loader)

        await viewModel.loadTournamentData()
        XCTAssertTrue(viewModel.tournaments.isEmpty)
        XCTAssertEqual(viewModel.tournamentStatusMessage, "Could not load tournament data: Server took too long to respond. Please retry.")

        await viewModel.loadTournamentData()
        XCTAssertEqual(viewModel.tournaments.map(\.id), [tournament.id])
        XCTAssertNil(viewModel.tournamentStatusMessage)
    }

    @MainActor
    func testSetScheduleNotificationsEnabledShowsPermissionMessageWhenDenied() async {
        let notifications = MockNotificationService(requestResult: .success(false), status: .denied)
        let viewModel = AppViewModel(notificationService: notifications)

        await viewModel.setScheduleNotificationsEnabled(true)

        XCTAssertFalse(viewModel.areScheduleNotificationsEnabled)
        XCTAssertEqual(viewModel.statusMessage, "Notiser är inte tillåtna ännu. Aktivera i iOS-inställningar om du vill ha påminnelser.")
        XCTAssertFalse(notifications.didRegisterRemote)
    }
}

private final class MockNotificationService: NotificationServicing {
    let requestResult: Result<Bool, Error>
    let status: UNAuthorizationStatus
    var didRegisterRemote = false

    init(requestResult: Result<Bool, Error>, status: UNAuthorizationStatus) {
        self.requestResult = requestResult
        self.status = status
    }

    func currentStatus() async -> UNAuthorizationStatus {
        status
    }

    func requestAuthorization() async throws -> Bool {
        try requestResult.get()
    }

    func registerForRemoteNotifications() {
        didRegisterRemote = true
    }

    func scheduleUpcomingGameReminders(_ entries: [ScheduleEntry], preferences: NotificationPreferences) async {}

    func clearScheduledGameReminders() async {}

    func saveNotificationPreferences(_ preferences: NotificationPreferences, store: UserDefaults) {}

    func saveNotificationPreferencesWithSync(_ preferences: NotificationPreferences, profileId: UUID?, store: UserDefaults) async {}

    func loadNotificationPreferences(store: UserDefaults) -> NotificationPreferences {
        .default
    }

    func loadNotificationPreferencesWithSync(profileId: UUID?, store: UserDefaults) async -> NotificationPreferences {
        .default
    }
}

private final class MockTournamentDataLoader: TournamentDataLoading {
    private var callCount = 0
    private let nextTournamentsResult: Result<[Tournament], Error>
    private let fallbackTournamentsResult: Result<[Tournament], Error>

    init(
        nextTournamentsResult: Result<[Tournament], Error>,
        fallbackTournamentsResult: Result<[Tournament], Error>? = nil
    ) {
        self.nextTournamentsResult = nextTournamentsResult
        self.fallbackTournamentsResult = fallbackTournamentsResult ?? nextTournamentsResult
    }

    func fetchTournaments() async throws -> [Tournament] {
        callCount += 1
        if callCount == 1 {
            return try nextTournamentsResult.get()
        }
        return try fallbackTournamentsResult.get()
    }

    func fetchTournamentRounds(tournamentId: UUID) async throws -> [TournamentRound] { [] }
    func fetchTournamentStandings(tournamentId: UUID) async throws -> [TournamentResult] { [] }
    func fetchTournamentParticipants(tournamentId: UUID) async throws -> [TournamentParticipant] { [] }
    func fetchCompletedTournamentResults() async throws -> [TournamentResult] { [] }
}
