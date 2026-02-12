import Foundation
import UserNotifications

struct ProfileEloPoint: Identifiable {
    let id: UUID
    let matchId: UUID
    let date: Date
    let elo: Int
}

struct ProfileComboStat: Identifiable {
    let id: String
    let title: String
    let value: String
    let detail: String
    let symbol: String
}

struct ProfileMeritMilestone: Identifiable {
    let id: String
    let title: String
    let description: String
    let icon: String
    let current: Int
    let target: Int
    let unlocked: Bool

    var progress: Double {
        guard target > 0 else { return 0 }
        return min(1, Double(current) / Double(target))
    }
}

struct AdminSnapshot {
    let playerCount: Int
    let matchCount: Int
    let scheduledCount: Int

    static let empty = AdminSnapshot(playerCount: 0, matchCount: 0, scheduledCount: 0)
}

struct HeadToHeadSummary: Identifiable {
    let id: String
    let pairing: String
    let matchesPlayed: Int
    let closeMatches: Int
}

struct AdminActionBanner: Identifiable {
    enum Style {
        case success
        case failure
    }

    let id = UUID()
    let message: String
    let style: Style
}

enum AdminWeeklyTimeframe: String, CaseIterable, Identifiable {
    case last7 = "7days"
    case last30 = "30days"
    case isoWeek = "isoWeek"

    var id: String { rawValue }

    var title: String {
        switch self {
        case .last7: return "Last 7 days"
        case .last30: return "Last 30 days"
        case .isoWeek: return "ISO week"
        }
    }
}

struct ScheduleWeekOption: Identifiable {
    let key: String
    let label: String
    let week: Int
    let year: Int

    var id: String { key }
}

enum DashboardMatchFilter: String, CaseIterable, Identifiable {
    case all
    case last7
    case last30
    case short
    case long
    case tournaments
    case custom

    var id: String { rawValue }

    var title: String {
        switch self {
        case .all: return "All"
        case .last7: return "Last 7d"
        case .last30: return "Last 30d"
        case .short: return "Short"
        case .long: return "Long"
        case .tournaments: return "Tournament"
        case .custom: return "Custom"
        }
    }
}

struct DashboardMatchHighlight {
    enum Reason {
        case upset
        case thriller
        case crush
        case titans
    }

    let matchId: UUID
    let reason: Reason
    let title: String
    let description: String
    let matchDateKey: String
}


struct MatchEloChangeRow: Identifiable {
    let id: UUID
    let playerName: String
    let delta: Int
    let estimatedBefore: Int
    let estimatedAfter: Int
}

struct DashboardMVPResult {
    let player: Player
    let wins: Int
    let games: Int
    let periodEloGain: Int
    let score: Double

    var winRate: Double {
        guard games > 0 else { return 0 }
        return Double(wins) / Double(games)
    }
}


struct ProfileBadgeOption: Identifiable, Hashable {
    let id: String
    let title: String
    let icon: String
    let hint: String
}

struct ProfilePerformanceWidget: Identifiable {
    let id: String
    let title: String
    let value: String
    let detail: String
    let symbol: String
}



enum HistoryDatePreset: String, CaseIterable, Identifiable {
    case all
    case last7
    case last30
    case custom

    var id: String { rawValue }

    var title: String {
        switch self {
        case .all: return "All"
        case .last7: return "Last 7d"
        case .last30: return "Last 30d"
        case .custom: return "Custom"
        }
    }
}

struct HistoryFilterState {
    var datePreset: HistoryDatePreset = .all
    var customStartDate: Date = Calendar.current.date(byAdding: .day, value: -30, to: .now) ?? .now
    var customEndDate: Date = .now
    var tournamentOnly = false
    var scoreType: String = "all"

    // Note for non-coders:
    // We use "23:59:59" so the selected end date includes the full day.
    var normalizedDateRange: (start: Date?, end: Date?) {
        let calendar = Calendar.current
        switch datePreset {
        case .all:
            return (nil, nil)
        case .last7:
            return (calendar.date(byAdding: .day, value: -7, to: .now), .now)
        case .last30:
            return (calendar.date(byAdding: .day, value: -30, to: .now), .now)
        case .custom:
            let start = calendar.startOfDay(for: customStartDate)
            let endDay = calendar.startOfDay(for: customEndDate)
            let end = calendar.date(byAdding: DateComponents(day: 1, second: -1), to: endDay) ?? customEndDate
            return (start, end)
        }
    }
}

struct SingleGameSuggestion {
    let teamAPlayerIds: [UUID?]
    let teamBPlayerIds: [UUID?]
    let fairness: Int
    let winProbability: Double
    let explanation: String
}

struct SingleGameRecap {
    let matchSummary: String
    let eveningSummary: String

    var sharePayload: String {
        [
            "Padel match recap",
            "",
            matchSummary,
            "",
            eveningSummary,
        ].joined(separator: "\n")
    }
}

@MainActor
final class AppViewModel: ObservableObject {
    private enum LiveSyncScope: Hashable {
        case tournaments
        case schedule
    }

    @Published var players: [Player] = []
    @Published var matches: [Match] = []
    @Published var schedule: [ScheduleEntry] = []
    @Published var polls: [AvailabilityPoll] = []
    @Published var scheduleWeekOptions: [ScheduleWeekOption] = []
    @Published var selectedScheduleWeekKey: String = ""
    @Published var voteDraftsByDay: [UUID: VoteDraft] = [:]
    @Published var isScheduleLoading = false
    @Published var isScheduleActionRunning = false
    @Published var scheduleActionMessage: String?
    @Published var scheduleErrorMessage: String?
    @Published var onlyMissingVotesByPoll: [UUID: Bool] = [:]
    @Published var lastErrorMessage: String?
    @Published var statusMessage: String?
    @Published var isAuthenticated = false
    @Published var isGuestMode = false
    @Published var isAuthenticating = false
    @Published var authMessage: String?
    @Published var isCheckingSession = true
    @Published var hasRecoveryFailed = false
    @Published var sessionRecoveryError: String?
    @Published var profileAvatarURLInput = ""
    @Published var profileDisplayNameDraft = ""
    @Published var selectedFeaturedBadgeId: String?
    @Published var isSavingProfileSetup = false
    @Published var profileSetupMessage: String?
    @Published var activeTournament: Tournament?
    @Published var tournaments: [Tournament] = []
    @Published var selectedTournamentId: UUID?
    @Published var tournamentRounds: [TournamentRound] = []
    @Published var tournamentStandings: [TournamentStanding] = []
    @Published var tournamentHistoryResults: [TournamentResult] = []
    @Published var tournamentParticipants: [TournamentParticipant] = []
    @Published var tournamentStatusMessage: String?
    @Published var isTournamentLoading = false
    @Published var isTournamentActionRunning = false
    @Published var tournamentActionErrorMessage: String?
    @Published var adminProfiles: [AdminProfile] = []
    @Published var adminBanner: AdminActionBanner?
    @Published var isAdminActionRunning = false
    @Published var isAdminReportRunning = false
    @Published var isAdminEmailActionRunning = false
    @Published var adminReportPreviewText: String?
    @Published var adminReportStatusMessage: String?
    @Published var adminEmailPreviewText: String?
    @Published var adminEmailStatusMessage: String?
    @Published var liveUpdateBanner: String?
    @Published var dashboardFilter: DashboardMatchFilter = .all
    @Published var dashboardCustomStartDate: Date = Calendar.current.date(byAdding: .day, value: -30, to: .now) ?? .now
    @Published var dashboardCustomEndDate: Date = .now
    @Published var isDashboardLoading = false
    @Published var selectedMainTab = 1
    @Published var historyFilters = HistoryFilterState()
    @Published var historyMatches: [Match] = []
    @Published var isHistoryLoading = false
    @Published var isHistoryLoadingMore = false
    @Published var hasMoreHistoryMatches = true
    @Published var deepLinkedPollId: UUID?
    @Published var deepLinkedPollDayId: UUID?
    @Published var deepLinkedSingleGameMode: String?
    @Published var areScheduleNotificationsEnabled = false
    @Published var notificationPermissionStatus: UNAuthorizationStatus = .notDetermined
    @Published var isBiometricLockEnabled = false
    @Published var appVersionMessage: String?
    @Published var appStoreUpdateURL: URL?
    @Published var isUpdateRequired = false

    // Note for non-coders:
    // These values mirror the web app's "dismiss this notice on this device" behavior.
    @Published private(set) var dismissedHighlightMatchId: UUID?
    @Published private(set) var dismissedHighlightDateKey: String?
    @Published private(set) var dismissedRecentMatchId: UUID?
    @Published private(set) var dismissedScheduledGameId: UUID?
    @Published private(set) var dismissedTournamentNoticeId: UUID?

    private(set) var signedInEmail: String?
    private(set) var currentIdentity: AuthIdentity?

    private let authService = AuthService()
    private let apiClient = SupabaseRESTClient()
    private lazy var bootstrapService = AppBootstrapService(apiClient: apiClient)
    private let appVersionService = AppVersionService()
    private let notificationService = NotificationService()
    private let biometricAuthService = BiometricAuthService()
    private var liveSyncTask: Task<Void, Never>?
    private var liveSyncDebounceTask: Task<Void, Never>?
    private var liveUpdateBannerTask: Task<Void, Never>?
    private var lastGlobalLiveMarker: SupabaseRESTClient.GlobalLiveMarker?
    private var lastFullLiveSyncAt: Date?
    private var consecutiveLiveProbeFailures = 0
    private var hasPendingDeepLinkedVote = false
    private var deepLinkedVoteSlots: [AvailabilitySlot] = []
    private var pendingLiveSyncScopes: Set<LiveSyncScope> = []
    private var lastTournamentMarker: SupabaseRESTClient.TournamentLiveMarker?
    private let liveSyncIntervalNanoseconds: UInt64 = 6_000_000_000
    private let liveSyncDebounceNanoseconds: UInt64 = 900_000_000
    private let liveSyncFallbackRefreshNanoseconds: UInt64 = 90_000_000_000
    private let historyPageSize = 50
    private static let adminDayFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .iso8601)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()

    private static let uiDateTimeFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter
    }()

    private let dismissalStore = UserDefaults.standard
    private let dismissedHighlightIdKey = "dashboard.dismissedHighlightMatchId"
    private let dismissedHighlightDateKeyStore = "dashboard.dismissedHighlightDate"
    private let dismissedRecentMatchIdKey = "dashboard.dismissedRecentMatchId"
    private let dismissedScheduledGameIdKey = "dashboard.dismissedScheduledGameId"
    private let dismissedTournamentNoticeIdKey = "dashboard.dismissedTournamentNoticeId"
    private let scheduleNotificationsEnabledKey = "settings.scheduleNotificationsEnabled"
    private let biometricLockEnabledKey = "settings.biometricLockEnabled"

    init() {
        dismissedHighlightMatchId = Self.uuidValue(from: dismissalStore, key: dismissedHighlightIdKey)
        dismissedHighlightDateKey = dismissalStore.string(forKey: dismissedHighlightDateKeyStore)
        dismissedRecentMatchId = Self.uuidValue(from: dismissalStore, key: dismissedRecentMatchIdKey)
        dismissedScheduledGameId = Self.uuidValue(from: dismissalStore, key: dismissedScheduledGameIdKey)
        dismissedTournamentNoticeId = Self.uuidValue(from: dismissalStore, key: dismissedTournamentNoticeIdKey)
        areScheduleNotificationsEnabled = dismissalStore.bool(forKey: scheduleNotificationsEnabledKey)
        isBiometricLockEnabled = dismissalStore.bool(forKey: biometricLockEnabledKey)
    }

    // Note for non-coders:
    // This runs native-only setup (notification status, remote push registration) when app starts.
    func prepareNativeCapabilities() async {
        notificationPermissionStatus = await notificationService.currentStatus()
        if areScheduleNotificationsEnabled && (notificationPermissionStatus == .authorized || notificationPermissionStatus == .provisional) {
            notificationService.registerForRemoteNotifications()
            await notificationService.scheduleUpcomingGameReminders(schedule)
        }

        await checkForAppUpdate()
    }

    // Note for non-coders:
    // This compares your current app version against policy values from the backend
    // (or bundled fallback values) and shows a friendly upgrade message when needed.
    func checkForAppUpdate() async {
        let currentVersion = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "0"

        let policy = (try? await appVersionService.fetchPolicyFromServer())
            ?? appVersionService.bundledPolicyFallback()

        guard let policy else {
            appVersionMessage = nil
            appStoreUpdateURL = nil
            isUpdateRequired = false
            return
        }

        switch appVersionService.evaluate(currentVersion: currentVersion, policy: policy) {
        case .upToDate:
            appVersionMessage = nil
            appStoreUpdateURL = nil
            isUpdateRequired = false
        case .updateRecommended(let policy):
            appStoreUpdateURL = policy.appStoreURL
            isUpdateRequired = false
            appVersionMessage = "En ny appversion finns tillgänglig. Uppdatera gärna för senaste förbättringar."
        case .updateRequired(let policy):
            appStoreUpdateURL = policy.appStoreURL
            isUpdateRequired = true
            appVersionMessage = "Din appversion är för gammal för den här miljön. Uppdatera appen för att fortsätta säkert."
        }
    }

    func setScheduleNotificationsEnabled(_ enabled: Bool) async {
        if enabled {
            do {
                let granted = try await notificationService.requestAuthorization()
                notificationPermissionStatus = await notificationService.currentStatus()
                guard granted else {
                    areScheduleNotificationsEnabled = false
                    statusMessage = "Notiser är inte tillåtna ännu. Aktivera i iOS-inställningar om du vill ha påminnelser."
                    dismissalStore.set(false, forKey: scheduleNotificationsEnabledKey)
                    return
                }
                areScheduleNotificationsEnabled = true
                dismissalStore.set(true, forKey: scheduleNotificationsEnabledKey)
                notificationService.registerForRemoteNotifications()
                await notificationService.scheduleUpcomingGameReminders(schedule)
                statusMessage = "Notiser aktiverade. Du får påminnelse före kommande matcher."
            } catch {
                areScheduleNotificationsEnabled = false
                dismissalStore.set(false, forKey: scheduleNotificationsEnabledKey)
                statusMessage = "Kunde inte aktivera notiser: \(error.localizedDescription)"
            }
            return
        }

        areScheduleNotificationsEnabled = false
        dismissalStore.set(false, forKey: scheduleNotificationsEnabledKey)
        await notificationService.clearScheduledGameReminders()
        statusMessage = "Notispåminnelser avstängda för den här enheten."
    }

    func setBiometricLockEnabled(_ enabled: Bool) async {
        if enabled {
            guard biometricAuthService.canUseBiometrics() else {
                statusMessage = "Face ID/Touch ID är inte tillgängligt på den här enheten."
                isBiometricLockEnabled = false
                dismissalStore.set(false, forKey: biometricLockEnabledKey)
                return
            }

            do {
                try await biometricAuthService.authenticate(reason: "Bekräfta att du vill skydda PadelNative med Face ID/Touch ID")
                isBiometricLockEnabled = true
                dismissalStore.set(true, forKey: biometricLockEnabledKey)
                statusMessage = "Biometriskt applås aktiverat."
            } catch {
                isBiometricLockEnabled = false
                dismissalStore.set(false, forKey: biometricLockEnabledKey)
                statusMessage = "Kunde inte aktivera biometriskt lås: \(error.localizedDescription)"
            }
            return
        }

        isBiometricLockEnabled = false
        dismissalStore.set(false, forKey: biometricLockEnabledKey)
        statusMessage = "Biometriskt applås avstängt."
    }

    // Note for non-coders:
    // This signs in with the same Supabase backend used by the web app.
    func signIn(email: String, password: String) async {
        let normalizedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        let normalizedPassword = password.trimmingCharacters(in: .whitespacesAndNewlines)

        guard !normalizedEmail.isEmpty, !normalizedPassword.isEmpty else {
            authMessage = "Please enter both email and password."
            return
        }

        isAuthenticating = true
        defer { isAuthenticating = false }

        do {
            let identity = try await authService.signIn(email: normalizedEmail, password: normalizedPassword)
            applySignedInState(identity: identity)
            authMessage = nil
            await bootstrap()
        } catch {
            authMessage = error.localizedDescription
        }
    }

    // Note for non-coders:
    // Sign up mirrors the web flow: create account, then continue with that identity.
    func signUp(name: String, email: String, password: String) async {
        let normalizedName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        let normalizedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        let normalizedPassword = password.trimmingCharacters(in: .whitespacesAndNewlines)

        guard normalizedName.count >= 2 else {
            authMessage = "Please enter your full name."
            return
        }

        guard normalizedPassword.count >= 8 else {
            authMessage = "Password must be at least 8 characters."
            return
        }

        guard !normalizedEmail.isEmpty else {
            authMessage = "Please enter an email address."
            return
        }

        isAuthenticating = true
        defer { isAuthenticating = false }

        do {
            let identity = try await authService.signUp(email: normalizedEmail, password: normalizedPassword, name: normalizedName)
            applySignedInState(identity: identity)
            authMessage = nil
            await bootstrap()
        } catch {
            authMessage = error.localizedDescription
        }
    }

    func sendPasswordReset(email: String) async {
        let normalizedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !normalizedEmail.isEmpty else {
            authMessage = "Please enter an email address."
            return
        }

        isAuthenticating = true
        defer { isAuthenticating = false }

        do {
            try await authService.resetPassword(email: normalizedEmail)
            authMessage = "Password reset link sent. Check your email inbox."
        } catch {
            authMessage = error.localizedDescription
        }
    }

    func signOut() {
        // Note for non-coders:
        // Signing out clears local state and also asks Supabase to end server session.
        if !isGuestMode {
            Task {
                await authService.signOut(accessToken: nil)
            }
        }
        isAuthenticated = false
        isGuestMode = false
        signedInEmail = nil
        currentIdentity = nil
        authMessage = nil
        statusMessage = nil
        profileSetupMessage = nil
        profileDisplayNameDraft = ""
        profileAvatarURLInput = ""
        selectedFeaturedBadgeId = nil
        adminProfiles = []
        adminBanner = nil
        adminReportPreviewText = nil
        adminReportStatusMessage = nil
        adminEmailPreviewText = nil
        adminEmailStatusMessage = nil
        polls = []
        voteDraftsByDay = [:]
        scheduleActionMessage = nil
        scheduleErrorMessage = nil
        deepLinkedPollId = nil
        deepLinkedPollDayId = nil
        deepLinkedSingleGameMode = nil
        hasPendingDeepLinkedVote = false
        deepLinkedVoteSlots = []
        stopLiveSync()
    }

    func restoreSession() async {
        isCheckingSession = true
        hasRecoveryFailed = false
        sessionRecoveryError = nil

        defer { isCheckingSession = false }

        do {
            let identity = try await authService.restoreSession()
            if isBiometricLockEnabled {
                do {
                    try await biometricAuthService.authenticate(reason: "Lås upp PadelNative")
                } catch {
                    isAuthenticated = false
                    currentIdentity = nil
                    authMessage = "Biometrisk verifiering krävs för att återställa sessionen."
                    stopLiveSync()
                    return
                }
            }
            applySignedInState(identity: identity)
            await bootstrap()
        } catch AuthServiceError.noStoredSession {
            isAuthenticated = false
            isGuestMode = false
            currentIdentity = nil
            hasRecoveryFailed = false
            sessionRecoveryError = nil
            stopLiveSync()
        } catch {
            isAuthenticated = false
            isGuestMode = false
            currentIdentity = nil
            hasRecoveryFailed = true
            sessionRecoveryError = error.localizedDescription
            stopLiveSync()
        }
    }

    func retrySessionRecovery() async {
        await restoreSession()
    }


    func continueAsGuest() {
        // Note for non-coders:
        // Guest mode lets people browse read-only stats without creating an account.
        isGuestMode = true
        isAuthenticated = false
        currentIdentity = nil
        signedInEmail = nil
        authMessage = nil
        hasRecoveryFailed = false
        sessionRecoveryError = nil
    }

    func exitGuestMode() {
        // Note for non-coders:
        // Exiting guest mode returns the app to the normal login flow.
        isGuestMode = false
    }

    private func applySignedInState(identity: AuthIdentity) {
        isAuthenticated = true
        isGuestMode = false
        signedInEmail = identity.email
        currentIdentity = identity
        hasRecoveryFailed = false
        sessionRecoveryError = nil
    }

    // Note for non-coders:
    // Permissions now come from the signed-in user's own profile row only.
    // If that row is missing, we deny access by default to avoid exposing admin/member-only areas.
    private var authenticatedProfile: Player? {
        guard let profileId = currentIdentity?.profileId else {
            return nil
        }
        return players.first(where: { $0.id == profileId })
    }

    var currentPlayer: Player? { authenticatedProfile }

    var profileSetupPrompt: String {
        if isAwaitingApproval {
            return "Your account is waiting for admin approval. You can still update your profile while you wait."
        }
        return "Keep your profile up to date so teammates can recognize you in schedule invites and stats widgets."
    }

    var availableBadgeOptions: [ProfileBadgeOption] {
        [
            ProfileBadgeOption(id: "king-of-elo", title: "King of ELO", icon: "crown.fill", hint: "Top ranked right now"),
            ProfileBadgeOption(id: "wins-10", title: "10 Wins", icon: "rosette", hint: "Unlocked after 10 wins"),
            ProfileBadgeOption(id: "hot-streak", title: "Hot Streak", icon: "flame.fill", hint: "Winning streak specialist"),
            ProfileBadgeOption(id: "tournament-runner", title: "Tournament Runner", icon: "trophy.fill", hint: "Strong tournament track record")
        ]
    }

    private var currentPlayerMatches: [Match] {
        guard let currentPlayer else { return [] }
        return matches.filter { match in
            let playerIds = match.teamAPlayerIds.compactMap { $0 } + match.teamBPlayerIds.compactMap { $0 }
            if playerIds.contains(currentPlayer.id) {
                return true
            }
            return match.teamAName.localizedCaseInsensitiveContains(currentPlayer.fullName)
                || match.teamBName.localizedCaseInsensitiveContains(currentPlayer.fullName)
                || match.teamAName.localizedCaseInsensitiveContains(currentPlayer.profileName)
                || match.teamBName.localizedCaseInsensitiveContains(currentPlayer.profileName)
        }
    }

    // Note for non-coders:
    // Profile tabs should react to the same quick filters as web profile (7d/30d/tournament/all),
    // so this helper applies those date/type rules consistently to profile-only match lists.
    func matchesForProfile(filter: DashboardMatchFilter) -> [Match] {
        filteredMatches(currentPlayerMatches, filter: filter)
    }

    func profilePerformanceWidgets(filter: DashboardMatchFilter) -> [ProfilePerformanceWidget] {
        guard let currentPlayer else { return [] }
        let myMatches = matchesForProfile(filter: filter)
        let wins = myMatches.filter { match in
            let teamAIds = match.teamAPlayerIds.compactMap { $0 }
            let iAmTeamA = teamAIds.contains(currentPlayer.id) || match.teamAName.localizedCaseInsensitiveContains(currentPlayer.fullName)
            return iAmTeamA ? match.teamAScore > match.teamBScore : match.teamBScore > match.teamAScore
        }.count
        let tournamentsPlayed = myMatches.filter { $0.sourceTournamentId != nil }.count
        let closeMatches = myMatches.filter { abs($0.teamAScore - $0.teamBScore) <= 1 }.count
        let winRate = myMatches.isEmpty ? 0 : Int((Double(wins) / Double(myMatches.count) * 100).rounded())

        return [
            ProfilePerformanceWidget(id: "elo", title: "Current ELO", value: "\(currentPlayer.elo)", detail: "Live rating used in matchup balancing", symbol: "chart.line.uptrend.xyaxis"),
            ProfilePerformanceWidget(id: "winRate", title: "Win rate", value: "\(winRate)%", detail: "\(wins) wins in \(myMatches.count) matches", symbol: "percent"),
            ProfilePerformanceWidget(id: "tournaments", title: "Tournament games", value: "\(tournamentsPlayed)", detail: "Matches with a tournament source", symbol: "trophy"),
            ProfilePerformanceWidget(id: "clutch", title: "Close battles", value: "\(closeMatches)", detail: "Matches decided by one set", symbol: "bolt.heart"),
        ]
    }

    var profilePerformanceWidgets: [ProfilePerformanceWidget] {
        profilePerformanceWidgets(filter: .all)
    }

    func profileEloTimeline(filter: DashboardMatchFilter) -> [ProfileEloPoint] {
        guard let currentPlayer else { return [] }
        let filtered = matchesForProfile(filter: filter).sorted { $0.playedAt < $1.playedAt }
        guard !filtered.isEmpty else {
            return [ProfileEloPoint(id: UUID(), matchId: UUID(), date: Date(), elo: currentPlayer.elo)]
        }

        var estimatedCurrent = currentPlayer.elo
        var beforeMatchRating: [UUID: Int] = [:]
        for match in filtered.reversed() {
            let delta = estimatedEloDelta(for: match, playerId: currentPlayer.id)
            beforeMatchRating[match.id] = estimatedCurrent - delta
            estimatedCurrent -= delta
        }

        return filtered.map { match in
            let baseline = beforeMatchRating[match.id] ?? currentPlayer.elo
            let delta = estimatedEloDelta(for: match, playerId: currentPlayer.id)
            return ProfileEloPoint(id: match.id, matchId: match.id, date: match.playedAt, elo: baseline + delta)
        }
    }

    func profileComboStats(filter: DashboardMatchFilter) -> [ProfileComboStat] {
        guard let currentPlayer else { return [] }
        let myMatches = matchesForProfile(filter: filter)
        var teammateGames: [UUID: Int] = [:]
        var teammateWins: [UUID: Int] = [:]
        var opponentGames: [UUID: Int] = [:]

        for match in myMatches {
            let teamAIds = match.teamAPlayerIds.compactMap { $0 }
            let teamBIds = match.teamBPlayerIds.compactMap { $0 }
            let iAmTeamA = teamAIds.contains(currentPlayer.id)
            let myTeam = iAmTeamA ? teamAIds : teamBIds
            let opponentTeam = iAmTeamA ? teamBIds : teamAIds
            let didWin = iAmTeamA ? match.teamAScore > match.teamBScore : match.teamBScore > match.teamAScore

            for teammateId in myTeam where teammateId != currentPlayer.id {
                teammateGames[teammateId, default: 0] += 1
                if didWin { teammateWins[teammateId, default: 0] += 1 }
            }

            for opponentId in opponentTeam {
                opponentGames[opponentId, default: 0] += 1
            }
        }

        let topTeammate = teammateGames.max { lhs, rhs in lhs.value < rhs.value }
        let bestCombo = teammateGames
            .filter { $0.value >= 2 }
            .max { lhs, rhs in
                let lhsRate = Double(teammateWins[lhs.key, default: 0]) / Double(lhs.value)
                let rhsRate = Double(teammateWins[rhs.key, default: 0]) / Double(rhs.value)
                return lhsRate < rhsRate
            }
        let densestOpponent = opponentGames.max { lhs, rhs in lhs.value < rhs.value }

        let teammateName = topTeammate.map { playerName(for: $0.key) } ?? "No teammate data"
        let comboName = bestCombo.map { playerName(for: $0.key) } ?? "Need 2+ shared matches"
        let comboRate = bestCombo.map {
            let wins = teammateWins[$0.key, default: 0]
            return "\(Int((Double(wins) / Double(max(1, $0.value)) * 100).rounded()))%"
        } ?? "--"
        let densityName = densestOpponent.map { playerName(for: $0.key) } ?? "No matchup data"

        return [
            ProfileComboStat(id: "top-teammate", title: "Most played teammate", value: teammateName, detail: topTeammate.map { "\($0.value) matches together" } ?? "Play more matches to populate this tile", symbol: "person.2.fill"),
            ProfileComboStat(id: "best-combo", title: "Best win-rate combo", value: "\(comboName) · \(comboRate)", detail: bestCombo.map { "\(teammateWins[$0.key, default: 0]) wins in \($0.value) matches" } ?? "Needs at least two shared matches", symbol: "chart.bar.doc.horizontal"),
            ProfileComboStat(id: "matchup-density", title: "Highest matchup density", value: densityName, detail: densestOpponent.map { "Faced \($0.value) times in selected filter" } ?? "No opponents detected for this filter", symbol: "square.grid.3x3.fill")
        ]
    }

    func profileMeritMilestones(filter: DashboardMatchFilter) -> [ProfileMeritMilestone] {
        guard let currentPlayer else { return [] }
        let myMatches = matchesForProfile(filter: filter)
        let wins = myMatches.filter { didCurrentPlayerWin($0, player: currentPlayer) }.count
        let tournamentGames = myMatches.filter { $0.sourceTournamentId != nil }.count
        let closeWins = myMatches.filter { didCurrentPlayerWin($0, player: currentPlayer) && abs($0.teamAScore - $0.teamBScore) <= 1 }.count
        let topRanked = players.sorted { $0.elo > $1.elo }.first?.id == currentPlayer.id

        return [
            ProfileMeritMilestone(id: "wins-10", title: "10 Wins", description: "Unlock after ten wins in the selected period.", icon: "rosette", current: wins, target: 10, unlocked: wins >= 10),
            ProfileMeritMilestone(id: "wins-25", title: "25 Wins Trophy", description: "Trophy milestone for sustained match wins.", icon: "trophy.fill", current: wins, target: 25, unlocked: wins >= 25),
            ProfileMeritMilestone(id: "tournament-runner", title: "Tournament Runner", description: "Play tournament matches to unlock this merit.", icon: "medal.fill", current: tournamentGames, target: 8, unlocked: tournamentGames >= 8),
            ProfileMeritMilestone(id: "clutch-closer", title: "Clutch Closer", description: "Win tight matches decided by one set.", icon: "flame.fill", current: closeWins, target: 6, unlocked: closeWins >= 6),
            ProfileMeritMilestone(id: "king-of-elo", title: "King of ELO", description: "Awarded when you hold top ELO on the leaderboard.", icon: "crown.fill", current: topRanked ? 1 : 0, target: 1, unlocked: topRanked)
        ]
    }


    private var accessPolicy: AccessPolicy {
        AccessPolicy(isAuthenticated: isAuthenticated, isGuest: isGuestMode, profile: authenticatedProfile)
    }

    var highlightedBadgeTitle: String {
        guard let currentPlayer else { return "No badge selected" }
        let selectedId = selectedFeaturedBadgeId ?? currentPlayer.featuredBadgeId
        guard let selectedId else { return "No badge selected" }
        return availableBadgeOptions.first(where: { $0.id == selectedId })?.title ?? selectedId
    }

    // Note for non-coders:
    // This mirrors web route guards. Signed-in users can see schedule only when
    // their profile is marked as a regular member.
    var canSeeSchedule: Bool { accessPolicy.canSeeSchedule }

    var canManageSchedulePolls: Bool {
        canUseAdmin
    }

    var canVoteInSchedulePolls: Bool {
        canSeeSchedule
    }

    // Note for non-coders:
    // Missing profile/role data is treated as "not admin" so we never grant admin by accident.
    var canUseAdmin: Bool { accessPolicy.canUseAdmin }

    var canSeeTournament: Bool { accessPolicy.canSeeTournament }
    var canUseSingleGame: Bool { accessPolicy.canUseSingleGame }

    var canMutateTournament: Bool { accessPolicy.canMutateTournament }
    var canCreateMatches: Bool { accessPolicy.canCreateMatches }

    // Note for non-coders:
    // Match deletion follows web rules: admins can delete any match, and match creators
    // can delete their own entries even without admin rights.
    func canDeleteMatch(_ match: Match) -> Bool {
        accessPolicy.canDeleteMatch(createdBy: match.createdBy, currentPlayerId: currentPlayer?.id)
    }

    private func fallbackName(from teamLabel: String, at index: Int) -> String {
        let names = teamLabel
            .split(separator: "&")
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
        guard index < names.count else { return "Spelare \(index + 1)" }
        return names[index]
    }

    private func resolvePlayerName(playerId: UUID?, fallbackLabel: String? = nil) -> String {
        if let playerId {
            if let player = players.first(where: { $0.id == playerId }) {
                return player.fullName
            }
            if let participant = tournamentParticipants.first(where: { $0.profileId == playerId }) {
                return participant.profileName
            }
            return fallbackLabel ?? "Spelare \(playerId.uuidString.prefix(6))"
        }
        return fallbackLabel ?? "Gästspelare"
    }

    // Note for non-coders:
    // This returns a simple ELO change table per match participant so users can understand
    // who gained/lost rating in the selected result, similar to the web history details.
    func eloBreakdown(for match: Match) -> [MatchEloChangeRow] {
        let teamA = match.teamAPlayerIds.enumerated().map { index, playerId in
            (playerId, fallbackName(from: match.teamAName, at: index))
        }
        let teamB = match.teamBPlayerIds.enumerated().map { index, playerId in
            (playerId, fallbackName(from: match.teamBName, at: index))
        }

        let participantSlots = (teamA + teamB)
        let uniqueSlots = Dictionary(grouping: participantSlots, by: { $0.0 }).compactMap { key, slots in
            slots.first.map { (key, $0.1) }
        }

        return uniqueSlots
            .map { playerId, fallbackName in
                let delta = playerId.map { estimatedEloDelta(for: match, playerId: $0) } ?? 0
                let currentElo = playerId.flatMap { id in
                    players.first(where: { $0.id == id })?.elo
                } ?? 1400
                let estimatedBefore = currentElo - delta
                return MatchEloChangeRow(
                    id: playerId ?? UUID(),
                    playerName: resolvePlayerName(playerId: playerId, fallbackLabel: fallbackName),
                    delta: delta,
                    estimatedBefore: estimatedBefore,
                    estimatedAfter: currentElo
                )
            }
            .sorted { lhs, rhs in
                if lhs.delta != rhs.delta { return lhs.delta > rhs.delta }
                return lhs.playerName < rhs.playerName
            }
    }

    func tournamentPlayerName(for profileId: UUID) -> String {
        resolvePlayerName(playerId: profileId)
    }


    func tournamentName(for tournamentId: UUID) -> String {
        tournaments.first(where: { $0.id == tournamentId })?.name
        ?? "Tournament \(tournamentId.uuidString.prefix(8))…"
    }

    var isAwaitingApproval: Bool {
        guard let identity = currentIdentity else { return false }
        return !identity.isAdmin && !identity.isApproved
    }

    var adminSnapshot: AdminSnapshot {
        AdminSnapshot(
            playerCount: players.count,
            matchCount: matches.count,
            scheduledCount: schedule.count
        )
    }

    var profileWinRate: Int {
        guard let currentPlayer else { return 0 }
        let involvingCurrent = currentPlayerMatches
        guard !involvingCurrent.isEmpty else { return 0 }
        let wins = involvingCurrent.filter { match in
            let iAmTeamA = match.teamAPlayerIds.compactMap { $0 }.contains(currentPlayer.id)
                || match.teamAName.localizedCaseInsensitiveContains(currentPlayer.fullName)
                || match.teamAName.localizedCaseInsensitiveContains(currentPlayer.profileName)
            return iAmTeamA ? match.teamAScore > match.teamBScore : match.teamBScore > match.teamAScore
        }
        return Int((Double(wins.count) / Double(involvingCurrent.count)) * 100)
    }

    var profileMatchesPlayed: Int {
        currentPlayerMatches.count
    }

    var headToHeadSummary: [HeadToHeadSummary] {
        var grouped: [String: [Match]] = [:]
        for match in matches {
            let pairing = [match.teamAName, match.teamBName].sorted().joined(separator: " vs ")
            grouped[pairing, default: []].append(match)
        }

        return grouped.map { key, groupedMatches in
            HeadToHeadSummary(
                id: key,
                pairing: key,
                matchesPlayed: groupedMatches.count,
                closeMatches: groupedMatches.filter { abs($0.teamAScore - $0.teamBScore) <= 2 }.count
            )
        }
        .sorted { $0.matchesPlayed > $1.matchesPlayed }
        .prefix(5)
        .map { $0 }
    }

    var dashboardFilteredMatches: [Match] {
        filteredMatches(matches, filter: dashboardFilter)
    }

    // Note for non-coders:
    // We show this label in the UI so people can confirm which filter scope is currently applied.
    var dashboardActiveFilterLabel: String {
        if dashboardFilter == .custom {
            let formatter = DateFormatter()
            formatter.dateStyle = .medium
            formatter.timeStyle = .none
            return "Custom: \(formatter.string(from: dashboardCustomStartDate)) → \(formatter.string(from: dashboardCustomEndDate))"
        }
        return dashboardFilter.title
    }

    // Note for non-coders:
    // End date is normalized to 23:59:59 so selecting a day includes all matches played that day.
    var dashboardCustomDateRange: (start: Date, end: Date) {
        let calendar = Calendar.current
        let rawStart = calendar.startOfDay(for: dashboardCustomStartDate)
        let rawEndDay = calendar.startOfDay(for: dashboardCustomEndDate)
        let start = min(rawStart, rawEndDay)
        let normalizedEndDay = max(rawStart, rawEndDay)
        let end = calendar.date(byAdding: DateComponents(day: 1, second: -1), to: normalizedEndDay) ?? dashboardCustomEndDate
        return (start, end)
    }

    private func filteredMatches(_ source: [Match], filter: DashboardMatchFilter) -> [Match] {
        let now = Date()
        let calendar = Calendar.current

        switch filter {
        case .all:
            return source
        case .short:
            return source.filter { ($0.scoreType ?? "sets") == "sets" && max($0.teamAScore, $0.teamBScore) <= 3 }
        case .long:
            return source.filter { ($0.scoreType ?? "sets") == "sets" && max($0.teamAScore, $0.teamBScore) >= 6 }
        case .tournaments:
            return source.filter { $0.sourceTournamentId != nil }
        case .last7:
            guard let cutoff = calendar.date(byAdding: .day, value: -7, to: now) else { return source }
            return source.filter { $0.playedAt >= cutoff && $0.playedAt <= now }
        case .last30:
            guard let cutoff = calendar.date(byAdding: .day, value: -30, to: now) else { return source }
            return source.filter { $0.playedAt >= cutoff && $0.playedAt <= now }
        case .custom:
            let range = dashboardCustomDateRange
            return source.filter { $0.playedAt >= range.start && $0.playedAt <= range.end }
        }
    }

    private func didCurrentPlayerWin(_ match: Match, player: Player) -> Bool {
        let teamAIds = match.teamAPlayerIds.compactMap { $0 }
        let iAmTeamA = teamAIds.contains(player.id) || match.teamAName.localizedCaseInsensitiveContains(player.fullName)
        return iAmTeamA ? match.teamAScore > match.teamBScore : match.teamBScore > match.teamAScore
    }

    private func playerName(for id: UUID) -> String {
        players.first(where: { $0.id == id })?.profileName
        ?? players.first(where: { $0.id == id })?.fullName
        ?? "Unknown"
    }

    private func estimatedEloDelta(for match: Match, playerId: UUID) -> Int {
        let teamAIds = match.teamAPlayerIds.compactMap { $0 }
        // Note for non-coders:
        // We only need to know whether the player belongs to Team A.
        // Team B is inferred automatically when they are not in Team A.
        let iAmTeamA = teamAIds.contains(playerId)
        let didWin = iAmTeamA ? match.teamAScore > match.teamBScore : match.teamBScore > match.teamAScore
        let margin = abs(match.teamAScore - match.teamBScore)
        let base = match.sourceTournamentId != nil ? 22 : 16
        let marginBonus = min(4, margin)
        return didWin ? base + marginBonus : -(base + marginBonus)
    }

    var latestHighlightMatch: DashboardMatchHighlight? {
        findMatchHighlight(matches: matches, players: players)
    }

    var showHighlightCard: Bool {
        guard let highlight = latestHighlightMatch else { return false }
        return dismissedHighlightMatchId != highlight.matchId
    }

    var latestRecentMatch: Match? {
        guard let latest = matches.first else { return nil }
        let twoHoursAgo = Date().addingTimeInterval(-2 * 60 * 60)
        guard latest.playedAt >= twoHoursAgo else { return nil }
        guard dismissedRecentMatchId != latest.id else { return nil }
        return latest
    }

    var nextScheduledGameNotice: ScheduleEntry? {
        let now = Date()
        let upcoming = schedule
            .filter { $0.startsAt >= now }
            .sorted { $0.startsAt < $1.startsAt }
            .first
        guard let upcoming else { return nil }
        guard dismissedScheduledGameId != upcoming.id else { return nil }
        return upcoming
    }

    var activeTournamentNotice: Tournament? {
        guard let tournament = activeTournament,
              tournament.status == "in_progress" || tournament.status == "draft" else {
            return nil
        }
        guard dismissedTournamentNoticeId != tournament.id else { return nil }
        return tournament
    }

    var currentMVP: DashboardMVPResult? {
        mvp(for: matchesForSameEvening, minimumGames: 3)
    }

    var periodMVP: DashboardMVPResult? {
        let cutoff = Calendar.current.date(byAdding: .day, value: -30, to: Date()) ?? .distantPast
        let periodMatches = matches.filter { $0.playedAt >= cutoff }
        return mvp(for: periodMatches, minimumGames: 6)
    }



    var historyFilteredMatches: [Match] {
        historyMatches
    }

    func reloadHistoryMatches() async {
        isHistoryLoading = true
        defer { isHistoryLoading = false }

        do {
            let range = historyFilters.normalizedDateRange
            let page = try await apiClient.fetchMatchesPage(
                limit: historyPageSize,
                offset: 0,
                startDate: range.start,
                endDate: range.end,
                scoreType: historyFilters.scoreType == "all" ? nil : historyFilters.scoreType,
                tournamentOnly: historyFilters.tournamentOnly
            )
            historyMatches = page
            hasMoreHistoryMatches = page.count == historyPageSize
            lastErrorMessage = nil
        } catch {
            lastErrorMessage = "Could not load match history: \(error.localizedDescription)"
        }
    }

    func loadMoreHistoryMatchesIfNeeded(currentMatch: Match) async {
        guard hasMoreHistoryMatches, !isHistoryLoadingMore else { return }
        guard let lastVisibleId = historyFilteredMatches.last?.id, lastVisibleId == currentMatch.id else { return }

        isHistoryLoadingMore = true
        defer { isHistoryLoadingMore = false }

        do {
            let offset = historyMatches.count
            let range = historyFilters.normalizedDateRange
            let nextPage = try await apiClient.fetchMatchesPage(
                limit: historyPageSize,
                offset: offset,
                startDate: range.start,
                endDate: range.end,
                scoreType: historyFilters.scoreType == "all" ? nil : historyFilters.scoreType,
                tournamentOnly: historyFilters.tournamentOnly
            )
            if nextPage.isEmpty {
                hasMoreHistoryMatches = false
                return
            }

            let existingIds = Set(historyMatches.map { $0.id })
            let deduplicated = nextPage.filter { !existingIds.contains($0.id) }
            historyMatches.append(contentsOf: deduplicated)
            hasMoreHistoryMatches = nextPage.count == historyPageSize
        } catch {
            lastErrorMessage = "Could not load more history: \(error.localizedDescription)"
        }
    }

    func bootstrap() async {
        isDashboardLoading = true
        defer { isDashboardLoading = false }

        if scheduleWeekOptions.isEmpty {
            scheduleWeekOptions = buildUpcomingWeeks()
            selectedScheduleWeekKey = scheduleWeekOptions.dropFirst().first?.key ?? scheduleWeekOptions.first?.key ?? ""
        }

        let partial = await bootstrapService.fetchInitialSnapshotPartial(historyPageSize: historyPageSize)

        if let players = partial.players {
            self.players = players
            syncProfileSetupDraftFromCurrentPlayer()
        }
        if let matches = partial.matches {
            self.matches = matches
            self.historyMatches = matches
            self.hasMoreHistoryMatches = matches.count == historyPageSize
        }
        if let schedule = partial.schedule {
            self.schedule = schedule
        }
        if let polls = partial.polls {
            self.polls = sortPolls(polls)
            syncVoteDraftsFromPolls()
        }

        if partial.hasAnySuccess {
            async let tournamentTask: Void = loadTournamentData(silently: true)
            _ = await tournamentTask
            await refreshAdminProfiles(silently: true)
            if areScheduleNotificationsEnabled {
                await notificationService.scheduleUpcomingGameReminders(schedule)
            }
            await checkForAppUpdate()
            startLiveSyncIfNeeded()
        }

        if partial.errorsBySection.isEmpty {
            self.lastErrorMessage = nil
            return
        }

        let errorSummary = partial.errorsBySection
            .sorted { $0.key < $1.key }
            .map { "\($0.key): \($0.value)" }
            .joined(separator: " | ")

        if AppConfig.allowsSampleDataFallback, !partial.hasAnySuccess {
            // Note for non-coders:
            // We keep sample fallback in developer builds so screens stay usable during
            // local setup, but production builds disable this path by default.
            let fallback = AppBootstrapSnapshot.sampleFallback
            self.players = fallback.players
            syncProfileSetupDraftFromCurrentPlayer()
            self.matches = fallback.matches
            self.schedule = fallback.schedule
            self.historyMatches = fallback.matches
            self.hasMoreHistoryMatches = false
            self.activeTournament = SampleData.tournament
            self.tournamentRounds = SampleData.tournamentRounds
            self.tournamentStandings = SampleData.tournamentStandings
            self.tournamentHistoryResults = SampleData.tournamentResultsHistory
            self.adminProfiles = []
            self.polls = fallback.polls
            self.voteDraftsByDay = [:]
            if areScheduleNotificationsEnabled {
                await notificationService.scheduleUpcomingGameReminders(schedule)
            }
            await checkForAppUpdate()
            self.lastErrorMessage = "Live data unavailable. Showing sample data for local testing. Details: \(errorSummary)"
            return
        }

        // Note for non-coders:
        // In production we do not swap to fake sample data. We keep whatever real data
        // we already have and show a clear message so users know refresh failed.
        self.lastErrorMessage = "Could not refresh all live data. Showing latest available server data. Details: \(errorSummary)"
        if !partial.hasAnySuccess, players.isEmpty, matches.isEmpty, schedule.isEmpty {
            self.lastErrorMessage = "Could not load live data from server. Please check connection and Supabase configuration, then try again. Details: \(errorSummary)"
        }
    }

    func syncHighlightDismissalWindow() {
        guard let highlight = latestHighlightMatch else { return }
        checkAndResetHighlightDismissal(for: highlight.matchDateKey)
    }

    func dismissHighlightCard() {
        guard let highlight = latestHighlightMatch else { return }
        dismissedHighlightMatchId = highlight.matchId
        dismissedHighlightDateKey = highlight.matchDateKey
        dismissalStore.set(highlight.matchId.uuidString, forKey: dismissedHighlightIdKey)
        dismissalStore.set(highlight.matchDateKey, forKey: dismissedHighlightDateKeyStore)
    }

    func dismissRecentMatchNotice() {
        guard let latest = matches.first else { return }
        dismissedRecentMatchId = latest.id
        dismissalStore.set(latest.id.uuidString, forKey: dismissedRecentMatchIdKey)
    }

    func dismissScheduledGameNotice() {
        guard let upcoming = nextScheduledGameNotice else { return }
        dismissedScheduledGameId = upcoming.id
        dismissalStore.set(upcoming.id.uuidString, forKey: dismissedScheduledGameIdKey)
    }

    func dismissTournamentNotice() {
        guard let tournament = activeTournament else { return }
        dismissedTournamentNoticeId = tournament.id
        dismissalStore.set(tournament.id.uuidString, forKey: dismissedTournamentNoticeIdKey)
    }

    func openTournamentTab() {
        selectedMainTab = 4
    }

    func openScheduleTab() {
        guard canSeeSchedule else { return }
        selectedMainTab = 3
    }

    // Note for non-coders:
    // This reads links for schedule votes and single-game mode so the app can open the right tool directly.
    func handleIncomingURL(_ url: URL) {
        guard let components = URLComponents(url: url, resolvingAgainstBaseURL: false) else { return }
        let hostOrPath = (components.host ?? components.path).lowercased()
        let items = components.queryItems ?? []

        if hostOrPath.contains("schedule") {
            openScheduleTab()

            if let pollIdString = items.first(where: { $0.name == "pollId" || $0.name == "poll" })?.value,
               let pollId = UUID(uuidString: pollIdString) {
                deepLinkedPollId = pollId
            }
            if let dayIdString = items.first(where: { $0.name == "dayId" || $0.name == "day" })?.value,
               let dayId = UUID(uuidString: dayIdString) {
                deepLinkedPollDayId = dayId
            }

            if let slotsRaw = items.first(where: { $0.name == "slots" })?.value {
                deepLinkedVoteSlots = slotsRaw
                    .split(separator: ",")
                    .compactMap { AvailabilitySlot(rawValue: String($0).trimmingCharacters(in: .whitespacesAndNewlines)) }
            } else {
                // Note for non-coders: no slots means "all day" just like web deep links.
                deepLinkedVoteSlots = []
            }

            hasPendingDeepLinkedVote = deepLinkedPollDayId != nil
            if deepLinkedPollId == nil && deepLinkedPollDayId == nil {
                scheduleActionMessage = "Länken öppnade schemafliken, men saknade omröstningsdetaljer."
            }
            return
        }

        if hostOrPath.contains("single-game") || hostOrPath.contains("singlegame") {
            guard canUseSingleGame else {
                authMessage = "Logga in för att öppna matchformuläret från en länk."
                return
            }

            selectedMainTab = 5
            if let mode = items.first(where: { $0.name == "mode" })?.value {
                deepLinkedSingleGameMode = mode.lowercased()
            }
        }
    }

    // Note for non-coders:
    // Deep-link mode is consumed once so the form does not keep resetting while you type.
    func consumeSingleGameMode() -> String? {
        defer { deepLinkedSingleGameMode = nil }
        return deepLinkedSingleGameMode
    }

    func openDashboardFiltered(_ filter: DashboardMatchFilter) {
        dashboardFilter = filter
        selectedMainTab = 1
    }

    func openHistoryTab() {
        selectedMainTab = 2
    }

    // Note for non-coders:
    // This prepares editable text fields from the current server values so users can tweak profile setup safely.
    func syncProfileSetupDraftFromCurrentPlayer() {
        guard let currentPlayer else { return }
        profileDisplayNameDraft = currentPlayer.profileName
        profileAvatarURLInput = currentPlayer.avatarURL ?? ""
        selectedFeaturedBadgeId = currentPlayer.featuredBadgeId
    }

    // Note for non-coders:
    // We save profile setup details to the same Supabase profile row used by web.
    // Avatar can be a normal URL or a locally selected image encoded as a data URL.
    func saveProfileSetup() async {
        guard let profileId = currentPlayer?.id else {
            profileSetupMessage = "Log in first to save profile setup."
            return
        }

        let trimmedName = profileDisplayNameDraft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard trimmedName.count >= 2 else {
            profileSetupMessage = "Please use at least 2 characters for your display name."
            return
        }

        let cleanedAvatar = profileAvatarURLInput.trimmingCharacters(in: .whitespacesAndNewlines)
        isSavingProfileSetup = true
        defer { isSavingProfileSetup = false }

        do {
            try await apiClient.updateOwnProfile(
                profileId: profileId,
                fullName: trimmedName,
                profileName: trimmedName,
                avatarURL: cleanedAvatar.isEmpty ? nil : cleanedAvatar,
                featuredBadgeId: selectedFeaturedBadgeId
            )
            profileSetupMessage = "Profile setup saved."
            await bootstrap()
            syncProfileSetupDraftFromCurrentPlayer()
        } catch {
            profileSetupMessage = "Could not save profile setup: \(error.localizedDescription)"
        }
    }

    // Note for non-coders:
    // This starts a background sync loop (polling fallback) so the app stays updated
    // even when another person changes data from web/admin screens.
    private func startLiveSyncIfNeeded() {
        guard isAuthenticated, liveSyncTask == nil else { return }

        liveSyncTask = Task { [weak self] in
            guard let self else { return }
            await self.runLiveSyncLoop()
        }
    }

    private func stopLiveSync() {
        liveSyncTask?.cancel()
        liveSyncTask = nil
        liveSyncDebounceTask?.cancel()
        liveSyncDebounceTask = nil
        liveUpdateBannerTask?.cancel()
        liveUpdateBannerTask = nil
        pendingLiveSyncScopes.removeAll()
        lastTournamentMarker = nil
        lastGlobalLiveMarker = nil
        lastFullLiveSyncAt = nil
        consecutiveLiveProbeFailures = 0
        liveUpdateBanner = nil
    }

    private func runLiveSyncLoop() async {
        await performLiveSyncProbe()

        while !Task.isCancelled {
            try? await Task.sleep(nanoseconds: liveSyncIntervalNanoseconds)
            guard !Task.isCancelled else { break }
            await performLiveSyncProbe()
        }
    }

    private func performLiveSyncProbe() async {
        guard isAuthenticated else { return }

        do {
            // Note for non-coders:
            // "Global live marker" is a tiny fingerprint of latest backend rows.
            // We compare old vs new marker values, then refresh only the sections that changed.
            let globalMarker = try await apiClient.fetchGlobalLiveMarker()
            let fallbackInterval = Double(liveSyncFallbackRefreshNanoseconds) / 1_000_000_000
            let plan = LiveSyncChangeDetector.plan(
                previous: lastGlobalLiveMarker,
                current: globalMarker,
                lastFullSyncAt: lastFullLiveSyncAt,
                now: Date(),
                fallbackInterval: fallbackInterval
            )
            lastGlobalLiveMarker = globalMarker

            guard !plan.changedDomains.isEmpty || plan.shouldForceFallbackRefresh else { return }

            if !plan.changedDomains.isEmpty {
                let channels = plan.changedDomains
                    .map(\.webRealtimeChannelName)
                    .sorted()
                    .joined(separator: ", ")
                liveUpdateBanner = "Live updates detected (\(channels)). Syncing latest data…"
                await performScopedLiveRefresh(domains: plan.changedDomains)
            } else {
                await performFullLiveRefresh()
            }

            lastFullLiveSyncAt = Date()
            consecutiveLiveProbeFailures = 0
        } catch {
            consecutiveLiveProbeFailures += 1
            // Note for non-coders:
            // We silently continue after transient failures so normal usage is not interrupted.
            // Next cycles keep trying automatically.
        }
    }


    private func performScopedLiveRefresh(domains: Set<LiveDataDomain>) async {
        var changedCollections: [String] = []

        do {
            if domains.contains(.players) {
                let latestPlayers = try await apiClient.fetchLeaderboard()
                if playerSignature(latestPlayers) != playerSignature(players) {
                    players = latestPlayers
                    syncProfileSetupDraftFromCurrentPlayer()
                    changedCollections.append("players")
                    if canUseAdmin {
                        await refreshAdminProfiles(silently: true)
                    }
                }
            }

            if domains.contains(.matches) {
                let latestMatches = try await apiClient.fetchRecentMatches(limit: historyPageSize)
                if matchSignature(latestMatches) != matchSignature(matches) {
                    matches = latestMatches

                    // Note for non-coders:
                    // Keep already-loaded older history pages while replacing the newest chunk.
                    let latestIds = Set(latestMatches.map { $0.id })
                    let olderAlreadyLoaded = historyMatches.filter { !latestIds.contains($0.id) }
                    historyMatches = latestMatches + olderAlreadyLoaded
                    changedCollections.append("matches")
                }
            }

            if domains.contains(.schedule) {
                let latestSchedule = try await apiClient.fetchSchedule()
                if scheduleSignature(latestSchedule) != scheduleSignature(schedule) {
                    schedule = latestSchedule
                    if areScheduleNotificationsEnabled {
                        await notificationService.scheduleUpcomingGameReminders(schedule)
                    }
                    changedCollections.append("schedule")
                }
            }

            if domains.contains(.polls) {
                let latestPolls = sortPolls(try await apiClient.fetchAvailabilityPolls())
                if pollSignature(latestPolls) != pollSignature(polls) {
                    polls = latestPolls
                    syncVoteDraftsFromPolls()
                    changedCollections.append("polls")
                }
            }

            if domains.contains(.tournaments) {
                await loadTournamentData(silently: true)
                changedCollections.append("tournament")
            }

            if !changedCollections.isEmpty {
                showLiveUpdateBanner(for: changedCollections)
            }
        } catch {
            // Note for non-coders:
            // If selective refresh fails, we do a full refresh as a safety net so data stays correct.
            await performFullLiveRefresh()
        }
    }

    private func performFullLiveRefresh() async {
        do {
            async let playersTask = apiClient.fetchLeaderboard()
            async let matchesTask = apiClient.fetchRecentMatches(limit: historyPageSize)
            async let scheduleTask = apiClient.fetchSchedule()
            async let pollsTask = apiClient.fetchAvailabilityPolls()
            async let tournamentMarkerTask = apiClient.fetchTournamentLiveMarker()

            let latestPlayers = try await playersTask
            let latestMatches = try await matchesTask
            let latestSchedule = try await scheduleTask
            let latestPolls = sortPolls(try await pollsTask)
            let latestTournamentMarker = try await tournamentMarkerTask

            var changedCollections: [String] = []

            if playerSignature(latestPlayers) != playerSignature(players) {
                players = latestPlayers
                syncProfileSetupDraftFromCurrentPlayer()
                changedCollections.append("players")
                if canUseAdmin {
                    await refreshAdminProfiles(silently: true)
                }
            }

            if matchSignature(latestMatches) != matchSignature(matches) {
                matches = latestMatches

                // Note for non-coders:
                // Live sync refreshes the newest chunk; we keep any already-loaded older
                // pages so long history doesn't disappear while background sync runs.
                let latestIds = Set(latestMatches.map { $0.id })
                let olderAlreadyLoaded = historyMatches.filter { !latestIds.contains($0.id) }
                historyMatches = latestMatches + olderAlreadyLoaded

                changedCollections.append("matches")
            }

            if scheduleSignature(latestSchedule) != scheduleSignature(schedule) {
                schedule = latestSchedule
                if areScheduleNotificationsEnabled {
                    await notificationService.scheduleUpcomingGameReminders(schedule)
                }
                changedCollections.append("schedule")
            }

            if pollSignature(latestPolls) != pollSignature(polls) {
                polls = latestPolls
                syncVoteDraftsFromPolls()
                changedCollections.append("polls")
            }

            if lastTournamentMarker != nil && lastTournamentMarker != latestTournamentMarker {
                queueLiveSync(scope: .tournaments)
            }
            lastTournamentMarker = latestTournamentMarker

            if !changedCollections.isEmpty {
                showLiveUpdateBanner(for: changedCollections)
            }
        } catch {
            // Note for non-coders:
            // Full sync errors are intentionally silent so background refresh never blocks normal app usage.
        }
    }

    private func queueLiveSync(scope: LiveSyncScope) {
        pendingLiveSyncScopes.insert(scope)
        liveSyncDebounceTask?.cancel()
        liveSyncDebounceTask = Task { [weak self] in
            guard let self else { return }
            try? await Task.sleep(nanoseconds: liveSyncDebounceNanoseconds)
            guard !Task.isCancelled else { return }
            await self.flushDebouncedLiveSync()
        }
    }

    private func flushDebouncedLiveSync() async {
        let scopes = pendingLiveSyncScopes
        pendingLiveSyncScopes.removeAll()

        if scopes.contains(.tournaments) {
            await loadTournamentData(silently: true)
            showLiveUpdateBanner(for: ["tournament"])
        }
    }

    private func showLiveUpdateBanner(for collections: [String]) {
        let unique = Array(Set(collections)).sorted()
        let noun = unique.count == 1 ? "section" : "sections"
        liveUpdateBanner = "Updated \(unique.joined(separator: ", ")) \(noun)."

        liveUpdateBannerTask?.cancel()
        liveUpdateBannerTask = Task { [weak self] in
            try? await Task.sleep(nanoseconds: 2_200_000_000)
            guard !Task.isCancelled else { return }
            await MainActor.run {
                self?.liveUpdateBanner = nil
            }
        }
    }

    private func playerSignature(_ players: [Player]) -> String {
        players
            .map { "\($0.id.uuidString)|\($0.fullName)|\($0.elo)|\($0.isAdmin)|\($0.isRegular)" }
            .joined(separator: "||")
    }

    private func matchSignature(_ matches: [Match]) -> String {
        matches
            .map {
                "\($0.id.uuidString)|\($0.playedAt.timeIntervalSince1970)|\($0.teamAScore)|\($0.teamBScore)|\($0.teamAName)|\($0.teamBName)"
            }
            .joined(separator: "||")
    }

    private func scheduleSignature(_ entries: [ScheduleEntry]) -> String {
        entries
            .map { "\($0.id.uuidString)|\($0.startsAt.timeIntervalSince1970)|\($0.location)|\($0.description)" }
            .joined(separator: "||")
    }

    private func pollSignature(_ polls: [AvailabilityPoll]) -> String {
        polls
            .map { poll in
                let days = (poll.days ?? []).map { day in
                    let votes = (day.votes ?? []).map { vote in
                        let slots = (vote.slotPreferences ?? []).map(\.rawValue).joined(separator: ",")
                        return "\(vote.profileId.uuidString)|\(vote.slot?.rawValue ?? "none")|\(slots)"
                    }.joined(separator: "#")
                    return "\(day.id.uuidString)|\(day.date)|\(votes)"
                }.joined(separator: "||")
                return "\(poll.id.uuidString)|\(poll.status.rawValue)|\(days)"
            }
            .joined(separator: "@@")
    }

    private func sortPolls(_ unsorted: [AvailabilityPoll]) -> [AvailabilityPoll] {
        unsorted.sorted { lhs, rhs in
            let lhsPriority = lhs.status == .open ? 0 : 1
            let rhsPriority = rhs.status == .open ? 0 : 1
            if lhsPriority != rhsPriority { return lhsPriority < rhsPriority }
            if lhs.weekYear != rhs.weekYear { return lhs.weekYear < rhs.weekYear }
            return lhs.weekNumber < rhs.weekNumber
        }
    }

    private func syncVoteDraftsFromPolls() {
        guard let profileId = currentPlayer?.id else {
            voteDraftsByDay = [:]
            return
        }

        var next = voteDraftsByDay
        for poll in polls {
            for day in poll.days ?? [] {
                guard next[day.id] == nil else { continue }
                if let vote = day.votes?.first(where: { $0.profileId == profileId }) {
                    let slots = Set(vote.slotPreferences ?? (vote.slot.map { [$0] } ?? []))
                    next[day.id] = VoteDraft(hasVote: true, slots: slots)
                } else {
                    next[day.id] = VoteDraft(hasVote: false, slots: [])
                }
            }
        }
        voteDraftsByDay = next
    }

    func draftForDay(_ day: AvailabilityPollDay) -> VoteDraft {
        voteDraftsByDay[day.id] ?? VoteDraft(hasVote: false, slots: [])
    }

    func setVoteEnabled(_ enabled: Bool, day: AvailabilityPollDay) {
        var draft = draftForDay(day)
        draft.hasVote = enabled
        voteDraftsByDay[day.id] = draft
    }

    func setSlot(_ slot: AvailabilitySlot, selected: Bool, day: AvailabilityPollDay) {
        var draft = draftForDay(day)
        draft.hasVote = true
        if selected {
            draft.slots.insert(slot)
        } else {
            draft.slots.remove(slot)
        }
        voteDraftsByDay[day.id] = draft
    }

    func setFullDay(_ enabled: Bool, day: AvailabilityPollDay) {
        var draft = draftForDay(day)
        draft.hasVote = true
        if enabled {
            draft.slots = []
        } else if draft.slots.isEmpty {
            // Note for non-coders:
            // Turning off "all day" preselects all explicit slots so users can quickly uncheck what they cannot do.
            draft.slots = Set(AvailabilitySlot.allCases)
        }
        voteDraftsByDay[day.id] = draft
    }

    // Note for non-coders:
    // This refreshes only schedule-related data (polls + scheduled games) without reloading every tab.
    func refreshScheduleData() async {
        isScheduleLoading = true
        defer { isScheduleLoading = false }

        do {
            async let pollsTask = apiClient.fetchAvailabilityPolls()
            async let scheduleTask = apiClient.fetchSchedule()
            polls = sortPolls(try await pollsTask)
            schedule = try await scheduleTask
            syncVoteDraftsFromPolls()
            await applyPendingDeepLinkVoteIfNeeded()
            if areScheduleNotificationsEnabled {
                await notificationService.scheduleUpcomingGameReminders(schedule)
            }
            scheduleErrorMessage = nil
        } catch {
            scheduleErrorMessage = "Could not refresh schedule data: \(error.localizedDescription)"
        }
    }

    private func applyPendingDeepLinkVoteIfNeeded() async {
        guard hasPendingDeepLinkedVote else { return }
        guard canVoteInSchedulePolls else {
            hasPendingDeepLinkedVote = false
            scheduleErrorMessage = "Du behöver regular-medlemskap för att rösta via direktlänk."
            return
        }

        guard let profileId = currentPlayer?.id,
              let dayId = deepLinkedPollDayId,
              let poll = polls.first(where: { deepLinkedPollId == nil || $0.id == deepLinkedPollId }),
              let day = poll.days?.first(where: { $0.id == dayId }) else {
            hasPendingDeepLinkedVote = false
            scheduleErrorMessage = "Direktlänken hittade ingen giltig omröstningsdag."
            return
        }

        hasPendingDeepLinkedVote = false
        voteDraftsByDay[day.id] = VoteDraft(hasVote: true, slots: Set(deepLinkedVoteSlots))

        do {
            try await apiClient.upsertAvailabilityVote(dayId: day.id, profileId: profileId, slotPreferences: deepLinkedVoteSlots)
            scheduleActionMessage = "Direktlänken öppnade rätt dag och sparade din röst."
            scheduleErrorMessage = nil
            await refreshScheduleData()
        } catch {
            scheduleErrorMessage = "Kunde inte spara röst via direktlänk: \(error.localizedDescription)"
        }
    }

    // Note for non-coders:
    // This helper mirrors web reminder rules so admins can see *why* a button is disabled.
    func reminderAvailability(for poll: AvailabilityPoll) -> (canSend: Bool, helper: String) {
        let sentCount = poll.mailLogs?.count ?? 0
        if sentCount >= 2 {
            return (false, "Max 2 mail redan skickade för denna omröstning.")
        }

        let latest = poll.mailLogs?.map(\.sentAt).max()
        guard let latest else {
            return (true, "Inga utskick ännu.")
        }

        let nextAllowed = latest.addingTimeInterval(24 * 60 * 60)
        if Date() < nextAllowed {
            let hoursLeft = Int(ceil(nextAllowed.timeIntervalSinceNow / 3600))
            return (false, "Vänta cirka \(hoursLeft)h till nästa utskick.")
        }

        return (true, "Du kan skicka påminnelse nu.")
    }

    func createAvailabilityPoll() async {
        guard canManageSchedulePolls else {
            scheduleErrorMessage = "Admin access is required to create polls."
            return
        }
        guard let option = scheduleWeekOptions.first(where: { $0.key == selectedScheduleWeekKey }) else {
            scheduleErrorMessage = "Choose a valid week first."
            return
        }
        guard let profileId = currentPlayer?.id else {
            scheduleErrorMessage = "You must be signed in with a player profile."
            return
        }

        isScheduleActionRunning = true
        defer { isScheduleActionRunning = false }

        do {
            _ = try await apiClient.createAvailabilityPoll(weekYear: option.year, weekNumber: option.week, createdBy: profileId)
            scheduleActionMessage = "Poll created successfully."
            scheduleErrorMessage = nil
            await refreshScheduleData()
        } catch {
            scheduleErrorMessage = "Could not create poll: \(error.localizedDescription)"
        }
    }

    func closeAvailabilityPoll(_ poll: AvailabilityPoll) async {
        guard canManageSchedulePolls else {
            scheduleErrorMessage = "Admin access is required to close polls."
            return
        }

        isScheduleActionRunning = true
        defer { isScheduleActionRunning = false }

        do {
            try await apiClient.closeAvailabilityPoll(pollId: poll.id)
            scheduleActionMessage = "Poll closed."
            scheduleErrorMessage = nil
            await refreshScheduleData()
        } catch {
            scheduleErrorMessage = "Could not close poll: \(error.localizedDescription)"
        }
    }

    func deleteAvailabilityPoll(_ poll: AvailabilityPoll) async {
        guard canManageSchedulePolls else {
            scheduleErrorMessage = "Admin access is required to delete polls."
            return
        }

        isScheduleActionRunning = true
        defer { isScheduleActionRunning = false }

        do {
            try await apiClient.deleteAvailabilityPoll(pollId: poll.id)
            scheduleActionMessage = "Poll deleted."
            scheduleErrorMessage = nil
            await refreshScheduleData()
        } catch {
            scheduleErrorMessage = "Could not delete poll: \(error.localizedDescription)"
        }
    }

    func submitVote(for day: AvailabilityPollDay) async {
        guard canVoteInSchedulePolls else {
            scheduleErrorMessage = "Regular member access is required to vote."
            return
        }
        guard let profileId = currentPlayer?.id else {
            scheduleErrorMessage = "You must be signed in to vote."
            return
        }

        let draft = draftForDay(day)
        isScheduleActionRunning = true
        defer { isScheduleActionRunning = false }

        do {
            if !draft.hasVote {
                try await apiClient.removeAvailabilityVote(dayId: day.id, profileId: profileId)
                scheduleActionMessage = "Vote removed."
            } else {
                try await apiClient.upsertAvailabilityVote(dayId: day.id, profileId: profileId, slotPreferences: Array(draft.slots))
                scheduleActionMessage = "Vote saved."
            }
            scheduleErrorMessage = nil
            await refreshScheduleData()
        } catch {
            scheduleErrorMessage = "Could not save vote: \(error.localizedDescription)"
        }
    }

    func sendAvailabilityReminder(for poll: AvailabilityPoll) async {
        guard canManageSchedulePolls else {
            scheduleErrorMessage = "Admin access is required to send reminders."
            return
        }

        let availability = reminderAvailability(for: poll)
        guard availability.canSend else {
            scheduleErrorMessage = availability.helper
            return
        }

        isScheduleActionRunning = true
        defer { isScheduleActionRunning = false }

        do {
            let result = try await apiClient.sendAvailabilityPollReminder(
                pollId: poll.id,
                onlyMissingVotes: onlyMissingVotesByPoll[poll.id] == true
            )
            scheduleActionMessage = "Reminder sent to \(result.sent)/\(result.total) players."
            scheduleErrorMessage = nil
            await refreshScheduleData()
        } catch {
            scheduleErrorMessage = "Could not send reminder: \(error.localizedDescription)"
        }
    }

    func sendCalendarInvite(
        pollId: UUID?,
        date: String,
        startTime: String,
        endTime: String,
        location: String?,
        inviteeProfileIds: [UUID],
        action: String,
        title: String?
    ) async {
        guard canManageSchedulePolls else {
            scheduleErrorMessage = "Adminåtkomst krävs för kalenderinbjudningar."
            return
        }

        isScheduleActionRunning = true
        defer { isScheduleActionRunning = false }

        do {
            let result = try await apiClient.sendCalendarInvite(
                pollId: pollId,
                date: date,
                startTime: startTime,
                endTime: endTime,
                location: location,
                inviteeProfileIds: inviteeProfileIds,
                action: action,
                title: title
            )
            if result.success {
                scheduleActionMessage = "Kalenderinbjudan skickad till \(result.sent)/\(result.total)."
                scheduleErrorMessage = nil
                await refreshScheduleData()
            } else {
                scheduleErrorMessage = result.error ?? "Kunde inte skicka kalenderinbjudan."
            }
        } catch {
            scheduleErrorMessage = "Kunde inte skicka kalenderinbjudan: \(error.localizedDescription)"
        }
    }

    func deleteMatch(_ match: Match) async {
        guard canDeleteMatch(match) else {
            statusMessage = "Du kan bara radera egna matcher (eller vara admin)."
            return
        }
        do {
            try await apiClient.deleteMatch(matchId: match.id)
            matches.removeAll { $0.id == match.id }
            statusMessage = "Matchen raderades."
        } catch {
            statusMessage = "Kunde inte radera matchen: \(error.localizedDescription)"
        }
    }

    func updateMatch(
        _ match: Match,
        playedAt: Date,
        teamAScore: Int,
        teamBScore: Int,
        scoreType: String,
        scoreTarget: Int?
    ) async {
        guard canUseAdmin else {
            statusMessage = "Endast admin kan ändra matcher i iOS-appen just nu."
            return
        }
        do {
            try await apiClient.updateMatch(
                matchId: match.id,
                playedAt: playedAt,
                teamAScore: teamAScore,
                teamBScore: teamBScore,
                scoreType: scoreType,
                scoreTarget: scoreTarget
            )
            await bootstrap()
            statusMessage = "Matchresultat uppdaterat."
        } catch {
            statusMessage = "Kunde inte uppdatera matchen: \(error.localizedDescription)"
        }
    }

    private func buildUpcomingWeeks(count: Int = 26) -> [ScheduleWeekOption] {
        var calendar = Calendar(identifier: .iso8601)
        calendar.timeZone = .current

        var options: [ScheduleWeekOption] = []
        var seen: Set<String> = []

        for offset in stride(from: 0, to: count * 7 + 1, by: 7) {
            guard options.count < count else { break }
            let date = calendar.date(byAdding: .day, value: offset, to: .now) ?? .now
            let week = calendar.component(.weekOfYear, from: date)
            let year = calendar.component(.yearForWeekOfYear, from: date)
            let key = "\(year)-W\(String(format: "%02d", week))"
            guard !seen.contains(key) else { continue }
            seen.insert(key)
            options.append(ScheduleWeekOption(key: key, label: "Week \(week) (\(year))", week: week, year: year))
        }

        return options
    }

    func refreshAdminProfiles(silently: Bool = false) async {
        guard canUseAdmin else {
            adminProfiles = []
            return
        }

        if !silently {
            isAdminActionRunning = true
        }
        defer {
            if !silently {
                isAdminActionRunning = false
            }
        }

        do {
            adminProfiles = try await apiClient.fetchAdminProfiles()
        } catch {
            adminBanner = AdminActionBanner(
                message: "Could not refresh admin users: \(error.localizedDescription)",
                style: .failure
            )
        }
    }

    func setApproval(for profile: AdminProfile, approved: Bool) async {
        await runAdminMutation(successMessage: approved ? "User approved." : "User approval removed.") {
            try await apiClient.updateProfileAdminFlags(profileId: profile.id, isApproved: approved)
        }
    }

    func setAdminRole(for profile: AdminProfile, isAdmin: Bool) async {
        await runAdminMutation(successMessage: isAdmin ? "Admin role granted." : "Admin role removed.") {
            try await apiClient.updateProfileAdminFlags(profileId: profile.id, isAdmin: isAdmin)
        }
    }

    func setRegularRole(for profile: AdminProfile, isRegular: Bool) async {
        await runAdminMutation(successMessage: isRegular ? "Regular access enabled." : "Regular access removed.") {
            try await apiClient.updateProfileAdminFlags(profileId: profile.id, isRegular: isRegular)
        }
    }

    func deactivateProfile(_ profile: AdminProfile) async {
        if currentPlayer?.id == profile.id {
            adminBanner = AdminActionBanner(
                message: "You cannot deactivate your own admin profile.",
                style: .failure
            )
            return
        }

        await runAdminMutation(successMessage: "User deactivated.") {
            try await apiClient.deactivateProfile(profileId: profile.id)
        }
    }

    private func runAdminMutation(successMessage: String, action: () async throws -> Void) async {
        guard canUseAdmin else {
            adminBanner = AdminActionBanner(
                message: "Admin access is required to perform this action.",
                style: .failure
            )
            return
        }

        isAdminActionRunning = true
        defer { isAdminActionRunning = false }

        do {
            try await action()
            adminBanner = AdminActionBanner(message: successMessage, style: .success)
            await refreshAdminProfiles(silently: true)
        } catch {
            adminBanner = AdminActionBanner(
                message: "Admin action failed: \(error.localizedDescription)",
                style: .failure
            )
        }
    }


    var adminMatchEveningOptions: [String] {
        let formatter = Self.adminDayFormatter
        let keys = Set(matches.map { formatter.string(from: $0.playedAt) })
        return keys.sorted(by: >)
    }

    // Note for non-coders:
    // This creates a plain-language report text that admins can preview and share.
    func generateMatchEveningReport(for dayKey: String) {
        guard canUseAdmin else {
            adminReportStatusMessage = "Admin access is required to create reports."
            return
        }

        let formatter = Self.adminDayFormatter
        let selectedMatches = matches.filter { formatter.string(from: $0.playedAt) == dayKey }

        guard selectedMatches.isEmpty == false else {
            adminReportPreviewText = nil
            adminReportStatusMessage = "No matches found for \(dayKey)."
            return
        }

        let totalMatches = selectedMatches.count
        let totalGames = selectedMatches.reduce(0) { $0 + $1.teamAScore + $1.teamBScore }

        var winsByPlayer: [UUID: Int] = [:]
        for match in selectedMatches {
            let teamAWon = match.teamAScore > match.teamBScore
            let winners = teamAWon ? match.teamAPlayerIds : match.teamBPlayerIds
            for id in winners {
                guard let id else { continue }
                winsByPlayer[id, default: 0] += 1
            }
        }

        let topEntries = winsByPlayer
            .sorted { lhs, rhs in
                if lhs.value != rhs.value { return lhs.value > rhs.value }
                let leftName = players.first(where: { $0.id == lhs.key })?.fullName ?? "Guest"
                let rightName = players.first(where: { $0.id == rhs.key })?.fullName ?? "Guest"
                return leftName < rightName
            }
            .prefix(3)
            .map { entry in
                let name = players.first(where: { $0.id == entry.key })?.fullName ?? "Guest"
                return "• \(name): \(entry.value) wins"
            }

        adminReportPreviewText = ([
            "Match Evening Report",
            "Date: \(dayKey)",
            "Matches played: \(totalMatches)",
            "Total games scored: \(totalGames)",
            "",
            "Top performers:",
            topEntries.isEmpty ? "• No winners could be calculated." : topEntries.joined(separator: "\n")
        ]).joined(separator: "\n")
        adminReportStatusMessage = "Evening report ready to preview/share."
    }

    // Note for non-coders:
    // This composes a share-friendly tournament summary similar to the web admin share output.
    func generateTournamentReport(for tournamentId: UUID) async {
        guard canUseAdmin else {
            adminReportStatusMessage = "Admin access is required to create reports."
            return
        }

        isAdminReportRunning = true
        defer { isAdminReportRunning = false }

        do {
            let standings = try await apiClient.fetchTournamentStandings(tournamentId: tournamentId)
            guard let tournament = tournaments.first(where: { $0.id == tournamentId }) else {
                adminReportStatusMessage = "Tournament not found in local state."
                return
            }

            let lines = standings.prefix(8).map { result in
                let name = players.first(where: { $0.id == result.profileId })?.fullName ?? "Guest"
                return "#\(result.rank) \(name) • \(result.pointsFor) pts • W\(result.wins)-L\(result.losses)"
            }

            adminReportPreviewText = ([
                "Tournament Report",
                "Name: \(tournament.name)",
                "Type: \(tournament.tournamentType.capitalized)",
                "Status: \(tournament.status)",
                "",
                "Standings:",
                lines.isEmpty ? "No standings found yet." : lines.joined(separator: "\n")
            ]).joined(separator: "\n")
            adminReportStatusMessage = "Tournament report ready to preview/share."
        } catch {
            adminReportStatusMessage = "Could not generate tournament report: \(error.localizedDescription)"
        }
    }

    func buildWeeklyEmailPreview(timeframe: AdminWeeklyTimeframe, week: Int?, year: Int?) {
        guard canUseAdmin else {
            adminEmailStatusMessage = "Admin access is required to preview email actions."
            return
        }

        let now = Date()
        let calendar = Calendar(identifier: .iso8601)
        let startDate: Date
        switch timeframe {
        case .last7:
            startDate = calendar.date(byAdding: .day, value: -7, to: now) ?? now
        case .last30:
            startDate = calendar.date(byAdding: .day, value: -30, to: now) ?? now
        case .isoWeek:
            if let week, let year {
                var components = DateComponents()
                components.calendar = calendar
                components.yearForWeekOfYear = year
                components.weekOfYear = week
                components.weekday = 2
                startDate = calendar.date(from: components) ?? now
            } else {
                startDate = calendar.date(byAdding: .day, value: -7, to: now) ?? now
            }
        }

        let filtered = matches.filter { $0.playedAt >= startDate && $0.playedAt <= now }
        let uniquePlayers = Set(filtered.flatMap { $0.teamAPlayerIds + $0.teamBPlayerIds }.compactMap { $0 })

        adminEmailPreviewText = ([
            "Weekly Email Preview",
            "Timeframe: \(timeframe.title)",
            "Matches in window: \(filtered.count)",
            "Players included: \(uniquePlayers.count)",
            "",
            "Note for non-coders: this preview estimates who would appear in the weekly email before sending any test/broadcast action."
        ]).joined(separator: "\n")
        adminEmailStatusMessage = "Weekly preview generated."
    }

    func buildTournamentEmailPreview(for tournamentId: UUID) async {
        guard canUseAdmin else {
            adminEmailStatusMessage = "Admin access is required to preview email actions."
            return
        }

        isAdminEmailActionRunning = true
        defer { isAdminEmailActionRunning = false }

        do {
            let rounds = try await apiClient.fetchTournamentRounds(tournamentId: tournamentId)
            let standings = try await apiClient.fetchTournamentStandings(tournamentId: tournamentId)
            guard let tournament = tournaments.first(where: { $0.id == tournamentId }) else {
                adminEmailStatusMessage = "Tournament not found in local state."
                return
            }

            adminEmailPreviewText = ([
                "Tournament Email Preview",
                "Tournament: \(tournament.name)",
                "Rounds with scores: \(rounds.filter { $0.team1Score != nil && $0.team2Score != nil }.count)",
                "Standings rows: \(standings.count)",
                "",
                "Note for non-coders: this preview checks that tournament data is present before you run a test send action."
            ]).joined(separator: "\n")
            adminEmailStatusMessage = "Tournament preview generated."
        } catch {
            adminEmailStatusMessage = "Could not build tournament preview: \(error.localizedDescription)"
        }
    }

    func sendWeeklyEmailTest(timeframe: AdminWeeklyTimeframe, week: Int?, year: Int?) async {
        guard canUseAdmin else {
            adminEmailStatusMessage = "Admin access is required to send weekly email tests."
            return
        }
        guard let accessToken = authService.currentAccessToken() else {
            adminEmailStatusMessage = "Missing session token. Please sign in again."
            return
        }

        isAdminEmailActionRunning = true
        defer { isAdminEmailActionRunning = false }

        do {
            let response = try await apiClient.invokeWeeklySummary(
                accessToken: accessToken,
                playerId: currentPlayer?.id,
                timeframe: timeframe.rawValue,
                week: week,
                year: year
            )
            if response.success == true {
                adminEmailStatusMessage = "Weekly email action completed. Sent \(response.sent ?? 0) of \(response.total ?? 0)."
            } else {
                let details = response.error ?? response.message ?? "Unknown error"
                adminEmailStatusMessage = "Weekly email action failed: \(details)"
            }
        } catch {
            adminEmailStatusMessage = "Could not send weekly email action: \(error.localizedDescription)"
        }
    }

    func sendTournamentEmailTest() async {
        guard canUseAdmin else {
            adminEmailStatusMessage = "Admin access is required to run tournament email actions."
            return
        }
        guard let accessToken = authService.currentAccessToken() else {
            adminEmailStatusMessage = "Missing session token. Please sign in again."
            return
        }

        isAdminEmailActionRunning = true
        defer { isAdminEmailActionRunning = false }

        do {
            let response = try await apiClient.invokeTournamentSummary(accessToken: accessToken)
            if response.success == true {
                adminEmailStatusMessage = "Tournament email action completed. Sent \(response.sent ?? 0), skipped \(response.skipped ?? 0)."
            } else {
                adminEmailStatusMessage = "Tournament email action failed: \(response.error ?? response.message ?? "Unknown error")"
            }
        } catch {
            adminEmailStatusMessage = "Could not run tournament email action: \(error.localizedDescription)"
        }
    }



    func loadTournamentData(silently: Bool = false) async {
        if !silently {
            isTournamentLoading = true
        }
        defer {
            if !silently {
                isTournamentLoading = false
            }
        }

        do {
            let allTournaments = try await apiClient.fetchTournaments()
            tournaments = allTournaments

            if selectedTournamentId == nil {
                selectedTournamentId = allTournaments.first(where: { $0.status == "in_progress" || $0.status == "draft" })?.id
                    ?? allTournaments.first?.id
            } else if let selectedTournamentId,
                      allTournaments.contains(where: { $0.id == selectedTournamentId }) == false {
                self.selectedTournamentId = allTournaments.first?.id
            }

            let tournament = allTournaments.first(where: { $0.id == selectedTournamentId })
                ?? allTournaments.first(where: { $0.status == "in_progress" || $0.status == "draft" })
            activeTournament = tournament

            if let tournament {
                async let roundsTask = apiClient.fetchTournamentRounds(tournamentId: tournament.id)
                async let standingsTask = apiClient.fetchTournamentStandings(tournamentId: tournament.id)
                async let participantsTask = apiClient.fetchTournamentParticipants(tournamentId: tournament.id)
                let rounds = try await roundsTask
                let standingRows = try await standingsTask
                tournamentParticipants = try await participantsTask
                tournamentRounds = rounds
                tournamentStandings = resolveStandings(fromRounds: rounds, backendResults: standingRows)
            } else {
                tournamentParticipants = []
                tournamentRounds = []
                tournamentStandings = []
            }

            tournamentHistoryResults = try await apiClient.fetchCompletedTournamentResults()
            tournamentStatusMessage = nil
            tournamentActionErrorMessage = nil
        } catch {
            // Note for non-coders:
            // If the network call fails, we keep any on-screen tournament data intact
            // and show a message so users know they can try a manual refresh.
            tournamentStatusMessage = "Could not load tournament data: \(error.localizedDescription)"
        }
    }

    func selectTournament(id: UUID?) async {
        selectedTournamentId = id
        await loadTournamentData(silently: true)
    }

    func createTournament(
        name: String,
        location: String?,
        scheduledAt: Date?,
        scoreTarget: Int?,
        tournamentType: String,
        participantIds: [UUID]
    ) async {
        guard canMutateTournament else {
            tournamentActionErrorMessage = "Sign in is required to create tournaments."
            return
        }

        let cleanName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        if cleanName.isEmpty {
            tournamentActionErrorMessage = "Tournament name is required."
            return
        }

        if participantIds.count < 4 {
            tournamentActionErrorMessage = "Choose at least 4 participants before creating a tournament."
            return
        }

        isTournamentActionRunning = true
        tournamentActionErrorMessage = nil

        do {
            let created = try await apiClient.createTournament(
                TournamentCreationRequest(
                    name: cleanName,
                    status: "draft",
                    tournamentType: tournamentType,
                    scheduledAt: scheduledAt,
                    location: location?.trimmingCharacters(in: .whitespacesAndNewlines),
                    scoreTarget: scoreTarget
                )
            )
            try await apiClient.replaceTournamentParticipants(tournamentId: created.id, participantIds: participantIds)
            selectedTournamentId = created.id
            tournamentStatusMessage = "Tournament created in draft mode with \(participantIds.count) participants."
            await loadTournamentData(silently: false)
        } catch {
            tournamentActionErrorMessage = "Could not create tournament: \(error.localizedDescription)"
        }

        isTournamentActionRunning = false
    }

    func startSelectedTournament() async {
        await transitionSelectedTournament(to: "in_progress", successMessage: "Tournament started.")
    }

    func abandonSelectedTournament() async {
        await transitionSelectedTournament(to: "abandoned", successMessage: "Tournament marked as abandoned.")
    }

    func cancelSelectedTournament() async {
        await transitionSelectedTournament(to: "cancelled", successMessage: "Tournament cancelled.")
    }

    func deleteSelectedTournament() async {
        guard canMutateTournament else {
            tournamentActionErrorMessage = "Sign in is required to delete tournaments."
            return
        }

        guard let selected = activeTournament else {
            tournamentActionErrorMessage = "Choose a tournament to delete first."
            return
        }

        let previousTournaments = tournaments
        tournaments.removeAll { $0.id == selected.id }
        if selectedTournamentId == selected.id {
            selectedTournamentId = tournaments.first?.id
        }

        // Note for non-coders:
        // Only tournament creation receives a fresh participant list from the UI form.
        // Delete/start/score/complete actions work on an already-created tournament,
        // so they should not reference a local `participantIds` variable here.
        isTournamentActionRunning = true
        tournamentActionErrorMessage = nil

        do {
            try await apiClient.deleteTournament(tournamentId: selected.id)
            tournamentStatusMessage = "Tournament deleted."
            await loadTournamentData(silently: false)
        } catch {
            tournaments = previousTournaments
            selectedTournamentId = selected.id
            tournamentActionErrorMessage = "Could not delete tournament: \(error.localizedDescription)"
        }

        isTournamentActionRunning = false
    }

    func exportTextForSelectedCompletedTournament() -> String? {
        guard let tournament = activeTournament, tournament.status == "completed" else { return nil }
        guard tournamentStandings.isEmpty == false else { return nil }

        let lines = tournamentStandings.map { standing in
            "#\(standing.rank) \(standing.playerName) • \(standing.pointsFor) pts • W\(standing.wins)-L\(standing.losses)"
        }
        let scoredRounds = tournamentRounds.filter { $0.team1Score != nil && $0.team2Score != nil }.count
        let totalRounds = tournamentRounds.count

        // Note for non-coders:
        // This richer payload includes format, rounds, and optional location/date so the
        // shared text works like an event recap (similar to web share output).
        return ([
            "\(tournament.name) (\(tournament.tournamentType.capitalized))",
            "Status: Completed",
            tournament.location?.isEmpty == false ? "Location: \(tournament.location!)" : nil,
            tournament.scheduledAt.map { "Scheduled: \(Self.uiDateTimeFormatter.string(from: $0))" },
            "Rounds scored: \(scoredRounds)/\(totalRounds)",
            "",
            "Standings:",
        ].compactMap { $0 } + lines).joined(separator: "\n")
    }


    func saveTournamentRound(round: TournamentRound, team1Score: Int, team2Score: Int) async {
        guard canMutateTournament else {
            tournamentStatusMessage = "Sign in is required to save scores."
            return
        }

        isTournamentActionRunning = true
        tournamentActionErrorMessage = nil

        do {
            try await apiClient.saveTournamentRoundScore(roundId: round.id, team1Score: team1Score, team2Score: team2Score)
            tournamentStatusMessage = "Round \(round.roundNumber) score saved."
            await loadTournamentData(silently: false)
        } catch {
            tournamentActionErrorMessage = "Could not save round score: \(error.localizedDescription)"
        }

        isTournamentActionRunning = false
    }

    func completeActiveTournament() async {
        guard canMutateTournament else {
            tournamentStatusMessage = "Sign in is required to complete tournaments."
            return
        }

        guard let tournament = activeTournament else {
            tournamentStatusMessage = "No active tournament to complete."
            return
        }

        isTournamentActionRunning = true
        tournamentActionErrorMessage = nil

        do {
            let submissions = tournamentStandings.map {
                TournamentResultSubmission(
                    tournamentId: tournament.id,
                    profileId: $0.profileId,
                    rank: $0.rank,
                    pointsFor: $0.pointsFor,
                    pointsAgainst: $0.pointsAgainst,
                    matchesPlayed: $0.matchesPlayed,
                    wins: $0.wins,
                    losses: $0.losses
                )
            }
            try await apiClient.saveTournamentStandings(submissions)
            try await apiClient.completeTournament(tournamentId: tournament.id)
            tournamentStatusMessage = "Tournament completed and standings saved."
            await loadTournamentData(silently: false)
        } catch {
            tournamentActionErrorMessage = "Could not complete tournament: \(error.localizedDescription)"
        }

        isTournamentActionRunning = false
    }

    private func transitionSelectedTournament(to status: String, successMessage: String) async {
        guard canMutateTournament else {
            tournamentActionErrorMessage = "Sign in is required to update tournaments."
            return
        }

        guard let selected = activeTournament else {
            tournamentActionErrorMessage = "Choose a tournament first."
            return
        }

        let previousTournament = selected
        if let index = tournaments.firstIndex(where: { $0.id == selected.id }) {
            tournaments[index] = Tournament(
                id: selected.id,
                name: selected.name,
                status: status,
                tournamentType: selected.tournamentType,
                scheduledAt: selected.scheduledAt,
                completedAt: selected.completedAt,
                location: selected.location,
                scoreTarget: selected.scoreTarget,
                createdAt: selected.createdAt
            )
            activeTournament = tournaments[index]
        }
        isTournamentActionRunning = true
        tournamentActionErrorMessage = nil

        do {
            try await apiClient.updateTournamentStatus(tournamentId: selected.id, status: status)
            tournamentStatusMessage = successMessage
            await loadTournamentData(silently: false)
        } catch {
            if let index = tournaments.firstIndex(where: { $0.id == previousTournament.id }) {
                tournaments[index] = previousTournament
            }
            activeTournament = previousTournament
            tournamentActionErrorMessage = "Could not update tournament: \(error.localizedDescription)"
        }

        isTournamentActionRunning = false
    }

    private func resolveStandings(fromRounds rounds: [TournamentRound], backendResults: [TournamentResult]) -> [TournamentStanding] {
        if !backendResults.isEmpty {
            return backendResults.compactMap { result in
                guard let profileId = result.profileId else { return nil }
                return TournamentStanding(
                    id: result.id,
                    profileId: profileId,
                    playerName: tournamentPlayerName(for: profileId),
                    rank: result.rank,
                    pointsFor: result.pointsFor,
                    pointsAgainst: result.pointsAgainst,
                    wins: result.wins,
                    losses: result.losses,
                    matchesPlayed: result.matchesPlayed
                )
            }
        }

        struct Accumulator {
            var pointsFor = 0
            var pointsAgainst = 0
            var wins = 0
            var losses = 0
            var matchesPlayed = 0
        }

        var stats: [UUID: Accumulator] = [:]
        for round in rounds {
            guard let team1Score = round.team1Score, let team2Score = round.team2Score else { continue }

            for playerId in round.team1Ids {
                var current = stats[playerId, default: Accumulator()]
                current.pointsFor += team1Score
                current.pointsAgainst += team2Score
                current.matchesPlayed += 1
                if team1Score > team2Score {
                    current.wins += 1
                } else if team1Score < team2Score {
                    current.losses += 1
                }
                stats[playerId] = current
            }

            for playerId in round.team2Ids {
                var current = stats[playerId, default: Accumulator()]
                current.pointsFor += team2Score
                current.pointsAgainst += team1Score
                current.matchesPlayed += 1
                if team2Score > team1Score {
                    current.wins += 1
                } else if team2Score < team1Score {
                    current.losses += 1
                }
                stats[playerId] = current
            }
        }

        let sorted = stats.map { playerId, stat in
            TournamentStanding(
                id: playerId,
                profileId: playerId,
                playerName: tournamentPlayerName(for: playerId),
                rank: 0,
                pointsFor: stat.pointsFor,
                pointsAgainst: stat.pointsAgainst,
                wins: stat.wins,
                losses: stat.losses,
                matchesPlayed: stat.matchesPlayed
            )
        }
        .sorted { lhs, rhs in
            if lhs.pointsFor != rhs.pointsFor { return lhs.pointsFor > rhs.pointsFor }
            if lhs.pointDiff != rhs.pointDiff { return lhs.pointDiff > rhs.pointDiff }
            return lhs.wins > rhs.wins
        }

        return sorted.enumerated().map { index, standing in
            TournamentStanding(
                id: standing.id,
                profileId: standing.profileId,
                playerName: standing.playerName,
                rank: index + 1,
                pointsFor: standing.pointsFor,
                pointsAgainst: standing.pointsAgainst,
                wins: standing.wins,
                losses: standing.losses,
                matchesPlayed: standing.matchesPlayed
            )
        }
    }


    // Note for non-coders:
    // We store up to two player names per team to match the web schema exactly.
    // If someone enters only one name, we pad with an empty second slot instead of failing the save.
    private func findMatchHighlight(matches: [Match], players: [Player]) -> DashboardMatchHighlight? {
        guard !matches.isEmpty, !players.isEmpty else { return nil }

        let latestDate = Calendar.current.startOfDay(for: matches[0].playedAt)
        let latestMatches = matches.filter { Calendar.current.isDate($0.playedAt, inSameDayAs: latestDate) }
        guard !latestMatches.isEmpty else { return nil }

        struct Candidate {
            let match: Match
            let reason: DashboardMatchHighlight.Reason
            let score: Double
            let title: String
            let description: String
        }

        let eloByPlayer = Dictionary(uniqueKeysWithValues: players.map { ($0.id, Double($0.elo)) })
        var candidates: [Candidate] = []

        for match in latestMatches {
            let teamAElo = averagePreMatchElo(for: match.teamAPlayerIds, eloByPlayer: eloByPlayer)
            let teamBElo = averagePreMatchElo(for: match.teamBPlayerIds, eloByPlayer: eloByPlayer)
            let expectedAWin = expectedScore(teamAElo, teamBElo)
            let teamAWon = match.teamAScore > match.teamBScore
            let winnerExpected = teamAWon ? expectedAWin : (1 - expectedAWin)
            let margin = abs(match.teamAScore - match.teamBScore)
            let totalElo = teamAElo + teamBElo

            if winnerExpected < 0.35 {
                candidates.append(Candidate(
                    match: match,
                    reason: .upset,
                    score: (0.5 - winnerExpected) * 100,
                    title: "Kvällens Skräll",
                    description: "Underdog-seger! \(teamAWon ? "Lag 1" : "Lag 2") vann trots låg vinstchans."
                ))
            }

            if margin <= 1 {
                candidates.append(Candidate(
                    match: match,
                    reason: .thriller,
                    score: 50 - abs(winnerExpected - 0.5) * 20,
                    title: "Kvällens Rysare",
                    description: "En jämn match som slutade \(match.teamAScore)-\(match.teamBScore)."
                ))
            }

            if margin >= 3 {
                candidates.append(Candidate(
                    match: match,
                    reason: .crush,
                    score: Double(margin * 10),
                    title: "Kvällens Kross",
                    description: "Klar seger med \(match.teamAScore)-\(match.teamBScore)."
                ))
            }

            if totalElo > 2200 {
                candidates.append(Candidate(
                    match: match,
                    reason: .titans,
                    score: (totalElo - 2000) / 10,
                    title: "Giganternas Kamp",
                    description: "Match med kvällens högsta samlade ELO (\(Int(totalElo.rounded())))."
                ))
            }
        }

        guard !candidates.isEmpty else { return nil }

        let priority: [DashboardMatchHighlight.Reason: Int] = [.upset: 4, .thriller: 3, .crush: 2, .titans: 1]
        let best = candidates.sorted { lhs, rhs in
            let lp = priority[lhs.reason, default: 0]
            let rp = priority[rhs.reason, default: 0]
            if lp != rp { return lp > rp }
            return lhs.score > rhs.score
        }.first

        guard let best else { return nil }
        return DashboardMatchHighlight(
            matchId: best.match.id,
            reason: best.reason,
            title: best.title,
            description: best.description,
            matchDateKey: Self.dayKey(for: best.match.playedAt)
        )
    }

    private var matchesForSameEvening: [Match] {
        guard let latest = matches.first else { return [] }
        return matches.filter { Calendar.current.isDate($0.playedAt, inSameDayAs: latest.playedAt) }
    }

    private func mvp(for periodMatches: [Match], minimumGames: Int) -> DashboardMVPResult? {
        guard !periodMatches.isEmpty else { return nil }

        struct MvpStat {
            var wins = 0
            var games = 0
            var periodEloGain = 0
        }

        var stats: [UUID: MvpStat] = [:]

        for match in periodMatches {
            let teamAWon = match.teamAScore > match.teamBScore
            let margin = abs(match.teamAScore - match.teamBScore)
            let gain = max(4, margin * 2)

            for id in match.teamAPlayerIds.compactMap({ $0 }) {
                var current = stats[id, default: MvpStat()]
                current.games += 1
                current.periodEloGain += teamAWon ? gain : -gain
                if teamAWon { current.wins += 1 }
                stats[id] = current
            }

            for id in match.teamBPlayerIds.compactMap({ $0 }) {
                var current = stats[id, default: MvpStat()]
                current.games += 1
                current.periodEloGain += teamAWon ? -gain : gain
                if !teamAWon { current.wins += 1 }
                stats[id] = current
            }
        }

        // Note for non-coders:
        // This scoring mirrors the web formula: Elo gain + win-rate bonus + activity bonus.
        let scored: [DashboardMVPResult] = players.compactMap { player in
            let stat = stats[player.id] ?? MvpStat()
            guard stat.games >= minimumGames else { return nil }
            let winRate = stat.games == 0 ? 0 : Double(stat.wins) / Double(stat.games)
            let score = Double(stat.periodEloGain) + (winRate * 15) + (Double(stat.games) * 0.5)
            return DashboardMVPResult(player: player, wins: stat.wins, games: stat.games, periodEloGain: stat.periodEloGain, score: score)
        }

        return scored.sorted { lhs, rhs in
            if abs(lhs.score - rhs.score) > 0.001 { return lhs.score > rhs.score }
            if lhs.periodEloGain != rhs.periodEloGain { return lhs.periodEloGain > rhs.periodEloGain }
            if lhs.player.elo != rhs.player.elo { return lhs.player.elo > rhs.player.elo }
            if lhs.wins != rhs.wins { return lhs.wins > rhs.wins }
            return lhs.player.fullName.localizedCaseInsensitiveCompare(rhs.player.fullName) == .orderedAscending
        }.first
    }

    private func averagePreMatchElo(for playerIds: [UUID?], eloByPlayer: [UUID: Double]) -> Double {
        let values = playerIds.compactMap { id -> Double? in
            guard let id else { return nil }
            return eloByPlayer[id]
        }
        guard !values.isEmpty else { return 1000 }
        return values.reduce(0, +) / Double(values.count)
    }

    private func expectedScore(_ a: Double, _ b: Double) -> Double {
        1 / (1 + pow(10, (b - a) / 400))
    }

    private func checkAndResetHighlightDismissal(for matchDateKey: String) {
        guard dismissedHighlightDateKey != matchDateKey else { return }
        dismissedHighlightDateKey = matchDateKey
        dismissedHighlightMatchId = nil
        dismissalStore.set(matchDateKey, forKey: dismissedHighlightDateKeyStore)
        dismissalStore.removeObject(forKey: dismissedHighlightIdKey)
    }

    private static func dayKey(for date: Date) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: date)
    }

    private static func uuidValue(from store: UserDefaults, key: String) -> UUID? {
        guard let raw = store.string(forKey: key) else { return nil }
        return UUID(uuidString: raw)
    }

    private func normalizedTeamNames(from rawTeam: String) -> [String] {
        var names = rawTeam
            .split(separator: "&")
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }

        if names.isEmpty {
            names = [rawTeam.trimmingCharacters(in: .whitespacesAndNewlines)]
        }
        if names.count == 1 {
            names.append("")
        }
        if names.count > 2 {
            names = Array(names.prefix(2))
        }
        return names
    }
    func suggestSingleGameMatchup(isOneVsOne: Bool) -> SingleGameSuggestion? {
        let requiredPlayers = isOneVsOne ? 2 : 4
        let availablePlayers = players

        guard availablePlayers.count >= requiredPlayers else {
            statusMessage = "Det behövs minst \(requiredPlayers) spelare för att föreslå en match."
            return nil
        }

        var gamesByPlayer: [UUID: Int] = [:]
        var teammateCounts: [String: Int] = [:]
        var opponentCounts: [String: Int] = [:]

        func pairKey(_ a: UUID, _ b: UUID) -> String {
            [a.uuidString, b.uuidString].sorted().joined(separator: "|")
        }

        for match in matches {
            let teamA = match.teamAPlayerIds.compactMap { $0 }
            let teamB = match.teamBPlayerIds.compactMap { $0 }

            for id in teamA + teamB {
                gamesByPlayer[id, default: 0] += 1
            }

            if teamA.count == 2 {
                teammateCounts[pairKey(teamA[0], teamA[1]), default: 0] += 1
            }
            if teamB.count == 2 {
                teammateCounts[pairKey(teamB[0], teamB[1]), default: 0] += 1
            }

            for aId in teamA {
                for bId in teamB {
                    opponentCounts[pairKey(aId, bId), default: 0] += 1
                }
            }
        }

        func averageElo(_ ids: [UUID]) -> Double {
            guard ids.isEmpty == false else { return 1400 }
            let total = ids.reduce(0.0) { partial, id in
                partial + Double(availablePlayers.first(where: { $0.id == id })?.elo ?? 1400)
            }
            return total / Double(ids.count)
        }

        func choose<T>(_ source: [T], count: Int) -> [[T]] {
            guard count > 0 else { return [[]] }
            guard source.count >= count else { return [] }
            var result: [[T]] = []
            func recurse(_ index: Int, _ current: [T]) {
                if current.count == count {
                    result.append(current)
                    return
                }
                guard index < source.count else { return }

                for next in index..<(source.count - (count - current.count) + 1) {
                    recurse(next + 1, current + [source[next]])
                }
            }
            recurse(0, [])
            return result
        }

        let playerIds = availablePlayers.map(\.id)
        let gameTarget = Double(requiredPlayers)
        var bestCandidate: (score: Double, teamA: [UUID], teamB: [UUID], fairness: Int, winProbability: Double)?

        if isOneVsOne {
            for pair in choose(playerIds, count: 2) {
                let teamA = [pair[0]]
                let teamB = [pair[1]]
                let winProbability = expectedScore(averageElo(teamA), averageElo(teamB))
                let fairness = max(0, min(100, Int(round((1 - abs(0.5 - winProbability) * 2) * 100))))
                let opponentPenalty = Double(opponentCounts[pairKey(teamA[0], teamB[0]), default: 0])
                let gamePenalty = Double(gamesByPlayer[teamA[0], default: 0] + gamesByPlayer[teamB[0], default: 0])
                let underplayedBonus = (gameTarget - gamePenalty) * 0.5
                let score = Double(fairness) * 2 - opponentPenalty * 8 - gamePenalty * 3 + underplayedBonus

                if bestCandidate == nil || score > bestCandidate!.score {
                    bestCandidate = (score, teamA, teamB, fairness, winProbability)
                }
            }
        } else {
            for group in choose(playerIds, count: 4) {
                let p1 = group[0]
                let p2 = group[1]
                let p3 = group[2]
                let p4 = group[3]
                let splits = [
                    ([p1, p2], [p3, p4]),
                    ([p1, p3], [p2, p4]),
                    ([p1, p4], [p2, p3]),
                ]

                for split in splits {
                    let teamA = split.0
                    let teamB = split.1
                    let winProbability = expectedScore(averageElo(teamA), averageElo(teamB))
                    let fairness = max(0, min(100, Int(round((1 - abs(0.5 - winProbability) * 2) * 100))))

                    let teammatePenalty = Double(teammateCounts[pairKey(teamA[0], teamA[1]), default: 0] + teammateCounts[pairKey(teamB[0], teamB[1]), default: 0])
                    let opponentPenalty = Double(teamA.reduce(into: 0) { partial, aId in
                        partial += teamB.reduce(0) { $0 + opponentCounts[pairKey(aId, $1), default: 0] }
                    })
                    let gamePenalty = Double((teamA + teamB).reduce(0) { $0 + gamesByPlayer[$1, default: 0] })
                    let underplayedBonus = (gameTarget * 2 - gamePenalty) * 0.5
                    let score = Double(fairness) * 2 - teammatePenalty * 15 - opponentPenalty * 6 - gamePenalty * 3 + underplayedBonus

                    if bestCandidate == nil || score > bestCandidate!.score {
                        bestCandidate = (score, teamA, teamB, fairness, winProbability)
                    }
                }
            }
        }

        guard let bestCandidate else {
            statusMessage = "Kunde inte räkna fram något förslag."
            return nil
        }

        statusMessage = "Förslag framtaget med balans- och rotationsregler."
        return SingleGameSuggestion(
            teamAPlayerIds: [bestCandidate.teamA.first, isOneVsOne ? nil : bestCandidate.teamA.dropFirst().first],
            teamBPlayerIds: [bestCandidate.teamB.first, isOneVsOne ? nil : bestCandidate.teamB.dropFirst().first],
            fairness: bestCandidate.fairness,
            winProbability: bestCandidate.winProbability,
            explanation: "Hög fairness betyder jämnare match. Rotationsdelen försöker också undvika samma lagkompisar och motståndare för ofta."
        )
    }

    func buildSingleGameRecap(for match: Match) -> SingleGameRecap {
        let dateKey = Self.dayKey(for: match.playedAt)
        let dayMatches = matches.filter { Self.dayKey(for: $0.playedAt) == dateKey }
        let winner = match.teamAScore > match.teamBScore ? match.teamAName : (match.teamBScore > match.teamAScore ? match.teamBName : "Oavgjort")

        var winsByPlayer: [UUID: Int] = [:]
        for dayMatch in dayMatches {
            let winners = dayMatch.teamAScore > dayMatch.teamBScore ? dayMatch.teamAPlayerIds : dayMatch.teamBPlayerIds
            for id in winners {
                guard let id else { continue }
                winsByPlayer[id, default: 0] += 1
            }
        }

        let leaderboard = winsByPlayer
            .sorted { lhs, rhs in
                if lhs.value != rhs.value { return lhs.value > rhs.value }
                let left = players.first(where: { $0.id == lhs.key })?.profileName ?? "Spelare"
                let right = players.first(where: { $0.id == rhs.key })?.profileName ?? "Spelare"
                return left < right
            }
            .prefix(3)
            .map { entry in
                let name = players.first(where: { $0.id == entry.key })?.profileName ?? "Spelare"
                return "• \(name): \(entry.value) segrar"
            }

        let totalPoints = dayMatches.reduce(0) { $0 + $1.teamAScore + $1.teamBScore }
        let closeGameCount = dayMatches.filter { abs($0.teamAScore - $0.teamBScore) <= 2 }.count

        let matchSummary = [
            "Match: \(match.teamAName) \(match.teamAScore)-\(match.teamBScore) \(match.teamBName)",
            "Vinnare: \(winner)",
            "Poängtyp: \(match.scoreType == "points" ? "Poäng" : "Set")",
        ].joined(separator: "\n")

        let eveningSummary = ([
            "Kväll \(dateKey): \(dayMatches.count) matcher, totalt \(totalPoints) registrerade game.",
            "Jämna matcher (skillnad ≤ 2): \(closeGameCount)",
            "Topplista:",
            leaderboard.isEmpty ? "• Ingen topplista ännu." : leaderboard.joined(separator: "\n"),
        ]).joined(separator: "\n")

        return SingleGameRecap(matchSummary: matchSummary, eveningSummary: eveningSummary)
    }

    func submitSingleGame(
        teamAPlayerIds: [UUID?],
        teamBPlayerIds: [UUID?],
        teamAScore: Int,
        teamBScore: Int,
        scoreType: String = "sets",
        scoreTarget: Int? = nil,
        sourceTournamentId: UUID? = nil,
        sourceTournamentType: String = "standalone",
        teamAServesFirst: Bool = true
    ) async -> SingleGameRecap? {
        let normalizedAIds = Array(teamAPlayerIds.prefix(2)) + Array(repeating: nil, count: max(0, 2 - teamAPlayerIds.count))
        let normalizedBIds = Array(teamBPlayerIds.prefix(2)) + Array(repeating: nil, count: max(0, 2 - teamBPlayerIds.count))
        let compactA = normalizedAIds.compactMap { $0 }
        let compactB = normalizedBIds.compactMap { $0 }

        guard !compactA.isEmpty, !compactB.isEmpty else {
            statusMessage = "Välj minst en spelare per lag."
            return nil
        }

        let combined = compactA + compactB
        guard Set(combined).count == combined.count else {
            statusMessage = "Samma spelare kan inte vara i båda lagen."
            return nil
        }

        guard (0...99).contains(teamAScore), (0...99).contains(teamBScore) else {
            statusMessage = "Poängen måste vara mellan 0 och 99."
            return nil
        }

        let normalizedScoreType = scoreType == "points" ? "points" : "sets"
        let normalizedTarget = normalizedScoreType == "points" ? scoreTarget : nil
        let isOneVsOne = compactA.count == 1 && compactB.count == 1
        let normalizedTournamentType = sourceTournamentType.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            ? (isOneVsOne ? "standalone_1v1" : "standalone")
            : sourceTournamentType.trimmingCharacters(in: .whitespacesAndNewlines)

        // Note for non-coders:
        // We derive readable team names from selected profiles so match history looks human-friendly.
        let teamANames = normalizedAIds.map { playerId in
            guard let playerId else { return "" }
            return players.first(where: { $0.id == playerId })?.profileName ?? "Okänd spelare"
        }
        let teamBNames = normalizedBIds.map { playerId in
            guard let playerId else { return "" }
            return players.first(where: { $0.id == playerId })?.profileName ?? "Okänd spelare"
        }

        do {
            let submission = MatchSubmission(
                teamAName: teamANames,
                teamBName: teamBNames,
                teamAPlayerIds: normalizedAIds,
                teamBPlayerIds: normalizedBIds,
                teamAScore: teamAScore,
                teamBScore: teamBScore,
                scoreType: normalizedScoreType,
                scoreTarget: normalizedTarget,
                sourceTournamentId: sourceTournamentId,
                sourceTournamentType: normalizedTournamentType,
                teamAServesFirst: teamAServesFirst,
                playedAt: .now
            )

            try await apiClient.submitMatch(submission)

            // Note for non-coders:
            // We add the new row locally so the user sees it immediately,
            // then we also refresh from the server to stay fully accurate.
            let localMatch = Match(
                id: UUID(),
                playedAt: .now,
                teamAName: teamANames.filter { !$0.isEmpty }.joined(separator: " & "),
                teamBName: teamBNames.filter { !$0.isEmpty }.joined(separator: " & "),
                teamAScore: teamAScore,
                teamBScore: teamBScore,
                teamAPlayerIds: normalizedAIds,
                teamBPlayerIds: normalizedBIds,
                scoreType: normalizedScoreType,
                scoreTarget: normalizedTarget,
                sourceTournamentId: sourceTournamentId,
                sourceTournamentType: normalizedTournamentType,
                teamAServesFirst: teamAServesFirst
            )
            matches.insert(localMatch, at: 0)
            statusMessage = "Match sparad."
            let recap = buildSingleGameRecap(for: localMatch)
            await bootstrap()
            return recap
        } catch {
            statusMessage = "Kunde inte spara matchen: \(error.localizedDescription)"
            return nil
        }
    }
}

enum SampleData {
    static let players: [Player] = [
        Player(id: UUID(), fullName: "Alex", elo: 1510, isAdmin: true, isRegular: true),
        Player(id: UUID(), fullName: "Sam", elo: 1465, isAdmin: false, isRegular: true),
        Player(id: UUID(), fullName: "Robin", elo: 1430, isAdmin: false, isRegular: true)
    ]

    static let matches: [Match] = [
        Match(id: UUID(), playedAt: .now.addingTimeInterval(-86_400), teamAName: "Alex & Sam", teamBName: "Robin & Kim", teamAScore: 6, teamBScore: 4),
        Match(id: UUID(), playedAt: .now.addingTimeInterval(-172_800), teamAName: "Alex & Kim", teamBName: "Sam & Robin", teamAScore: 7, teamBScore: 5),
        Match(id: UUID(), playedAt: .now.addingTimeInterval(-250_000), teamAName: "Alex & Sam", teamBName: "Robin & Kim", teamAScore: 6, teamBScore: 5)
    ]

    static let schedule: [ScheduleEntry] = [
        ScheduleEntry(id: UUID(), startsAt: .now.addingTimeInterval(172_800), location: "Center Court", description: "Friendly doubles"),
        ScheduleEntry(id: UUID(), startsAt: .now.addingTimeInterval(345_600), location: "North Hall", description: "Weekly ladder"),
    ]

    static let tournament = Tournament(
        id: UUID(),
        name: "Weekly Americano",
        status: "in_progress",
        tournamentType: "americano",
        scheduledAt: .now,
        completedAt: nil,
        location: "Center Court",
        scoreTarget: 24,
        createdAt: .now.addingTimeInterval(-3600)
    )

    static let tournamentRounds: [TournamentRound] = [
        TournamentRound(
            id: UUID(),
            tournamentId: tournament.id,
            roundNumber: 1,
            team1Ids: [players[0].id, players[1].id],
            team2Ids: [players[2].id],
            restingIds: [],
            team1Score: 24,
            team2Score: 18,
            mode: "americano",
            createdAt: .now.addingTimeInterval(-2800)
        )
    ]

    static let tournamentStandings: [TournamentStanding] = [
        TournamentStanding(id: players[0].id, profileId: players[0].id, playerName: players[0].fullName, rank: 1, pointsFor: 24, pointsAgainst: 18, wins: 1, losses: 0, matchesPlayed: 1),
        TournamentStanding(id: players[1].id, profileId: players[1].id, playerName: players[1].fullName, rank: 2, pointsFor: 24, pointsAgainst: 18, wins: 1, losses: 0, matchesPlayed: 1),
        TournamentStanding(id: players[2].id, profileId: players[2].id, playerName: players[2].fullName, rank: 3, pointsFor: 18, pointsAgainst: 24, wins: 0, losses: 1, matchesPlayed: 1)
    ]

    static let tournamentResultsHistory: [TournamentResult] = [
        TournamentResult(id: UUID(), tournamentId: tournament.id, profileId: players[0].id, rank: 1, pointsFor: 96, pointsAgainst: 74, matchesPlayed: 5, wins: 4, losses: 1, createdAt: .now.addingTimeInterval(-604_800)),
        TournamentResult(id: UUID(), tournamentId: tournament.id, profileId: players[1].id, rank: 2, pointsFor: 90, pointsAgainst: 80, matchesPlayed: 5, wins: 3, losses: 2, createdAt: .now.addingTimeInterval(-604_800)),
    ]
}
