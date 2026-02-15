import Foundation
import BackgroundTasks
import UserNotifications
import EventKit
import UIKit

struct ProfileEloPoint: Identifiable {
    let id: UUID
    let matchId: UUID
    let date: Date
    let elo: Int
}

struct ComparisonTimelinePoint: Identifiable {
    let id: Int // Sequential index for X-axis
    let date: Date
    let matchId: UUID
    let elos: [UUID: Int] // PlayerID -> Elo
}

enum TrendChartTimeRange: String, CaseIterable, Identifiable {
    case days30
    case days90
    case year1
    case all

    var id: String { rawValue }

    var title: String {
        switch self {
        case .days30: return "30d"
        case .days90: return "90d"
        case .year1: return "1y"
        case .all: return "All"
        }
    }
}

enum TrendChartMetric: String, CaseIterable, Identifiable {
    case elo
    case winRate

    var id: String { rawValue }

    var title: String {
        switch self {
        case .elo: return "ELO"
        case .winRate: return "Win rate"
        }
    }
}

enum ChartDatasetState<Value> {
    case loading
    case empty(message: String)
    case error(message: String)
    case ready(Value)
}

struct ComparisonMetricTimelinePoint: Identifiable {
    let id: Int
    let date: Date
    let matchId: UUID
    let elos: [UUID: Int]
    let winRates: [UUID: Double]
}

struct ComparisonChartDataset {
    let playerIds: [UUID]
    let points: [ComparisonMetricTimelinePoint]
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
        case .all: return "Alla"
        case .last7: return "7 dgr"
        case .last30: return "30 dgr"
        case .short: return "Korta"
        case .long: return "Långa"
        case .tournaments: return "Turnering"
        case .custom: return "Anpassat"
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
    let explanation: String?
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
    let color: String? // "success", "error", or nil

    init(id: String, title: String, value: String, detail: String, symbol: String, color: String? = nil) {
        self.id = id
        self.title = title
        self.value = value
        self.detail = detail
        self.symbol = symbol
        self.color = color
    }
}

struct PartnerSynergy: Identifiable {
    let id: UUID
    let name: String
    let games: Int
    let wins: Int
}

struct ToughestOpponent: Identifiable {
    let id: UUID
    let name: String
    let games: Int
    let losses: Int
}

struct LeaderboardPlayer: Identifiable {
    let id: UUID
    let name: String
    let elo: Int
    let games: Int
    let wins: Int
    let losses: Int
    let winRate: Int
    let streak: String
    let eloHistory: [Int]
    let avatarURL: String?
    let featuredBadgeId: String?
    let isAdmin: Bool
    let isMe: Bool
}

struct HeatmapCombo: Identifiable {
    let id: String
    let players: [String]
    let games: Int
    let wins: Int
    let winPct: Int
    let serveFirstWinPct: Int?
    let serveSecondWinPct: Int?
    let recentResults: [String]
    let avgElo: Int
}


struct SingleGameSuggestion {
    let teamAPlayerIds: [UUID?]
    let teamBPlayerIds: [UUID?]
    let fairness: Int
    let winProbability: Double
    let explanation: String
}

struct MatchRecapPlayer: Identifiable {
    let id: UUID?
    let name: String
    let elo: Int
    let delta: Int
    let avatarURL: String?
}

struct MatchRecapTeam {
    let players: [MatchRecapPlayer]
    let averageElo: Int
}

struct SingleGameRecap {
    let playedAt: Date
    let teamAScore: Int
    let teamBScore: Int
    let teamA: MatchRecapTeam
    let teamB: MatchRecapTeam
    let fairness: Int
    let winProbability: Double
    let eveningSummary: String

    var matchSummary: String {
        let teamANames = teamA.players.map { $0.name }.joined(separator: " & ")
        let teamBNames = teamB.players.map { $0.name }.joined(separator: " & ")
        return "\(teamANames) \(teamAScore)-\(teamBScore) \(teamBNames)"
    }

    var sharePayload: String {
        [
            "Padel match-sammanfattning",
            "",
            matchSummary,
            "",
            eveningSummary,
        ].joined(separator: "\n")
    }
}


struct MatchUpdateDraft {
    let baseMatch: Match
    let playedAt: Date
    let teamAScore: Int
    let teamBScore: Int
    let scoreType: String
    let scoreTarget: Int?
    let teamAPlayerIds: [String?]
    let teamBPlayerIds: [String?]

    // Note for non-coders:
    // This creates a readable summary so users can compare what they changed
    // with what was already saved on the server by someone else.
    func summary() -> String {
        let timestamp = AppViewModel.uiDateTimeFormatter.string(from: playedAt)
        return "Score \(teamAScore)-\(teamBScore) • \(timestamp)"
    }
}

struct MatchConflictEvent: Identifiable {
    enum Resolution: String {
        case detected
        case overwritten
        case discarded
        case merged
        case mergeBlocked
    }

    let id = UUID()
    let matchId: UUID
    let recordedAt: Date
    let resolution: Resolution
    let details: String
}

struct MatchUpdateConflictContext: Identifiable {
    let id = UUID()
    let localDraft: MatchUpdateDraft
    let latestServerMatch: Match

    var matchId: UUID { localDraft.baseMatch.id }

    var canMerge: Bool {
        let localChangedScore = localDraft.teamAScore != localDraft.baseMatch.teamAScore || localDraft.teamBScore != localDraft.baseMatch.teamBScore
        let serverChangedScore = latestServerMatch.teamAScore != localDraft.baseMatch.teamAScore || latestServerMatch.teamBScore != localDraft.baseMatch.teamBScore
        return localChangedScore && !serverChangedScore
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
    @Published var allMatches: [Match] = []
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
    @Published var pendingMatchConflict: MatchUpdateConflictContext?
    @Published var conflictResolutionMessage: String?
    @Published private(set) var conflictEvents: [MatchConflictEvent] = []
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
    @Published var adminEmailPreviewHTML: String?
    @Published var adminEmailStatusMessage: String?
    @Published var liveUpdateBanner: String?
    @Published var globalFilter: DashboardMatchFilter = .all
    @Published var globalCustomStartDate: Date = Calendar.current.date(byAdding: .day, value: -30, to: .now) ?? .now
    @Published var globalCustomEndDate: Date = .now
    @Published var dashboardRivalryOpponentId: UUID?
    @Published var dashboardRivalryMode: String = "against"
    @Published var isDashboardLoading = false
    @Published var selectedMainTab = 0
    @Published var playerBadgeStats: [UUID: PlayerBadgeStats] = [:]
    @Published var currentPlayerBadges: [Badge] = []
    @Published var currentRivalryAgainstStats: [RivalrySummary] = []
    @Published var currentRivalryTogetherStats: [RivalrySummary] = []
    @Published var bestPartner: PartnerSynergy?
    @Published var toughestOpponent: ToughestOpponent?
    @Published var americanoWins: Int = 0
    @Published var mexicanoWins: Int = 0
    @Published var currentMonthlyMvpDays: Int = 0
    @Published var currentEveningMvps: Int = 0
    @Published var teammateFilterPlayerId: UUID?
    @Published var heatmapCombos: [HeatmapCombo] = []
    @Published var leaderboardPlayers: [LeaderboardPlayer] = []
    @Published var headToHeadSummary: [HeadToHeadSummary] = []
    @Published var currentMVP: DashboardMVPResult?
    @Published var periodMVP: DashboardMVPResult?
    @Published var latestHighlightMatch: DashboardMatchHighlight?
    @Published var historyMatches: [Match] = []
    @Published var isHistoryLoading = false
    @Published var isHistoryLoadingMore = false
    @Published var hasMoreHistoryMatches = true
    @Published var deepLinkedPollId: UUID?
    @Published var deepLinkedPollDayId: UUID?
    @Published var deepLinkedSingleGameMode: String?
    @Published var currentRotation: RotationSchedule?
    @Published var areScheduleNotificationsEnabled = false
    @Published var notificationPreferences: NotificationPreferences = .default
    @Published var notificationPermissionStatus: UNAuthorizationStatus = .notDetermined
    @Published var calendarPermissionStatus: EKAuthorizationStatus = .notDetermined
    @Published var backgroundRefreshStatus: UIBackgroundRefreshStatus = UIApplication.shared.backgroundRefreshStatus
    @Published var isBiometricLockEnabled = false
    @Published var isBiometricAvailable = false
    @Published var appVersionMessage: String?
    @Published var appStoreUpdateURL: URL?
    @Published var isUpdateRequired = false
    @Published var pendingVersionHighlights: AppVersionHighlightsPresentation?
    @Published var deepLinkFallbackBanner: String?

    static let backgroundRefreshTaskIdentifier = "com.padelnative.refresh"
    static let backgroundMaintenanceTaskIdentifier = "com.padelnative.maintenance"

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
    private let apiClient: SupabaseRESTClient
    private let tournamentDataLoader: TournamentDataLoading
    private lazy var bootstrapService = AppBootstrapService(apiClient: apiClient)
    private let appVersionService: AppVersionService
    private let notificationService: NotificationServicing
    private let calendarService: CalendarServicing
    private let biometricAuthService = BiometricAuthService()
    private var liveSyncTask: Task<Void, Never>?
    private var liveSyncDebounceTask: Task<Void, Never>?
    private var liveUpdateBannerTask: Task<Void, Never>?
    private var deepLinkBannerTask: Task<Void, Never>?
    private var scheduleMessageClearTask: Task<Void, Never>?
    private var foregroundObserver: NSObjectProtocol?
    private var lastGlobalLiveMarker: SupabaseRESTClient.GlobalLiveMarker?
    private var lastFullLiveSyncAt: Date?
    private var consecutiveLiveProbeFailures = 0
    private var realtimeClient: SupabaseRealtimeClient?
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

    static let uiDateTimeFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = AppConfig.swedishLocale
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter
    }()

    private let dismissalStore: UserDefaults
    private let dismissedHighlightIdKey = "dashboard.dismissedHighlightMatchId"
    private let dismissedHighlightDateKeyStore = "dashboard.dismissedHighlightDate"
    private let dismissedRecentMatchIdKey = "dashboard.dismissedRecentMatchId"
    private let dismissedScheduledGameIdKey = "dashboard.dismissedScheduledGameId"
    private let dismissedTournamentNoticeIdKey = "dashboard.dismissedTournamentNoticeId"
    private let scheduleNotificationsEnabledKey = "settings.scheduleNotificationsEnabled"
    private let biometricLockEnabledKey = "settings.biometricLockEnabled"
    private let lastSeenAppVersionKey = "settings.lastSeenAppVersion"

    init(
        apiClient: SupabaseRESTClient = SupabaseRESTClient(),
        tournamentDataLoader: TournamentDataLoading? = nil,
        appVersionService: AppVersionService = AppVersionService(),
        notificationService: NotificationServicing = NotificationService(),
        calendarService: CalendarServicing = CalendarService(),
        dismissalStore: UserDefaults = .standard
    ) {
        self.apiClient = apiClient
        self.tournamentDataLoader = tournamentDataLoader ?? SupabaseTournamentDataLoader(apiClient: apiClient)
        self.appVersionService = appVersionService
        self.notificationService = notificationService
        self.calendarService = calendarService
        self.dismissalStore = dismissalStore
        dismissedHighlightMatchId = Self.uuidValue(from: dismissalStore, key: dismissedHighlightIdKey)
        dismissedHighlightDateKey = dismissalStore.string(forKey: dismissedHighlightDateKeyStore)
        dismissedRecentMatchId = Self.uuidValue(from: dismissalStore, key: dismissedRecentMatchIdKey)
        dismissedScheduledGameId = Self.uuidValue(from: dismissalStore, key: dismissedScheduledGameIdKey)
        dismissedTournamentNoticeId = Self.uuidValue(from: dismissalStore, key: dismissedTournamentNoticeIdKey)
        areScheduleNotificationsEnabled = dismissalStore.bool(forKey: scheduleNotificationsEnabledKey)
        notificationPreferences = notificationService.loadNotificationPreferences(store: dismissalStore)
        notificationPreferences.enabled = areScheduleNotificationsEnabled
        isBiometricLockEnabled = dismissalStore.bool(forKey: biometricLockEnabledKey)

        if AppConfig.isConfigured {
            realtimeClient = SupabaseRealtimeClient(supabaseURL: AppConfig.supabaseURL, apiKey: AppConfig.supabaseAnonKey)
            realtimeClient?.onDataChange = { [weak self] in
                Task { @MainActor in
                    await self?.performFullLiveRefresh()
                }
            }
        }

        foregroundObserver = NotificationCenter.default.addObserver(
            forName: UIApplication.willEnterForegroundNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            Task { @MainActor [weak self] in
                guard let self else { return }
                LiveMatchActivityService.shared.restoreActiveActivityIfNeeded()
                self.updateLiveActivity()
                await self.refreshDevicePermissionStatuses()
            }
        }
    }

    deinit {
        if let foregroundObserver {
            NotificationCenter.default.removeObserver(foregroundObserver)
        }
    }

    // Note for non-coders:
    // This runs native-only setup (notification status, remote push registration) when app starts.
    func prepareNativeCapabilities() async {
        await refreshDevicePermissionStatuses()
        if areScheduleNotificationsEnabled && (notificationPermissionStatus == .authorized || notificationPermissionStatus == .provisional) {
            notificationService.registerForRemoteNotifications()
            await notificationService.scheduleUpcomingGameReminders(schedule, preferences: notificationPreferences)
        }

        scheduleBackgroundRefreshTasksIfPossible()

        await checkForAppUpdate()
    }

    // Note for non-coders:
    // iOS can run these tasks in the background to keep schedule/reminders/widgets fresh.
    // If iOS does not allow scheduling (simulator, settings, or unsupported environment),
    // we keep working with normal in-app refresh as a safe fallback.
    static func registerBackgroundTaskHandlers() {
        guard #available(iOS 13.0, *) else { return }

        BGTaskScheduler.shared.register(forTaskWithIdentifier: backgroundRefreshTaskIdentifier, using: nil) { task in
            guard let refreshTask = task as? BGAppRefreshTask else {
                task.setTaskCompleted(success: false)
                return
            }
            handleBackgroundTask(refreshTask)
        }

        BGTaskScheduler.shared.register(forTaskWithIdentifier: backgroundMaintenanceTaskIdentifier, using: nil) { task in
            guard let refreshTask = task as? BGAppRefreshTask else {
                task.setTaskCompleted(success: false)
                return
            }
            handleBackgroundTask(refreshTask)
        }
    }

    static func scheduleBackgroundRefreshRequests() -> Bool {
        guard #available(iOS 13.0, *) else { return false }

        let refreshRequest = BGAppRefreshTaskRequest(identifier: backgroundRefreshTaskIdentifier)
        refreshRequest.earliestBeginDate = Date(timeIntervalSinceNow: 30 * 60)

        let maintenanceRequest = BGAppRefreshTaskRequest(identifier: backgroundMaintenanceTaskIdentifier)
        maintenanceRequest.earliestBeginDate = Date(timeIntervalSinceNow: 120 * 60)

        do {
            try BGTaskScheduler.shared.submit(refreshRequest)
            try BGTaskScheduler.shared.submit(maintenanceRequest)
            return true
        } catch {
            return false
        }
    }

    private static func handleBackgroundTask(_ task: BGAppRefreshTask) {
        // Note for non-coders:
        // We re-schedule the next run immediately, so refresh continues automatically over time.
        _ = scheduleBackgroundRefreshRequests()

        let backgroundWork = Task {
            let service = AppBootstrapService(apiClient: SupabaseRESTClient())
            let success = await service.performBackgroundMaintenance()
            task.setTaskCompleted(success: success)
        }

        task.expirationHandler = {
            backgroundWork.cancel()
        }
    }

    func scheduleBackgroundRefreshTasksIfPossible() {
        let didSchedule = Self.scheduleBackgroundRefreshRequests()

        guard !didSchedule else { return }

        // Note for non-coders:
        // Safe fallback: if iOS background scheduling is unavailable, we still do an immediate
        // lightweight refresh while the app is active so reminders and widgets stay up to date.
        Task { [weak self] in
            guard let self else { return }
            let success = await self.bootstrapService.performBackgroundMaintenance(notificationService: self.notificationService)
            if !success {
                // We keep this silent to avoid noisy warnings for temporary network hiccups.
            }
        }
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
            prepareVersionHighlightsIfNeeded(currentVersion: currentVersion)
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

        prepareVersionHighlightsIfNeeded(currentVersion: currentVersion)
    }

    // Note for non-coders:
    // We save the last app version this device has already acknowledged, so users only
    // see "what's new" when they truly update to a newer build.
    private func prepareVersionHighlightsIfNeeded(currentVersion: String) {
        let normalizedCurrent = currentVersion.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !normalizedCurrent.isEmpty else {
            pendingVersionHighlights = nil
            return
        }

        let lastSeenVersion = dismissalStore.string(forKey: lastSeenAppVersionKey)
        if let lastSeenVersion,
           appVersionService.compareVersions(normalizedCurrent, lastSeenVersion) <= 0 {
            pendingVersionHighlights = nil
            return
        }

        // First install (no previous version): silently set baseline and avoid surprise modal.
        guard let lastSeenVersion else {
            dismissalStore.set(normalizedCurrent, forKey: lastSeenAppVersionKey)
            pendingVersionHighlights = nil
            return
        }

        let releases = appVersionService.bundledVersionHighlights()
        guard let release = releases.first(where: { $0.version == normalizedCurrent }) else {
            dismissalStore.set(normalizedCurrent, forKey: lastSeenAppVersionKey)
            pendingVersionHighlights = nil
            return
        }

        if appVersionService.compareVersions(release.version, lastSeenVersion) > 0 {
            pendingVersionHighlights = AppVersionHighlightsPresentation(
                version: release.version,
                title: release.title,
                changes: release.changes
            )
        }
    }

    func dismissVersionHighlights() {
        guard let version = pendingVersionHighlights?.version else { return }
        dismissalStore.set(version, forKey: lastSeenAppVersionKey)
        pendingVersionHighlights = nil
    }

    // Note for non-coders:
    // This lets users open the latest "what's new" notes manually from Settings.
    func showLatestVersionHighlights() {
        guard let latest = appVersionService.bundledVersionHighlights().first else {
            return
        }

        pendingVersionHighlights = AppVersionHighlightsPresentation(
            version: latest.version,
            title: latest.title,
            changes: latest.changes
        )
    }


    var notificationPermissionNeedsSettings: Bool {
        notificationPermissionStatus == .denied
    }

    // Note for non-coders:
    // This opens the iOS Settings page for this app so you can manually change permissions.
    func openSystemSettings() {
        guard let url = URL(string: UIApplication.openSettingsURLString),
              UIApplication.shared.canOpenURL(url) else {
            statusMessage = "Kunde inte öppna iOS-inställningar på den här enheten."
            return
        }

        UIApplication.shared.open(url)
    }

    func refreshNotificationPermissionStatus() async {
        notificationPermissionStatus = await notificationService.currentStatus()
    }

    // Note for non-coders:
    // Settings uses this one function to refresh all permission-related badges at once.
    func refreshDevicePermissionStatuses() async {
        notificationPermissionStatus = await notificationService.currentStatus()
        calendarPermissionStatus = calendarService.currentAuthorizationStatus()
        backgroundRefreshStatus = UIApplication.shared.backgroundRefreshStatus
        isBiometricAvailable = biometricAuthService.canUseBiometrics()
    }

    func requestCalendarPermission() async {
        do {
            _ = try await calendarService.requestAccessIfNeeded()
            calendarPermissionStatus = calendarService.currentAuthorizationStatus()
        } catch {
            calendarPermissionStatus = calendarService.currentAuthorizationStatus()
            statusMessage = "Vi kunde inte be om kalenderåtkomst just nu. Försök gärna igen."
        }
    }

    func setScheduleNotificationsEnabled(_ enabled: Bool) async {
        if enabled {
            notificationPermissionStatus = await notificationService.currentStatus()

            if notificationPermissionStatus == .denied {
                areScheduleNotificationsEnabled = false
                dismissalStore.set(false, forKey: scheduleNotificationsEnabledKey)
                statusMessage = "Action needed: Notifications are blocked. Open iOS Settings and allow notifications for PadelNative."
                return
            }

            do {
                let granted = try await notificationService.requestAuthorization()
                notificationPermissionStatus = await notificationService.currentStatus()
                guard granted else {
                    areScheduleNotificationsEnabled = false
                    statusMessage = "Action needed: Notifications are not allowed yet. Enable them in iOS Settings to receive reminders."
                    dismissalStore.set(false, forKey: scheduleNotificationsEnabledKey)
                    return
                }
                areScheduleNotificationsEnabled = true
                dismissalStore.set(true, forKey: scheduleNotificationsEnabledKey)
                notificationPreferences.enabled = true
                await notificationService.saveNotificationPreferencesWithSync(notificationPreferences, profileId: currentIdentity?.profileId, store: dismissalStore)
                notificationService.registerForRemoteNotifications()
                await notificationService.scheduleUpcomingGameReminders(schedule, preferences: notificationPreferences)
                statusMessage = "Allowed: Notifications are enabled for upcoming match reminders."
            } catch {
                areScheduleNotificationsEnabled = false
                dismissalStore.set(false, forKey: scheduleNotificationsEnabledKey)
                statusMessage = "Kunde inte aktivera notiser: \(error.localizedDescription)"
            }
            return
        }

        areScheduleNotificationsEnabled = false
        dismissalStore.set(false, forKey: scheduleNotificationsEnabledKey)
        notificationPreferences.enabled = false
        await notificationService.saveNotificationPreferencesWithSync(notificationPreferences, profileId: currentIdentity?.profileId, store: dismissalStore)
        await notificationService.clearScheduledGameReminders()
        statusMessage = "Action needed: Notifications are turned off on this device."
    }



    // Note for non-coders:
    // This lets users mute one event category (for example polls) without muting everything.
    func setNotificationEventEnabled(_ eventType: NotificationEventType, enabled: Bool) async {
        notificationPreferences.eventToggles[eventType.rawValue] = enabled
        await notificationService.saveNotificationPreferencesWithSync(notificationPreferences, profileId: currentIdentity?.profileId, store: dismissalStore)

        if eventType == .scheduledMatchNew {
            if enabled && areScheduleNotificationsEnabled {
                await notificationService.scheduleUpcomingGameReminders(schedule, preferences: notificationPreferences)
            } else {
                await notificationService.clearScheduledGameReminders()
            }
        }
    }

    // Note for non-coders:
    // Quiet hours delay alerts into a daytime window so night-time pushes are avoided.
    func setNotificationQuietHours(enabled: Bool, startHour: Int, endHour: Int) async {
        notificationPreferences.quietHours = NotificationQuietHours(enabled: enabled, startHour: startHour, endHour: endHour)
        await notificationService.saveNotificationPreferencesWithSync(notificationPreferences, profileId: currentIdentity?.profileId, store: dismissalStore)

        if areScheduleNotificationsEnabled {
            await notificationService.scheduleUpcomingGameReminders(schedule, preferences: notificationPreferences)
        }
    }

    func setBiometricLockEnabled(_ enabled: Bool) async {
        if enabled {
            guard biometricAuthService.canUseBiometrics() else {
                statusMessage = "Limited: Biometric unlock is not available on this device."
                isBiometricLockEnabled = false
                dismissalStore.set(false, forKey: biometricLockEnabledKey)
                return
            }

            do {
                try await biometricAuthService.authenticate(reason: "Bekräfta att du vill skydda PadelNative med Face ID/Touch ID")
                isBiometricLockEnabled = true
                dismissalStore.set(true, forKey: biometricLockEnabledKey)
                statusMessage = "Allowed: Biometric app lock is enabled."
            } catch {
                isBiometricLockEnabled = false
                dismissalStore.set(false, forKey: biometricLockEnabledKey)
                statusMessage = "Kunde inte aktivera biometriskt lås: \(error.localizedDescription)"
            }
            return
        }

        isBiometricLockEnabled = false
        dismissalStore.set(false, forKey: biometricLockEnabledKey)
        statusMessage = "Action needed: Biometric app lock is turned off."
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
            notificationPreferences = await notificationService.loadNotificationPreferencesWithSync(profileId: identity.profileId, store: dismissalStore)
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
            notificationPreferences = await notificationService.loadNotificationPreferencesWithSync(profileId: identity.profileId, store: dismissalStore)
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
        adminEmailPreviewHTML = nil
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
            notificationPreferences = await notificationService.loadNotificationPreferencesWithSync(profileId: identity.profileId, store: dismissalStore)
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


#if DEBUG
    // Note for non-coders:
    // This helper is only compiled in debug/test builds so automated tests can
    // set a fake signed-in identity without calling real auth services.
    func injectIdentityForTests(_ identity: AuthIdentity?) {
        currentIdentity = identity
        signedInEmail = identity?.email
        isAuthenticated = identity != nil
        if identity == nil {
            isGuestMode = false
        }
    }
#endif

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

        // Optimization: Use pre-calculated leaderboard ELO if available
        if let leader = leaderboardPlayers.first(where: { $0.id == profileId }) {
            return Player(
                id: leader.id,
                fullName: leader.name, // Use profileName from leaderboard
                elo: leader.elo,
                isAdmin: leader.isAdmin,
                isRegular: players.first(where: { $0.id == profileId })?.isRegular ?? false,
                avatarURL: leader.avatarURL,
                featuredBadgeId: leader.featuredBadgeId,
                profileName: leader.name
            )
        }

        if let player = players.first(where: { $0.id == profileId }) {
            return player
        }

        return Player(
            id: profileId,
            fullName: currentIdentity?.fullName ?? "Spelare",
            elo: 1000,
            isAdmin: currentIdentity?.isAdmin ?? false,
            isRegular: currentIdentity?.isRegular ?? false,
            avatarURL: nil,
            featuredBadgeId: nil,
            profileName: currentIdentity?.fullName ?? "Spelare"
        )
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
        let currentIdString = currentPlayer.id.uuidString.lowercased()
        return allMatches.filter { match in
            let playerIds = (match.teamAPlayerIds + match.teamBPlayerIds).compactMap { $0?.lowercased() }
            if playerIds.contains(currentIdString) {
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
        let currentIdString = currentPlayer.id.uuidString.lowercased()
        let wins = myMatches.filter { match in
            let teamAIds = match.teamAPlayerIds.compactMap { $0?.lowercased() }
            let iAmTeamA = teamAIds.contains(currentIdString)
            return iAmTeamA ? match.teamAScore > match.teamBScore : match.teamBScore > match.teamAScore
        }.count
        let losses = myMatches.count - wins
        let winRate = myMatches.isEmpty ? 0 : Int((Double(wins) / Double(myMatches.count) * 100).rounded())

        let serveStats = calculateServeSplitStats(matches: myMatches, playerId: currentPlayer.id)

        let last30DaysDelta = playerEloDelta(playerId: currentPlayer.id, days: 30)
        let lastSessionDelta = playerLastSessionEloDelta(playerId: currentPlayer.id)

        let recentResults = myMatches.prefix(5)
        let recentWins = recentResults.filter { match in
            let teamAIds = match.teamAPlayerIds.compactMap { $0?.lowercased() }
            let iAmTeamA = teamAIds.contains(currentIdString)
            return iAmTeamA ? match.teamAScore > match.teamBScore : match.teamBScore > match.teamAScore
        }.count
        let recentLosses = recentResults.count - recentWins

        return [
            ProfilePerformanceWidget(id: "elo", title: "Aktuell ELO", value: "\(currentPlayer.elo)", detail: "Din nuvarande ranking", symbol: "chart.line.uptrend.xyaxis"),
            ProfilePerformanceWidget(id: "matches", title: "Matcher", value: "\(myMatches.count)", detail: "Totalt spelade matcher", symbol: "paddles.fill"),
            ProfilePerformanceWidget(id: "winLoss", title: "Vinst/förlust", value: "\(wins) - \(losses)", detail: "\(winRate)% vinstprocent", symbol: "trophy", color: wins >= losses ? "success" : "error"),
            ProfilePerformanceWidget(id: "serveFirst", title: "Med start-serve", value: "\(serveStats.firstWins)V - \(serveStats.firstLosses)F", detail: "Vinstprocent: \(serveStats.firstWinRate)%", symbol: "bolt.fill"),
            ProfilePerformanceWidget(id: "serveSecond", title: "Utan start-serve", value: "\(serveStats.secondWins)V - \(serveStats.secondLosses)F", detail: "Vinstprocent: \(serveStats.secondWinRate)%", symbol: "bolt.slash.fill"),
            ProfilePerformanceWidget(id: "delta30", title: "ELO +/- (30d)", value: "\(last30DaysDelta >= 0 ? "+" : "")\(last30DaysDelta)", detail: "Förändring senaste 30 dagarna", symbol: "calendar", color: last30DaysDelta >= 0 ? "success" : "error"),
            ProfilePerformanceWidget(id: "deltaSession", title: "ELO +/- (Kväll)", value: "\(lastSessionDelta >= 0 ? "+" : "")\(lastSessionDelta)", detail: "Förändring senaste passet", symbol: "moon.stars.fill", color: lastSessionDelta >= 0 ? "success" : "error"),
            ProfilePerformanceWidget(id: "form", title: "Form (L5)", value: "\(recentWins)V - \(recentLosses)F", detail: "Resultat på senaste 5 matcherna", symbol: "waveform.path.ecg")
        ]
    }

    private func calculateServeSplitStats(matches: [Match], playerId: UUID) -> (firstWins: Int, firstLosses: Int, firstWinRate: Int, secondWins: Int, secondLosses: Int, secondWinRate: Int) {
        let pIdString = playerId.uuidString.lowercased()
        var fW = 0, fL = 0, sW = 0, sL = 0
        for match in matches {
            let teamAIds = match.teamAPlayerIds.compactMap { $0?.lowercased() }
            let teamBIds = match.teamBPlayerIds.compactMap { $0?.lowercased() }
            let isTeamA = teamAIds.contains(pIdString)
            let isTeamB = teamBIds.contains(pIdString)
            guard isTeamA || isTeamB else { continue }

            let servedFirst = match.teamAServesFirst ?? true
            let iServedFirst = (isTeamA && servedFirst) || (isTeamB && !servedFirst)
            let iWon = isTeamA ? match.teamAScore > match.teamBScore : match.teamBScore > match.teamAScore

            if iServedFirst {
                if iWon { fW += 1 } else { fL += 1 }
            } else {
                if iWon { sW += 1 } else { sL += 1 }
            }
        }
        let fRate = (fW + fL) > 0 ? Int(round(Double(fW) / Double(fW + fL) * 100)) : 0
        let sRate = (sW + sL) > 0 ? Int(round(Double(sW) / Double(sW + sL) * 100)) : 0
        return (fW, fL, fRate, sW, sL, sRate)
    }

    private func playerEloDelta(playerId: UUID, days: Int) -> Int {
        guard let stats = playerBadgeStats[playerId] else { return 0 }
        let cutoff = Date().addingTimeInterval(Double(-days * 24 * 60 * 60))
        return stats.eloHistory
            .filter { $0.date >= cutoff }
            .reduce(0) { $0 + $1.delta }
    }

    private func playerLastSessionEloDelta(playerId: UUID) -> Int {
        guard let stats = playerBadgeStats[playerId],
              let latestMatch = stats.eloHistory.last else { return 0 }

        let calendar = Calendar.current
        return stats.eloHistory
            .filter { calendar.isDate($0.date, inSameDayAs: latestMatch.date) }
            .reduce(0) { $0 + $1.delta }
    }

    var profilePerformanceWidgets: [ProfilePerformanceWidget] {
        profilePerformanceWidgets(filter: .all)
    }

    func playerEloTimeline(playerId: UUID, filter: DashboardMatchFilter) -> [ProfileEloPoint] {
        guard let stats = playerBadgeStats[playerId] else {
            let pElo = players.first(where: { $0.id == playerId })?.elo ?? 1000
            return [ProfileEloPoint(id: UUID(), matchId: UUID(), date: Date(), elo: pElo)]
        }

        if filter == .all {
            return stats.eloHistory.map { entry in
                ProfileEloPoint(id: entry.matchId, matchId: entry.matchId, date: entry.date, elo: entry.elo)
            }
        }

        let filteredMatchIds = Set(filteredMatches(allMatches, filter: filter).map { $0.id })
        let timeline = stats.eloHistory.compactMap { entry -> ProfileEloPoint? in
            guard filteredMatchIds.contains(entry.matchId) else { return nil }
            return ProfileEloPoint(id: entry.matchId, matchId: entry.matchId, date: entry.date, elo: entry.elo)
        }

        if timeline.isEmpty {
            return [ProfileEloPoint(id: UUID(), matchId: UUID(), date: Date(), elo: stats.currentElo)]
        }

        return timeline
    }

    func profileEloTimeline(filter: DashboardMatchFilter) -> [ProfileEloPoint] {
        guard let currentId = currentPlayer?.id else { return [] }
        return playerEloTimeline(playerId: currentId, filter: filter)
    }

    func buildComparisonTimeline(playerIds: [UUID], filter: DashboardMatchFilter) -> [ComparisonTimelinePoint] {
        guard !playerIds.isEmpty else { return [] }

        // 1. Collect all match entries for all requested players within the filtered set
        // ⚡ Optimization: Use a map and set to avoid O(N^2) search
        var timelineEntries: [Match] = []
        let filteredMatches = Set(filteredMatches(allMatches, filter: filter).map { $0.id })
        let matchMap = Dictionary(uniqueKeysWithValues: allMatches.map { ($0.id, $0) })
        var seenMatchIds = Set<UUID>()

        for pid in playerIds {
            if let stats = playerBadgeStats[pid] {
                for entry in stats.eloHistory {
                    if filteredMatches.contains(entry.matchId) && !seenMatchIds.contains(entry.matchId) {
                        if let match = matchMap[entry.matchId] {
                            timelineEntries.append(match)
                            seenMatchIds.insert(entry.matchId)
                        }
                    }
                }
            }
        }

        // 2. Sort timeline entries chronologically
        // Align with PWA: if same date, sort by ID to ensure stable order
        let sortedTimeline = timelineEntries.sorted { lhs, rhs in
            if lhs.playedAt != rhs.playedAt {
                return lhs.playedAt < rhs.playedAt
            }
            return lhs.id.uuidString < rhs.id.uuidString
        }

        if sortedTimeline.isEmpty { return [] }

        // 3. Build the timeline rows by tracking each player's ELO at each match point
        var result: [ComparisonTimelinePoint] = []
        var lastKnownElos: [UUID: Int] = [:]

        // Initialize lastKnownElos with the ELO before their first match in the visible timeline
        for pid in playerIds {
            lastKnownElos[pid] = 1000 // Default fallback

            if let stats = playerBadgeStats[pid], let firstVisibleMatch = sortedTimeline.first {
                // Find the latest history entry before the first match in our timeline
                if let matchIndex = stats.eloHistory.firstIndex(where: { $0.matchId == firstVisibleMatch.id }) {
                    if matchIndex > 0 {
                        // Use ELO from the previous match
                        lastKnownElos[pid] = stats.eloHistory[matchIndex - 1].elo
                    } else {
                        // First visible match IS the first match ever
                        lastKnownElos[pid] = stats.eloHistory[0].elo - stats.eloHistory[0].delta
                    }
                } else {
                    // Player has no matches in the visible timeline, use their current ELO or 1000
                    lastKnownElos[pid] = stats.currentElo
                }
            }
        }

        // ⚡ Optimization: Pre-index player ELOs for O(1) lookup in timeline loop
        var playerEloMaps: [UUID: [UUID: Int]] = [:]
        for pid in playerIds {
            playerEloMaps[pid] = playerBadgeStats[pid]?.eloHistory.reduce(into: [UUID: Int]()) { $0[$1.matchId] = $1.elo }
        }

        for (index, match) in sortedTimeline.enumerated() {
            for pid in playerIds {
                if let elo = playerEloMaps[pid]?[match.id] {
                    lastKnownElos[pid] = elo
                }
            }

            result.append(ComparisonTimelinePoint(
                id: index,
                date: match.playedAt,
                matchId: match.id,
                elos: lastKnownElos
            ))
        }

        return result
    }

    // Note for non-coders:
    // This helper prepares all chart data in one place so views can focus on UI only.
    // It also returns explicit loading/empty/error states that the screens can render.
    func comparisonChartDataset(playerIds: [UUID], filter: DashboardMatchFilter, timeRange: TrendChartTimeRange) -> ChartDatasetState<ComparisonChartDataset> {
        if isDashboardLoading && allMatches.isEmpty {
            return .loading
        }

        if let lastErrorMessage, allMatches.isEmpty {
            return .error(message: lastErrorMessage)
        }

        let filteredTimeline = buildComparisonTimeline(playerIds: playerIds, filter: filter)
            .filter { point in includes(point.date, in: timeRange) }

        guard !filteredTimeline.isEmpty else {
            return .empty(message: "Ingen trenddata för valt intervall ännu.")
        }

        let matchLookup = Dictionary(uniqueKeysWithValues: allMatches.map { ($0.id, $0) })
        var winsByPlayer: [UUID: Int] = [:]
        var gamesByPlayer: [UUID: Int] = [:]
        var latestWinRateByPlayer: [UUID: Double] = [:]

        let points = filteredTimeline.map { point in
            if let match = matchLookup[point.matchId] {
                for pid in playerIds {
                    guard let didWin = didPlayerWin(playerId: pid, in: match) else { continue }
                    gamesByPlayer[pid, default: 0] += 1
                    if didWin {
                        winsByPlayer[pid, default: 0] += 1
                    }
                    let wins = winsByPlayer[pid, default: 0]
                    let games = gamesByPlayer[pid, default: 0]
                    latestWinRateByPlayer[pid] = games == 0 ? 0 : (Double(wins) / Double(games) * 100)
                }
            }

            return ComparisonMetricTimelinePoint(
                id: point.id,
                date: point.date,
                matchId: point.matchId,
                elos: point.elos,
                winRates: latestWinRateByPlayer
            )
        }

        return .ready(ComparisonChartDataset(playerIds: playerIds, points: points))
    }

    func chartDisplayName(for playerId: UUID) -> String {
        playerId == currentPlayer?.id ? "Du" : playerName(for: playerId)
    }

    func eloDomain(for points: [ComparisonMetricTimelinePoint], players: [UUID]) -> ClosedRange<Double> {
        let values = points.flatMap { point in players.compactMap { point.elos[$0].map(Double.init) } }
        guard let minValue = values.min(), let maxValue = values.max() else { return 900...1100 }
        let padding = max(8, (maxValue - minValue) * 0.08)
        return (minValue - padding)...(maxValue + padding)
    }

    func profileComboStats(filter: DashboardMatchFilter) -> [ProfileComboStat] {
        guard let currentPlayer else { return [] }
        let myMatches = matchesForProfile(filter: filter)
        var teammateGames: [UUID: Int] = [:]
        var teammateWins: [UUID: Int] = [:]
        var opponentGames: [UUID: Int] = [:]

        for match in myMatches {
            let teamAIds = match.teamAPlayerIds.compactMap { $0.flatMap(UUID.init(uuidString:)) }
            let teamBIds = match.teamBPlayerIds.compactMap { $0.flatMap(UUID.init(uuidString:)) }
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
            ProfileComboStat(id: "top-teammate", title: "Vanligaste partner", value: teammateName, detail: topTeammate.map { "\($0.value) matcher tillsammans" } ?? "Spela fler matcher för att se data", symbol: "person.2.fill"),
            ProfileComboStat(id: "best-combo", title: "Bästa vinstprocent", value: "\(comboName) · \(comboRate)", detail: bestCombo.map { "\(teammateWins[$0.key, default: 0]) vinster på \($0.value) matcher" } ?? "Kräver minst två gemensamma matcher", symbol: "chart.bar.doc.horizontal"),
            ProfileComboStat(id: "matchup-density", title: "Tätaste möten", value: densityName, detail: densestOpponent.map { "Mött \($0.value) gånger i valt filter" } ?? "Inga motståndare hittades i filtret", symbol: "square.grid.3x3.fill")
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

    private func resolvePlayerName(playerId: String?, fallbackLabel: String? = nil) -> String {
        guard let playerId = playerId, !playerId.isEmpty else {
            return fallbackLabel ?? "Gästspelare"
        }

        if playerId == "guest" {
            return fallbackLabel ?? "Gästspelare"
        }

        if playerId.hasPrefix("name:") {
            return String(playerId.dropFirst(5))
        }

        if let uuid = UUID(uuidString: playerId) {
            if let player = players.first(where: { $0.id == uuid }) {
                return player.fullName
            }
            if let participant = tournamentParticipants.first(where: { $0.profileId == uuid }) {
                return participant.profileName
            }
            return fallbackLabel ?? "Spelare \(uuid.uuidString.prefix(6))"
        }

        return fallbackLabel ?? playerId
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

        // Pre-calculate averages for explanation
        let teamAIds = match.teamAPlayerIds.compactMap { $0.flatMap { UUID(uuidString: $0) } }
        let teamBIds = match.teamBPlayerIds.compactMap { $0.flatMap { UUID(uuidString: $0) } }

        let getPreElo = { (id: UUID) -> Int in
            let stats = self.playerBadgeStats[id]
            if let history = stats?.eloHistory, let entry = history.first(where: { $0.matchId == match.id }) {
                return entry.elo - entry.delta
            }
            return (self.players.first(where: { $0.id == id })?.elo ?? 1000)
        }

        let avgA = teamAIds.isEmpty ? 1000.0 : Double(teamAIds.reduce(0) { $0 + getPreElo($1) }) / Double(teamAIds.count)
        let avgB = teamBIds.isEmpty ? 1000.0 : Double(teamBIds.reduce(0) { $0 + getPreElo($1) }) / Double(teamBIds.count)
        let isSingles = teamAIds.count == 1 && teamBIds.count == 1
        let weight = EloService.getSinglesAdjustedMatchWeight(match: match, isSinglesMatch: isSingles)

        return uniqueSlots
            .map { playerId, fallbackName in
                let uuid = playerId.flatMap { UUID(uuidString: $0) }
                let stats = uuid.flatMap { self.playerBadgeStats[$0] }
                let historyEntry = uuid.flatMap { pid in
                    stats?.eloHistory.first(where: { $0.matchId == match.id })
                }

                let fallbackSnapshot = uuid.flatMap { matchEloSnapshot(for: $0, in: match) }
                let delta = historyEntry?.delta ?? fallbackSnapshot?.delta ?? 0
                let estimatedAfter = historyEntry?.elo ?? fallbackSnapshot?.after ?? (uuid.flatMap { pid in playerBadgeStats[pid]?.currentElo } ?? 1000)
                let estimatedBefore = estimatedAfter - delta

                var explanation: String? = nil
                if let pid = uuid {
                    let teamAIds = match.teamAPlayerIds.compactMap { $0.flatMap { UUID(uuidString: $0) } }
                    let isTeamA = teamAIds.contains(pid)
                    let didWin = isTeamA ? match.teamAScore > match.teamBScore : match.teamBScore > match.teamAScore
                    let myTeamAvg = isTeamA ? avgA : avgB
                    let oppTeamAvg = isTeamA ? avgB : avgA

                    explanation = EloService.getEloExplanation(
                        delta: delta,
                        playerElo: estimatedBefore,
                        teamAverageElo: myTeamAvg,
                        opponentAverageElo: oppTeamAvg,
                        matchWeight: weight,
                        didWin: didWin,
                        games: stats?.matchesPlayed ?? 0
                    )
                }

                return MatchEloChangeRow(
                    id: uuid ?? UUID(),
                    playerName: resolvePlayerName(playerId: playerId, fallbackLabel: fallbackName),
                    delta: delta,
                    estimatedBefore: estimatedBefore,
                    estimatedAfter: estimatedAfter,
                    explanation: explanation
                )
            }
            .sorted { lhs, rhs in
                if lhs.delta != rhs.delta { return lhs.delta > rhs.delta }
                return lhs.playerName < rhs.playerName
            }
    }

    private func matchEloSnapshot(for playerId: UUID, in match: Match) -> (before: Int, after: Int, delta: Int)? {
        guard let stats = playerBadgeStats[playerId] else { return nil }

        if let entry = stats.eloHistory.first(where: { $0.matchId == match.id }) {
            return (entry.elo - entry.delta, entry.elo, entry.delta)
        }

        let ordered = stats.eloHistory.sorted { $0.date < $1.date }
        guard let nearest = ordered.last(where: { $0.date <= match.playedAt }) else {
            let current = stats.currentElo
            return (current, current, 0)
        }
        return (nearest.elo - nearest.delta, nearest.elo, nearest.delta)
    }

    func tournamentPlayerName(for profileId: UUID) -> String {
        resolvePlayerName(playerId: profileId.uuidString)
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

    private func buildLeaderboardPlayers() -> [LeaderboardPlayer] {
        players.compactMap { player in
            let stats = playerBadgeStats[player.id]
            let winRate = (stats?.matchesPlayed ?? 0) > 0 ? Int(round(Double(stats?.wins ?? 0) / Double(stats?.matchesPlayed ?? 1) * 100)) : 0

            let eloHistory = (stats?.eloHistory.suffix(10).map { $0.elo }) ?? []

            return LeaderboardPlayer(
                id: player.id,
                name: player.profileName,
                elo: stats?.currentElo ?? player.elo,
                games: stats?.matchesPlayed ?? 0,
                wins: stats?.wins ?? 0,
                losses: stats?.losses ?? 0,
                winRate: winRate,
                streak: getStreakLabel(stats: stats),
                eloHistory: Array(eloHistory),
                avatarURL: player.avatarURL,
                featuredBadgeId: player.featuredBadgeId,
                isAdmin: player.isAdmin,
                isMe: player.id == currentIdentity?.profileId
            )
        }.sorted { $0.elo > $1.elo }
    }

    private func getStreakLabel(stats: PlayerBadgeStats?) -> String {
        guard let stats = stats else { return "—" }
        if stats.currentWinStreak > 0 {
            return "\(stats.currentWinStreak)V"
        } else if stats.currentLossStreak > 0 {
            return "\(stats.currentLossStreak)F"
        }
        return "—"
    }

    var profileWinRate: Int {
        guard let currentPlayer else { return 0 }
        let involvingCurrent = currentPlayerMatches
        guard !involvingCurrent.isEmpty else { return 0 }
        let wins = involvingCurrent.filter { match in
            let iAmTeamA = match.teamAPlayerIds.compactMap { $0 }.contains(currentPlayer.id.uuidString)
                || match.teamAName.localizedCaseInsensitiveContains(currentPlayer.fullName)
                || match.teamAName.localizedCaseInsensitiveContains(currentPlayer.profileName)
            return iAmTeamA ? match.teamAScore > match.teamBScore : match.teamBScore > match.teamAScore
        }
        return Int((Double(wins.count) / Double(involvingCurrent.count)) * 100)
    }

    var profileMatchesPlayed: Int {
        currentPlayerMatches.count
    }

    private func buildHeadToHeadSummary() -> [HeadToHeadSummary] {
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

    var globalDateRange: (start: Date?, end: Date?) {
        let now = Date()
        let calendar = Calendar.current

        switch globalFilter {
        case .all, .short, .long, .tournaments:
            return (nil, nil)
        case .last7:
            return (calendar.date(byAdding: .day, value: -7, to: now), now)
        case .last30:
            return (calendar.date(byAdding: .day, value: -30, to: now), now)
        case .custom:
            let range = globalCustomDateRange
            return (range.start, range.end)
        }
    }

    var globalScoreType: String? {
        switch globalFilter {
        case .short, .long: return "sets"
        default: return nil
        }
    }

    var dashboardFilteredMatches: [Match] {
        filteredMatches(matches, filter: globalFilter)
    }

    // Note for non-coders:
    // We show this label in the UI so people can confirm which filter scope is currently applied.
    var globalActiveFilterLabel: String {
        if globalFilter == .custom {
            let formatter = DateFormatter()
            formatter.dateStyle = .medium
            formatter.timeStyle = .none
            return "Custom: \(formatter.string(from: globalCustomStartDate)) → \(formatter.string(from: globalCustomEndDate))"
        }
        return globalFilter.title
    }

    // Note for non-coders:
    // End date is normalized to 23:59:59 so selecting a day includes all matches played that day.
    var globalCustomDateRange: (start: Date, end: Date) {
        let calendar = Calendar.current
        let rawStart = calendar.startOfDay(for: globalCustomStartDate)
        let rawEndDay = calendar.startOfDay(for: globalCustomEndDate)
        let start = min(rawStart, rawEndDay)
        let normalizedEndDay = max(rawStart, rawEndDay)
        let end = calendar.date(byAdding: DateComponents(day: 1, second: -1), to: normalizedEndDay) ?? globalCustomEndDate
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
            let range = globalCustomDateRange
            return source.filter { $0.playedAt >= range.start && $0.playedAt <= range.end }
        }
    }

    private func didCurrentPlayerWin(_ match: Match, player: Player) -> Bool {
        let teamAIds = match.teamAPlayerIds.compactMap { $0?.lowercased() }
        let iAmTeamA = teamAIds.contains(player.id.uuidString.lowercased()) || match.teamAName.localizedCaseInsensitiveContains(player.fullName)
        return iAmTeamA ? match.teamAScore > match.teamBScore : match.teamBScore > match.teamAScore
    }

    private func didPlayerWin(playerId: UUID, in match: Match) -> Bool? {
        let teamAIds = Set(match.teamAPlayerIds.compactMap { $0.flatMap(UUID.init(uuidString:)) })
        let teamBIds = Set(match.teamBPlayerIds.compactMap { $0.flatMap(UUID.init(uuidString:)) })

        if teamAIds.contains(playerId) {
            return match.teamAScore > match.teamBScore
        }
        if teamBIds.contains(playerId) {
            return match.teamBScore > match.teamAScore
        }
        return nil
    }

    private func includes(_ date: Date, in range: TrendChartTimeRange) -> Bool {
        guard range != .all else { return true }
        let now = Date()
        let calendar = Calendar.current
        let dayOffset: Int

        switch range {
        case .days30: dayOffset = -30
        case .days90: dayOffset = -90
        case .year1: dayOffset = -365
        case .all: dayOffset = 0
        }

        guard let cutoff = calendar.date(byAdding: .day, value: dayOffset, to: now) else { return true }
        return date >= cutoff && date <= now
    }

    private func playerName(for id: UUID) -> String {
        players.first(where: { $0.id == id })?.profileName
        ?? players.first(where: { $0.id == id })?.fullName
        ?? "Unknown"
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




    var historyFilteredMatches: [Match] {
        historyMatches
    }

    func reloadHistoryMatches() async {
        isHistoryLoading = true
        defer { isHistoryLoading = false }

        do {
            let range = globalDateRange
            let scoreType = globalScoreType
            let tournamentOnly = globalFilter == .tournaments

            let page = try await apiClient.fetchMatchesPage(
                limit: historyPageSize,
                offset: 0,
                startDate: range.start,
                endDate: range.end,
                scoreType: scoreType,
                tournamentOnly: tournamentOnly
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
            let range = globalDateRange
            let scoreType = globalScoreType
            let tournamentOnly = globalFilter == .tournaments

            let nextPage = try await apiClient.fetchMatchesPage(
                limit: historyPageSize,
                offset: offset,
                startDate: range.start,
                endDate: range.end,
                scoreType: scoreType,
                tournamentOnly: tournamentOnly
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
        realtimeClient?.connect()
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
        if let allMatches = partial.allMatches {
            self.allMatches = allMatches
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
            recalculateDerivedStats()
            if areScheduleNotificationsEnabled {
                await notificationService.scheduleUpcomingGameReminders(schedule, preferences: notificationPreferences)
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
            self.allMatches = fallback.allMatches
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
                await notificationService.scheduleUpcomingGameReminders(schedule, preferences: notificationPreferences)
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

    private struct DeepLinkParseError: LocalizedError {
        let message: String

        var errorDescription: String? { message }
    }

    private enum DeepLinkRoute: Equatable {
        case schedule(pollId: UUID?, dayId: UUID?, slots: [AvailabilitySlot])
        case singleGame(mode: String?)
        case match(matchId: UUID?)
    }

    // Note for non-coders:
    // This parser turns raw URL text into a small "route enum", so we can validate everything once
    // and keep the actual navigation logic simple and safe.
    private func parseDeepLink(_ url: URL) -> Result<DeepLinkRoute, DeepLinkParseError> {
        guard let components = URLComponents(url: url, resolvingAgainstBaseURL: false) else {
            return .failure(DeepLinkParseError(message: "Länken kunde inte läsas."))
        }

        // Note for non-coders:
        // Universal links (https://padelnative.app/...) store route names in the URL path,
        // while custom links (padelnative://schedule...) store them in the host.
        // We normalize both formats into the same route string so one parser can handle both.
        let isWebLink = ["http", "https"].contains((components.scheme ?? "").lowercased())
        let hostPart = components.host?.trimmingCharacters(in: CharacterSet(charactersIn: "/")).lowercased() ?? ""
        let pathPart = components.path.trimmingCharacters(in: CharacterSet(charactersIn: "/")).lowercased()
        let routeSource = isWebLink ? pathPart : ([hostPart, pathPart].filter { !$0.isEmpty }.joined(separator: "/"))
        let items = components.queryItems ?? []

        let pathSegments = routeSource
            .split(separator: "/")
            .map(String.init)
            .filter { !$0.isEmpty }
        let routeName = pathSegments.first ?? ""

        if routeName == "schema" || routeName == "schedule" {
            let allowedNames: Set<String> = ["poll", "pollid", "day", "dayid", "slots"]
            let unknownNames = items
                .map { $0.name.lowercased() }
                .filter { !allowedNames.contains($0) }
            if let unexpected = unknownNames.first {
                return .failure(DeepLinkParseError(message: "Länken har en okänd parameter: \(unexpected)."))
            }

            let pollValue = items.first(where: { ["pollid", "poll"].contains($0.name.lowercased()) })?.value
            let dayValue = items.first(where: { ["dayid", "day"].contains($0.name.lowercased()) })?.value

            let parsedPoll = parseOptionalUUID(pollValue)
            let parsedDay = parseOptionalUUID(dayValue)
            guard parsedPoll.isValid, parsedDay.isValid else {
                return .failure(DeepLinkParseError(message: "Länken innehåller ogiltiga schema-id:n."))
            }

            let pollId = parsedPoll.value
            let dayId = parsedDay.value

            let slots: [AvailabilitySlot]
            if let slotsRaw = items.first(where: { $0.name.lowercased() == "slots" })?.value {
                let slotValues = slotsRaw
                    .split(separator: ",")
                    .map { String($0).trimmingCharacters(in: .whitespacesAndNewlines) }
                    .filter { !$0.isEmpty }
                let parsedSlots = slotValues.compactMap(AvailabilitySlot.init(rawValue:))
                guard parsedSlots.count == slotValues.count else {
                    return .failure(DeepLinkParseError(message: "Länken innehåller ett okänt tidsintervall i slots."))
                }
                slots = parsedSlots
            } else {
                // Note for non-coders: no slots means "all day", matching web behavior.
                slots = []
            }

            return .success(.schedule(pollId: pollId, dayId: dayId, slots: slots))
        }

        if routeName == "single-game" || routeName == "singlegame" {
            let allowedNames: Set<String> = ["mode"]
            let unknownNames = items
                .map { $0.name.lowercased() }
                .filter { !allowedNames.contains($0) }
            if let unexpected = unknownNames.first {
                return .failure(DeepLinkParseError(message: "Länken har en okänd parameter: \(unexpected)."))
            }

            if let mode = items.first(where: { $0.name.lowercased() == "mode" })?.value?.lowercased() {
                guard ["1v1", "2v2"].contains(mode) else {
                    return .failure(DeepLinkParseError(message: "Länken innehåller ett ogiltigt spelläge."))
                }
                return .success(.singleGame(mode: mode))
            }

            return .success(.singleGame(mode: nil))
        }

        if routeName == "match" {
            let pathMatchId = pathSegments.count > 1 ? pathSegments[1] : nil
            let queryMatchId = items.first(where: { ["id", "match", "matchid"].contains($0.name.lowercased()) })?.value
            let parsedMatch = parseOptionalUUID(pathMatchId ?? queryMatchId)
            guard parsedMatch.isValid else {
                return .failure(DeepLinkParseError(message: "Länken innehåller ett ogiltigt match-id."))
            }
            return .success(.match(matchId: parsedMatch.value))
        }

        return .failure(DeepLinkParseError(message: "Länken matchar ingen känd sida i appen."))
    }

    // Note for non-coders:
    // This reads links for schedule votes and single-game mode so the app can open the right tool directly.
    func handleIncomingURL(_ url: URL) {
        switch parseDeepLink(url) {
        case let .success(route):
            applyDeepLinkRoute(route)
        case let .failure(error):
            showDeepLinkFallbackBanner(error.message)
        }
    }

    private func applyDeepLinkRoute(_ route: DeepLinkRoute) {
        switch route {
        case let .schedule(pollId, dayId, slots):
            openScheduleTab()
            deepLinkedPollId = pollId
            deepLinkedPollDayId = dayId
            deepLinkedVoteSlots = slots
            hasPendingDeepLinkedVote = dayId != nil

            if pollId == nil && dayId == nil {
                setScheduleActionMessage("Länken öppnade schemafliken, men saknade omröstningsdetaljer.")
            }

        case let .singleGame(mode):
            guard canUseSingleGame else {
                authMessage = "Logga in för att öppna matchformuläret från en länk."
                return
            }

            selectedMainTab = 1
            deepLinkedSingleGameMode = mode

        case .match:
            // Note for non-coders: match share links open the history tab so users land
            // in the same area where match summaries and details are shown.
            openHistoryTab()
        }
    }

    private func parseOptionalUUID(_ rawValue: String?) -> (isValid: Bool, value: UUID?) {
        guard let rawValue else { return (true, nil) }
        guard let parsed = UUID(uuidString: rawValue) else { return (false, nil) }
        return (true, parsed)
    }

    private func showDeepLinkFallbackBanner(_ reason: String) {
        deepLinkBannerTask?.cancel()
        deepLinkFallbackBanner = "Vi kunde inte öppna länken. \(reason)"
        deepLinkBannerTask = Task { [weak self] in
            try? await Task.sleep(nanoseconds: 4_000_000_000)
            await MainActor.run {
                self?.deepLinkFallbackBanner = nil
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
        globalFilter = filter
        selectedMainTab = 0
    }

    func openHistoryTab() {
        selectedMainTab = 4
    }

    func generatePlayerStatsCard() -> URL? {
        guard let player = currentPlayer else { return nil }
        let stats = playerBadgeStats[player.id]
        let rank = leaderboardPlayers.firstIndex(where: { $0.id == player.id }).map { $0 + 1 } ?? 0
        let wins = stats?.wins ?? 0
        let games = stats?.matchesPlayed ?? 0
        let winRate = games > 0 ? Int(round(Double(wins) / Double(games) * 100)) : 0
        let badgeIcon = player.featuredBadgeId.flatMap { BadgeService.getBadgeIconById($0) } ?? ""

        let lines = [
            "Spelarprofil: \(player.profileName) \(badgeIcon)",
            "",
            "ELO Ranking: \(player.elo)",
            "Plats på topplistan: #\(rank)",
            "",
            "Matcher: \(games)",
            "Vinster: \(wins)",
            "Vinstprocent: \(winRate)%",
            "",
            "Senaste form: \(getStreakLabel(stats: stats))"
        ]

        return try? ShareCardService.createShareImageFile(
            title: "Padel Profilkort",
            bodyLines: lines,
            fileNamePrefix: "player-card"
        )
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

        let trimmedName = ProfileNameService.stripBadgeLabelFromName(profileDisplayNameDraft, badgeId: selectedFeaturedBadgeId ?? currentPlayer?.featuredBadgeId)
        guard trimmedName.count >= 2 else {
            profileSetupMessage = "Please use at least 2 characters for your display name (badges are automatically stripped)."
            return
        }

        let cleanedAvatar = profileAvatarURLInput.trimmingCharacters(in: .whitespacesAndNewlines)
        let normalizedAvatar = cleanedAvatar.isEmpty ? nil : cleanedAvatar
        let previousAvatar = currentPlayer?.avatarURL?.trimmingCharacters(in: .whitespacesAndNewlines)
        isSavingProfileSetup = true
        defer { isSavingProfileSetup = false }

        do {
            try await apiClient.updateOwnProfile(
                profileId: profileId,
                fullName: trimmedName,
                profileName: trimmedName,
                avatarURL: normalizedAvatar,
                featuredBadgeId: selectedFeaturedBadgeId
            )

            // Note for non-coders:
            // If avatar text changed, we remove old cached images so future screens show the latest photo.
            if previousAvatar != normalizedAvatar {
                AvatarImageService.shared.invalidate(urlString: previousAvatar)
                AvatarImageService.shared.invalidate(urlString: normalizedAvatar)
            }

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
                // Note for non-coders:
                // Realtime probes can run often, so a "syncing" banner here can feel permanent.
                // We now only show a short "updated" confirmation after refresh finishes.
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
            var playersOrMatchesChanged = false

            if domains.contains(.players) {
                let latestPlayers = try await apiClient.fetchLeaderboard()
                if playerSignature(latestPlayers) != playerSignature(players) {
                    players = latestPlayers
                    syncProfileSetupDraftFromCurrentPlayer()
                    changedCollections.append("players")
                    playersOrMatchesChanged = true
                    if canUseAdmin {
                        await refreshAdminProfiles(silently: true)
                    }
                }
            }

            if domains.contains(.matches) {
                async let latestMatchesTask = apiClient.fetchRecentMatches(limit: historyPageSize)
                async let latestAllMatchesTask = apiClient.fetchAllMatches()
                let latestMatches = try await latestMatchesTask
                let latestAllMatches = try await latestAllMatchesTask

                if matchSignature(latestMatches) != matchSignature(matches) {
                    matches = latestMatches
                    allMatches = latestAllMatches

                    // Note for non-coders:
                    // Keep already-loaded older history pages while replacing the newest chunk.
                    let latestIds = Set(latestMatches.map { $0.id })
                    let olderAlreadyLoaded = historyMatches.filter { !latestIds.contains($0.id) }
                    historyMatches = latestMatches + olderAlreadyLoaded
                    changedCollections.append("matches")
                    playersOrMatchesChanged = true
                }
            }

            if playersOrMatchesChanged {
                recalculateDerivedStats()
            }

            if domains.contains(.schedule) {
                let latestSchedule = try await apiClient.fetchSchedule()
                if scheduleSignature(latestSchedule) != scheduleSignature(schedule) {
                    schedule = latestSchedule
                    if areScheduleNotificationsEnabled {
                        await notificationService.scheduleUpcomingGameReminders(schedule, preferences: notificationPreferences)
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

            updateLiveActivity()
        } catch {
            // Note for non-coders:
            // If selective refresh fails, we do a full refresh as a safety net so data stays correct.
            await performFullLiveRefresh()
        }
    }

    private func updateLiveActivity() {
        guard let tournament = activeTournament else {
            LiveMatchActivityService.shared.endMatchActivity()
            return
        }

        // Note for non-coders:
        // We reuse standings points as a simple "live score" for the lock-screen card.
        let topA = tournamentStandings.first?.playerName ?? tournament.name
        let topB = tournamentStandings.dropFirst().first?.playerName ?? "Padel"
        let scoreA = tournamentStandings.first?.pointsFor ?? 0
        let scoreB = tournamentStandings.dropFirst().first?.pointsFor ?? 0
        let localizedStatus = LiveMatchActivityService.shared.localizedStatus(for: tournament.status)

        if tournament.status == "draft" || tournament.status == "in_progress" {
            LiveMatchActivityService.shared.startOrUpdateMatchActivity(
                matchId: tournament.id.uuidString,
                teamA: topA,
                teamB: topB,
                scoreA: scoreA,
                scoreB: scoreB,
                status: localizedStatus
            )
        } else {
            LiveMatchActivityService.shared.endMatchActivity(
                scoreA: scoreA,
                scoreB: scoreB,
                status: localizedStatus,
                matchId: tournament.id.uuidString
            )
        }
    }

    private func performFullLiveRefresh() async {
        do {
            async let playersTask = apiClient.fetchLeaderboard()
            async let matchesTask = apiClient.fetchRecentMatches(limit: historyPageSize)
            async let allMatchesTask = apiClient.fetchAllMatches()
            async let scheduleTask = apiClient.fetchSchedule()
            async let pollsTask = apiClient.fetchAvailabilityPolls()
            async let tournamentMarkerTask = apiClient.fetchTournamentLiveMarker()

            let latestPlayers = try await playersTask
            let latestMatches = try await matchesTask
            let latestAllMatches = try await allMatchesTask
            let latestSchedule = try await scheduleTask
            let latestPolls = sortPolls(try await pollsTask)
            let latestTournamentMarker = try await tournamentMarkerTask

            var changedCollections: [String] = []
            var playersOrMatchesChanged = false

            if playerSignature(latestPlayers) != playerSignature(players) {
                players = latestPlayers
                syncProfileSetupDraftFromCurrentPlayer()
                changedCollections.append("players")
                playersOrMatchesChanged = true
                if canUseAdmin {
                    await refreshAdminProfiles(silently: true)
                }
            }

            if matchSignature(latestMatches) != matchSignature(matches) {
                matches = latestMatches
                allMatches = latestAllMatches

                // Note for non-coders:
                // Live sync refreshes the newest chunk; we keep any already-loaded older
                // pages so long history doesn't disappear while background sync runs.
                let latestIds = Set(latestMatches.map { $0.id })
                let olderAlreadyLoaded = historyMatches.filter { !latestIds.contains($0.id) }
                historyMatches = latestMatches + olderAlreadyLoaded

                changedCollections.append("matches")
                playersOrMatchesChanged = true
            }

            if playersOrMatchesChanged {
                recalculateDerivedStats()
            }

            if scheduleSignature(latestSchedule) != scheduleSignature(schedule) {
                schedule = latestSchedule
                if areScheduleNotificationsEnabled {
                    await notificationService.scheduleUpcomingGameReminders(schedule, preferences: notificationPreferences)
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

            updateLiveActivity()
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
        let translated = unique.map { col -> String in
            switch col {
            case "players": return "spelare"
            case "matches": return "matcher"
            case "schedule": return "schema"
            case "polls": return "omröstningar"
            case "tournament": return "turnering"
            default: return col
            }
        }

        let prefix = unique.count == 1 ? "Uppdaterade" : "Uppdaterade sektioner:"
        liveUpdateBanner = "\(prefix) \(translated.joined(separator: ", "))."

        liveUpdateBannerTask?.cancel()
        liveUpdateBannerTask = Task { [weak self] in
            try? await Task.sleep(nanoseconds: 2_200_000_000)
            guard !Task.isCancelled else { return }
            await MainActor.run {
                self?.liveUpdateBanner = nil
            }
        }
    }

    // Note for non-coders:
    // Action messages are short-lived confirmations (like "saved").
    // Auto-clearing keeps the status panel from looking stuck forever.
    private func setScheduleActionMessage(_ message: String?, autoClearAfter seconds: Double = 3.5) {
        scheduleActionMessage = message
        scheduleMessageClearTask?.cancel()
        guard message != nil else { return }

        scheduleMessageClearTask = Task { [weak self] in
            try? await Task.sleep(nanoseconds: UInt64(seconds * 1_000_000_000))
            guard !Task.isCancelled else { return }
            await MainActor.run {
                self?.scheduleActionMessage = nil
            }
        }
    }

    private func shouldIgnoreScheduleError(_ error: Error) -> Bool {
        if error is CancellationError {
            return true
        }

        if let urlError = error as? URLError, urlError.code == .cancelled {
            return true
        }

        return false
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
            .map {
                // Note for non-coders:
                // A "signature" is just a compact text fingerprint we use to detect if schedule data changed.
                let location = $0.location ?? ""
                let description = $0.description ?? ""
                return "\($0.id.uuidString)|\($0.startsAt.timeIntervalSince1970)|\(location)|\(description)"
            }
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
                await notificationService.scheduleUpcomingGameReminders(schedule, preferences: notificationPreferences)
            }
            scheduleErrorMessage = nil
        } catch {
            guard !shouldIgnoreScheduleError(error) else {
                // Note for non-coders:
                // A cancelled refresh is normal during pull-to-refresh retries.
                // We skip the warning so users only see real failures.
                return
            }
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
            setScheduleActionMessage("Direktlänken öppnade rätt dag och sparade din röst.")
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
            setScheduleActionMessage("Poll created successfully.")
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
            setScheduleActionMessage("Poll closed.")
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
            setScheduleActionMessage("Poll deleted.")
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
                setScheduleActionMessage("Vote removed.")
            } else {
                try await apiClient.upsertAvailabilityVote(dayId: day.id, profileId: profileId, slotPreferences: Array(draft.slots))
                setScheduleActionMessage("Vote saved.")
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
            setScheduleActionMessage("Reminder sent to \(result.sent)/\(result.total) players.")
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
                setScheduleActionMessage("Kalenderinbjudan skickad till \(result.sent)/\(result.total).")
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
        scoreTarget: Int?,
        teamAPlayerIds: [String?]? = nil,
        teamBPlayerIds: [String?]? = nil,
        expectedUpdatedAt: Date? = nil
    ) async {
        guard canUseAdmin else {
            statusMessage = "Endast admin kan ändra matcher i iOS-appen just nu."
            return
        }

        // Note for non-coders:
        // We save the exact values the user edited so we can compare against
        // the latest server row if someone else updated the same match first.
        let localDraft = MatchUpdateDraft(
            baseMatch: match,
            playedAt: playedAt,
            teamAScore: teamAScore,
            teamBScore: teamBScore,
            scoreType: scoreType,
            scoreTarget: scoreTarget,
            teamAPlayerIds: teamAPlayerIds ?? match.teamAPlayerIds,
            teamBPlayerIds: teamBPlayerIds ?? match.teamBPlayerIds
        )

        await submitMatchUpdate(draft: localDraft, expectedUpdatedAt: expectedUpdatedAt ?? match.updatedAt)
    }

    func resolvePendingMatchConflict(with resolution: MatchConflictEvent.Resolution) async {
        guard let conflict = pendingMatchConflict else { return }

        switch resolution {
        case .overwritten:
            recordConflictEvent(matchId: conflict.matchId, resolution: .overwritten, details: "User forced overwrite with local values.")
            await submitMatchUpdate(draft: conflict.localDraft, expectedUpdatedAt: nil)
            pendingMatchConflict = nil
        case .discarded:
            pendingMatchConflict = nil
            conflictResolutionMessage = "Dina lokala ändringar kasserades och senaste serverversion används."
            recordConflictEvent(matchId: conflict.matchId, resolution: .discarded, details: "User discarded pending edits.")
            await bootstrap()
        case .merged:
            guard conflict.canMerge else {
                conflictResolutionMessage = "Sammanfogning gick inte eftersom både lokalt och servern ändrade samma fält."
                recordConflictEvent(matchId: conflict.matchId, resolution: .mergeBlocked, details: "Merge blocked due to overlapping score edits.")
                return
            }

            let mergedDraft = MatchUpdateDraft(
                baseMatch: conflict.latestServerMatch,
                playedAt: conflict.latestServerMatch.playedAt,
                teamAScore: conflict.localDraft.teamAScore,
                teamBScore: conflict.localDraft.teamBScore,
                scoreType: conflict.localDraft.scoreType,
                scoreTarget: conflict.localDraft.scoreTarget,
                teamAPlayerIds: conflict.latestServerMatch.teamAPlayerIds,
                teamBPlayerIds: conflict.latestServerMatch.teamBPlayerIds
            )
            recordConflictEvent(matchId: conflict.matchId, resolution: .merged, details: "Merged non-overlapping edits and retried update.")
            await submitMatchUpdate(draft: mergedDraft, expectedUpdatedAt: conflict.latestServerMatch.updatedAt)
            pendingMatchConflict = nil
        case .detected, .mergeBlocked:
            return
        }
    }

    // Note for non-coders:
    // "expectedUpdatedAt" is our safety checkpoint (optimistic locking).
    // If the server timestamp no longer matches, we stop and ask the user how to resolve the conflict.
    private func submitMatchUpdate(draft: MatchUpdateDraft, expectedUpdatedAt: Date?) async {
        let team1 = draft.teamAPlayerIds.map { resolvePlayerName(playerId: $0) }
        let team2 = draft.teamBPlayerIds.map { resolvePlayerName(playerId: $0) }

        do {
            _ = try await apiClient.updateMatch(
                matchId: draft.baseMatch.id,
                expectedUpdatedAt: expectedUpdatedAt,
                playedAt: draft.playedAt,
                teamAScore: draft.teamAScore,
                teamBScore: draft.teamBScore,
                scoreType: draft.scoreType,
                scoreTarget: draft.scoreTarget,
                team1: team1,
                team2: team2,
                team1_ids: draft.teamAPlayerIds,
                team2_ids: draft.teamBPlayerIds
            )
            pendingMatchConflict = nil
            await bootstrap()
            conflictResolutionMessage = expectedUpdatedAt == nil ? "Konflikt löst: serverversionen ersattes med dina ändringar." : "Match uppdaterad utan konflikt."
            statusMessage = "Match uppdaterad."
        } catch let conflict as MatchUpdateConflictError {
            let context = MatchUpdateConflictContext(localDraft: draft, latestServerMatch: conflict.latestMatch)
            pendingMatchConflict = context
            conflictResolutionMessage = nil
            statusMessage = "Konflikt upptäckt. Välj hur du vill lösa den."
            recordConflictEvent(matchId: draft.baseMatch.id, resolution: .detected, details: "Server row changed before PATCH completed.")
        } catch {
            statusMessage = "Kunde inte uppdatera matchen: \(error.localizedDescription)"
        }
    }

    private func recordConflictEvent(matchId: UUID, resolution: MatchConflictEvent.Resolution, details: String) {
        conflictEvents.insert(
            MatchConflictEvent(matchId: matchId, recordedAt: Date(), resolution: resolution, details: details),
            at: 0
        )
        if conflictEvents.count > 40 {
            conflictEvents.removeLast(conflictEvents.count - 40)
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
        let keys = Set(allMatches.map { formatter.string(from: $0.playedAt) })
        return keys.sorted(by: >)
    }

    // Note for non-coders:
    // This creates a plain-language report text that admins can preview and share.
    // Enhanced with "Fun Facts" and deeper analytics to align with the PWA report logic.
    func generateMatchEveningReport(for dayKey: String) {
        guard canUseAdmin else {
            adminReportStatusMessage = "Admin-behörighet krävs för att skapa rapporter."
            return
        }

        let formatter = Self.adminDayFormatter
        let selectedMatches = allMatches.filter { formatter.string(from: $0.playedAt) == dayKey }

        guard !selectedMatches.isEmpty else {
            adminReportPreviewText = nil
            adminReportStatusMessage = "Inga matcher hittades för \(dayKey)."
            return
        }

        let totalMatches = selectedMatches.count
        let totalSets = selectedMatches.reduce(0) { $0 + $1.teamAScore + $1.teamBScore }

        var winsByPlayer: [UUID: Int] = [:]
        var gamesByPlayer: [UUID: Int] = [:]
        var partnerCounts: [UUID: Set<UUID>] = [:]
        var totalFairness: Int = 0

        for match in selectedMatches {
            let teamAWon = match.teamAScore > match.teamBScore
            let teamAIds = match.teamAPlayerIds.compactMap { $0.flatMap(UUID.init(uuidString:)) }
            let teamBIds = match.teamBPlayerIds.compactMap { $0.flatMap(UUID.init(uuidString:)) }

            let winners = teamAWon ? teamAIds : teamBIds
            for id in winners { winsByPlayer[id, default: 0] += 1 }
            for id in (teamAIds + teamBIds) { gamesByPlayer[id, default: 0] += 1 }

            // Partner rotations
            for id in teamAIds { teamAIds.forEach { if $0 != id { partnerCounts[id, default: []].insert($0) } } }
            for id in teamBIds { teamBIds.forEach { if $0 != id { partnerCounts[id, default: []].insert($0) } } }

            // Fairness calculation
            let aElo = teamAIds.reduce(0.0) { $0 + Double(playerBadgeStats[$1]?.currentElo ?? 1000) } / Double(max(1, teamAIds.count))
            let bElo = teamBIds.reduce(0.0) { $0 + Double(playerBadgeStats[$1]?.currentElo ?? 1000) } / Double(max(1, teamBIds.count))
            let prob = EloService.getWinProbability(rating: aElo, opponentRating: bElo)
            totalFairness += Int(round((1 - abs(0.5 - prob) * 2) * 100))
        }

        let avgFairness = totalFairness / max(1, totalMatches)

        let topWinners = winsByPlayer
            .sorted { $0.value > $1.value }
            .prefix(3)
            .map { "• \(playerName(for: $0.key)): \($0.value) vinster" }

        let marathon = gamesByPlayer.max { $0.value < $1.value }
        let mostRotations = partnerCounts.max { $0.value.count < $1.value.count }

        adminReportPreviewText = ([
            "🎾 MATCHKVÄLLS-RAPPORT",
            "Datum: \(dayKey)",
            "Antal matcher: \(totalMatches)",
            "Totalt antal game: \(totalSets)",
            "Snitt-rättvisa: \(avgFairness)%",
            "",
            "🏆 TOPP-VINSTER",
            topWinners.isEmpty ? "• Inga resultat ännu." : topWinners.joined(separator: "\n"),
            "",
            "✨ FUN FACTS",
            marathon.map { "🏃 Marathon-spelare: \(playerName(for: $0.key)) (\($0.value) matcher)" },
            mostRotations.map { "🔄 Flest lagkamrater: \(playerName(for: $0.key)) (\($0.value.count) st)" },
            "⚡ Jämna matcher: \(selectedMatches.filter { abs($0.teamAScore - $0.teamBScore) <= 2 }.count) st"
        ].compactMap { $0 }).joined(separator: "\n")

        adminReportStatusMessage = "Kvällsrapport genererad med fördjupad statistik."
    }

    // Note for non-coders:
    // This composes a share-friendly tournament summary similar to the web admin share output.
    // Enhanced with more granular standings and tournament metadata.
    func generateTournamentReport(for tournamentId: UUID) async {
        guard canUseAdmin else {
            adminReportStatusMessage = "Admin-behörighet krävs för att skapa rapporter."
            return
        }

        isAdminReportRunning = true
        defer { isAdminReportRunning = false }

        do {
            let standings = try await apiClient.fetchTournamentStandings(tournamentId: tournamentId)
            let rounds = try await apiClient.fetchTournamentRounds(tournamentId: tournamentId)

            guard let tournament = tournaments.first(where: { $0.id == tournamentId }) else {
                adminReportStatusMessage = "Turneringen hittades inte lokalt."
                return
            }

            let standingLines = standings.prefix(12).map { result in
                let name = playerName(for: result.profileId ?? UUID())
                let winnerIcon = result.rank == 1 ? "🏆 " : ""
                return "\(winnerIcon)#\(result.rank) \(name) • \(result.pointsFor) pts (W\(result.wins)-L\(result.losses))"
            }

            let scoredRounds = rounds.filter { $0.team1Score != nil }.count

            adminReportPreviewText = ([
                "🏆 TURNERINGS-RAPPORT",
                "Namn: \(tournament.name)",
                "Typ: \(tournament.tournamentType.uppercased())",
                "Status: \(tournament.status.capitalized)",
                "Spelade rundor: \(scoredRounds)/\(rounds.count)",
                "",
                "📊 SLUTSTÄLLNING",
                standingLines.isEmpty ? "Ingen ställning tillgänglig ännu." : standingLines.joined(separator: "\n"),
                "",
                "✨ SAMMANFATTNING",
                "Totalt antal deltagare: \(standings.count) st",
                "Mest poäng i en runda: \(rounds.compactMap { max($0.team1Score ?? 0, $0.team2Score ?? 0) }.max() ?? 0) pts"
            ]).joined(separator: "\n")
            adminReportStatusMessage = "Turneringsrapport genererad."
        } catch {
            adminReportStatusMessage = "Kunde inte generera rapport: \(error.localizedDescription)"
        }
    }

    func buildWeeklyEmailPreview(timeframe: AdminWeeklyTimeframe, week: Int?, year: Int?) async {
        guard canUseAdmin else {
            adminEmailStatusMessage = "Admin access is required to preview email actions."
            return
        }

        guard let accessToken = authService.currentAccessToken() else {
            adminEmailStatusMessage = "Missing session token. Please sign in again."
            return
        }

        isAdminEmailActionRunning = true
        defer { isAdminEmailActionRunning = false }

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

        let filtered = allMatches.filter { $0.playedAt >= startDate && $0.playedAt <= now }
        let uniquePlayers = Set(filtered.flatMap { $0.teamAPlayerIds + $0.teamBPlayerIds }.compactMap { $0 })

        do {
            let response = try await apiClient.invokeWeeklySummary(
                accessToken: accessToken,
                playerId: currentPlayer?.id,
                timeframe: timeframe.rawValue,
                week: week,
                year: year,
                previewOnly: true
            )

            adminEmailPreviewHTML = response.previewHtml
            adminEmailPreviewText = ([
                "Weekly Email Preview",
                "Timeframe: \(timeframe.title)",
                "Matches in window: \(filtered.count)",
                "Players included: \(uniquePlayers.count)",
                "",
                // Note for non-coders: this fallback text appears if the server cannot return full HTML.
                "Note for non-coders: this preview estimates who would appear in the weekly email before sending any test/broadcast action."
            ]).joined(separator: "\n")
            adminEmailStatusMessage = response.previewHtml == nil
                ? "Weekly preview generated (text fallback)."
                : "Weekly preview generated (full email render)."
        } catch {
            adminEmailPreviewHTML = nil
            adminEmailPreviewText = ([
                "Weekly Email Preview",
                "Timeframe: \(timeframe.title)",
                "Matches in window: \(filtered.count)",
                "Players included: \(uniquePlayers.count)",
                "",
                "Note for non-coders: the live HTML preview failed, so this plain-text summary is shown instead."
            ]).joined(separator: "\n")
            adminEmailStatusMessage = "Could not build weekly preview HTML: \(error.localizedDescription)"
        }
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

            if let accessToken = authService.currentAccessToken() {
                let previewResponse = try? await apiClient.invokeTournamentSummary(
                    accessToken: accessToken,
                    previewTournamentId: tournamentId,
                    previewOnly: true
                )
                adminEmailPreviewHTML = previewResponse?.previewHtml
            } else {
                adminEmailPreviewHTML = nil
            }

            adminEmailPreviewText = ([
                "Tournament Email Preview",
                "Tournament: \(tournament.name)",
                "Rounds with scores: \(rounds.filter { $0.team1Score != nil && $0.team2Score != nil }.count)",
                "Standings rows: \(standings.count)",
                "",
                "Note for non-coders: this preview checks that tournament data is present before you run a test send action."
            ]).joined(separator: "\n")
            // Note for non-coders: if HTML is available we show the exact email body; otherwise we keep the summary text.
            adminEmailStatusMessage = adminEmailPreviewHTML == nil
                ? "Tournament preview generated (text fallback)."
                : "Tournament preview generated (full email render)."
        } catch {
            adminEmailPreviewHTML = nil
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


    // Note for non-coders:
    // We convert technical transport errors into a shorter, friendlier message
    // so users know whether to retry immediately or check their internet.
    func mapNetworkError(_ error: Error) -> String {
        if let urlError = error as? URLError {
            switch urlError.code {
            case .notConnectedToInternet:
                return "No internet connection. Please reconnect and retry."
            case .timedOut:
                return "Server took too long to respond. Please retry."
            default:
                return "Network error (\(urlError.code.rawValue)). Please retry."
            }
        }
        return error.localizedDescription
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
            let allTournaments = try await tournamentDataLoader.fetchTournaments()
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
                async let roundsTask = tournamentDataLoader.fetchTournamentRounds(tournamentId: tournament.id)
                async let standingsTask = tournamentDataLoader.fetchTournamentStandings(tournamentId: tournament.id)
                async let participantsTask = tournamentDataLoader.fetchTournamentParticipants(tournamentId: tournament.id)
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

            tournamentHistoryResults = try await tournamentDataLoader.fetchCompletedTournamentResults()
            tournamentStatusMessage = nil
            tournamentActionErrorMessage = nil
            updateLiveActivity()
        } catch {
            // Note for non-coders:
            // If the network call fails, we keep any on-screen tournament data intact
            // and show a message so users know they can try a manual refresh.
            tournamentStatusMessage = "Could not load tournament data: \(mapNetworkError(error))"
        }
    }

    func selectTournament(id: UUID?) async {
        selectedTournamentId = id
        await loadTournamentData(silently: true)
    }

    func replaceTournamentParticipants(tournamentId: UUID, participantIds: [UUID]) async {
        guard canMutateTournament else {
            tournamentActionErrorMessage = "Sign in is required to edit tournaments."
            return
        }

        isTournamentActionRunning = true
        defer { isTournamentActionRunning = false }

        do {
            try await apiClient.replaceTournamentParticipants(tournamentId: tournamentId, participantIds: participantIds)
            tournamentStatusMessage = "Participants updated."
            await loadTournamentData(silently: true)
        } catch {
            tournamentActionErrorMessage = "Could not update participants: \(error.localizedDescription)"
        }
    }

    func createTournament(
        name: String,
        location: String?,
        scheduledAt: Date?,
        scoreTarget: Int?,
        tournamentType: String,
        participantIds: [UUID]
    ) async -> Bool {
        guard canMutateTournament else {
            tournamentActionErrorMessage = "Sign in is required to create tournaments."
            return false
        }

        guard let creatorId = currentPlayer?.id else {
            tournamentActionErrorMessage = "Could not find your signed-in profile. Please sign in again and retry."
            return false
        }

        let cleanName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        if cleanName.isEmpty {
            tournamentActionErrorMessage = "Tournament name is required."
            return false
        }

        if participantIds.count < 4 {
            tournamentActionErrorMessage = "Choose at least 4 participants before creating a tournament."
            return false
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
                    scoreTarget: scoreTarget,
                    // Note for non-coders:
                    // The database checks who created each tournament.
                    // We send your profile ID so iOS writes pass the same security rule as web.
                    createdBy: creatorId
                )
            )
            try await apiClient.replaceTournamentParticipants(tournamentId: created.id, participantIds: participantIds)
            selectedTournamentId = created.id
            tournamentStatusMessage = "Tournament created in draft mode with \(participantIds.count) participants."
            await loadTournamentData(silently: false)
            isTournamentActionRunning = false
            return true
        } catch {
            tournamentActionErrorMessage = "Could not create tournament: \(error.localizedDescription)"
        }

        isTournamentActionRunning = false
        return false
    }

    func startSelectedTournament() async {
        guard let tournament = activeTournament else {
            tournamentActionErrorMessage = "Choose a tournament first."
            return
        }

        if tournament.tournamentType == "americano" && tournamentRounds.isEmpty {
            let participantIds = tournamentParticipants.map(\.profileId)
            let generatedRounds = generateAmericanoRounds(tournamentId: tournament.id, participants: participantIds)

            if generatedRounds.isEmpty {
                tournamentActionErrorMessage = "Could not generate rounds. Add at least 4 participants first."
                return
            }

            do {
                try await apiClient.createTournamentRounds(generatedRounds.map { round in
                    TournamentRoundCreationRequest(
                        tournamentId: tournament.id,
                        roundNumber: round.roundNumber,
                        team1Ids: round.team1Ids,
                        team2Ids: round.team2Ids,
                        restingIds: round.restingIds,
                        mode: "americano"
                    )
                })
            } catch {
                tournamentActionErrorMessage = "Could not generate rounds: \(error.localizedDescription)"
                return
            }
        }

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

        let lines = tournamentStandings.prefix(5).map { standing in
            let winnerIcon = standing.rank == 1 ? "🏆 " : ""
            return "\(winnerIcon)#\(standing.rank) \(standing.playerName) • \(standing.pointsFor) pts"
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
            if let tournament = activeTournament {
                LiveMatchActivityService.shared.updateMatchActivity(
                    matchId: tournament.id.uuidString,
                    scoreA: team1Score,
                    scoreB: team2Score,
                    status: LiveMatchActivityService.shared.localizedStatus(for: tournament.status)
                )
            }
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
            let localizedCompletedStatus = LiveMatchActivityService.shared.localizedStatus(for: "completed")
            let finalScoreA = tournamentStandings.first?.pointsFor ?? 0
            let finalScoreB = tournamentStandings.dropFirst().first?.pointsFor ?? 0
            LiveMatchActivityService.shared.endMatchActivity(
                scoreA: finalScoreA,
                scoreB: finalScoreB,
                status: localizedCompletedStatus,
                matchId: tournament.id.uuidString
            )
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
            if status == "abandoned" || status == "cancelled" {
                let localizedStatus = LiveMatchActivityService.shared.localizedStatus(for: status)
                let scoreA = tournamentStandings.first?.pointsFor ?? 0
                let scoreB = tournamentStandings.dropFirst().first?.pointsFor ?? 0
                LiveMatchActivityService.shared.endMatchActivity(
                    scoreA: scoreA,
                    scoreB: scoreB,
                    status: localizedStatus,
                    matchId: selected.id.uuidString
                )
            } else {
                updateLiveActivity()
            }
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
    // This mirrors the findMatchHighlight logic in src/utils/highlights.ts.
    private func findMatchHighlight(matches: [Match], players: [Player], statsMap: [UUID: PlayerBadgeStats]) -> DashboardMatchHighlight? {
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

        // Use calculated ELO for highlights instead of database ELO
        let eloByPlayer = statsMap.mapValues { Double($0.currentElo) }
        var candidates: [Candidate] = []

        for match in latestMatches {
            // Get pre-match ELO by looking up the ELO before this match in history
            let getPreElo = { (idString: String?) -> Double in
                guard let idString = idString, let id = UUID(uuidString: idString) else { return 1000 }
                if let history = statsMap[id]?.eloHistory,
                   let matchEntry = history.first(where: { $0.matchId == match.id }) {
                    return Double(matchEntry.elo - matchEntry.delta)
                }
                return eloByPlayer[id] ?? 1000
            }

            let teamAEloValues = match.teamAPlayerIds.map(getPreElo)
            let teamBEloValues = match.teamBPlayerIds.map(getPreElo)
            let teamAElo = teamAEloValues.reduce(0, +) / Double(max(1, teamAEloValues.count))
            let teamBElo = teamBEloValues.reduce(0, +) / Double(max(1, teamBEloValues.count))
            let expectedAWin = EloService.getWinProbability(rating: teamAElo, opponentRating: teamBElo)
            let teamAWon = match.teamAScore > match.teamBScore
            let winnerExpected = teamAWon ? expectedAWin : (1 - expectedAWin)
            let margin = abs(match.teamAScore - match.teamBScore)
            let totalElo = teamAElo + teamBElo

            if winnerExpected < 0.35 {
                candidates.append(Candidate(
                    match: match,
                    reason: .upset,
                    score: (0.35 - winnerExpected) * 100 + 50,
                    title: "Kvällens Skräll",
                    description: "Underdog-seger! \(teamAWon ? "Lag 1" : "Lag 2") vann trots endast \(Int(round(winnerExpected * 100)))% vinstchans."
                ))
            }

            if margin <= 1 && match.scoreType == "sets" {
                candidates.append(Candidate(
                    match: match,
                    reason: .thriller,
                    score: 50 - abs(winnerExpected - 0.5) * 40,
                    title: "Kvällens Rysare",
                    description: "En extremt jämn match som avgjordes med minsta möjliga marginal (\(match.teamAScore)-\(match.teamBScore))."
                ))
            }

            if margin >= 3 && match.scoreType == "sets" {
                candidates.append(Candidate(
                    match: match,
                    reason: .crush,
                    score: Double(margin * 10),
                    title: "Kvällens Kross",
                    description: "Total dominans! En övertygande seger med \(match.teamAScore)-\(match.teamBScore)."
                ))
            }

            if totalElo > 2200 {
                candidates.append(Candidate(
                    match: match,
                    reason: .titans,
                    score: (totalElo - 2200) / 5,
                    title: "Giganternas Kamp",
                    description: "Kvällens tyngsta möte med en samlad ELO på \(Int(totalElo.rounded()))."
                ))
            }
        }

        guard !candidates.isEmpty else { return nil }

        let priority: [DashboardMatchHighlight.Reason: Int] = [.upset: 4, .thriller: 3, .titans: 2, .crush: 1]
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
        guard let latest = allMatches.first else { return [] }
        return allMatches.filter { Calendar.current.isDate($0.playedAt, inSameDayAs: latest.playedAt) }
    }

    private func mvp(for periodMatches: [Match], minimumGames: Int, deltaMap: [UUID: [UUID: Int]]) -> DashboardMVPResult? {
        guard !periodMatches.isEmpty else { return nil }

        struct MvpStat {
            var wins = 0
            var games = 0
            var periodEloGain = 0
        }

        var stats: [UUID: MvpStat] = [:]

        for match in periodMatches {
            let teamAWon = match.teamAScore > match.teamBScore
            let aIds = match.teamAPlayerIds.compactMap { $0.flatMap(UUID.init(uuidString:)) }
            let bIds = match.teamBPlayerIds.compactMap { $0.flatMap(UUID.init(uuidString:)) }

            for id in aIds {
                var s = stats[id, default: MvpStat()]
                s.games += 1
                s.periodEloGain += deltaMap[id]?[match.id] ?? 0
                if teamAWon { s.wins += 1 }
                stats[id] = s
            }
            for id in bIds {
                var s = stats[id, default: MvpStat()]
                s.games += 1
                s.periodEloGain += deltaMap[id]?[match.id] ?? 0
                if !teamAWon { s.wins += 1 }
                stats[id] = s
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

            let lhsElo = playerBadgeStats[lhs.player.id]?.currentElo ?? lhs.player.elo
            let rhsElo = playerBadgeStats[rhs.player.id]?.currentElo ?? rhs.player.elo
            if lhsElo != rhsElo { return lhsElo > rhsElo }

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

    private func generateAmericanoRounds(tournamentId: UUID, participants: [UUID]) -> [TournamentRoundCreationRequest] {
        let unique = Array(Set(participants)).sorted { $0.uuidString < $1.uuidString }
        guard unique.count >= 4 else { return [] }

        var rotation = unique
        if rotation.count % 2 != 0, let first = rotation.first {
            rotation.append(first)
        }

        let totalRounds = max(1, rotation.count - 1)
        var rounds: [TournamentRoundCreationRequest] = []

        for roundIndex in 0..<totalRounds {
            let half = rotation.count / 2
            let left = Array(rotation.prefix(half))
            let right = Array(rotation.suffix(half).reversed())
            let pairings = zip(left, right).map { ($0, $1) }
            guard pairings.count >= 2 else { continue }

            rounds.append(TournamentRoundCreationRequest(
                tournamentId: tournamentId,
                roundNumber: roundIndex + 1,
                team1Ids: [pairings[0].0, pairings[0].1],
                team2Ids: [pairings[1].0, pairings[1].1],
                restingIds: pairings.dropFirst(2).flatMap { [$0.0, $0.1] },
                mode: "americano"
            ))

            guard let fixed = rotation.first else { continue }
            let moving = Array(rotation.dropFirst())
            guard let last = moving.last else { continue }
            rotation = [fixed, last] + moving.dropLast()
        }

        return rounds
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
    func generateRotation(poolIds: [UUID]) {
        let eloMap = playerBadgeStats.reduce(into: [UUID: Int]()) { $0[$1.key] = $1.value.currentElo }
        self.currentRotation = RotationService.buildRotationSchedule(pool: poolIds, eloMap: eloMap)
    }

    func generateBalancedMatch(poolIds: [UUID]) {
        guard poolIds.count == 4 else { return }
        let eloMap = playerBadgeStats.reduce(into: [UUID: Int]()) { $0[$1.key] = $1.value.currentElo }

        let p1 = poolIds[0]
        let p2 = poolIds[1]
        let p3 = poolIds[2]
        let p4 = poolIds[3]

        let options: [(teamA: [UUID], teamB: [UUID])] = [
            ([p1, p2], [p3, p4]),
            ([p1, p3], [p2, p4]),
            ([p1, p4], [p2, p3])
        ]

        let scored = options.map { option in
            let teamAElo = RotationService.getTeamAverageElo(team: option.teamA, eloMap: eloMap)
            let teamBElo = RotationService.getTeamAverageElo(team: option.teamB, eloMap: eloMap)
            let winProb = EloService.getWinProbability(rating: teamAElo, opponentRating: teamBElo)
            let fairness = RotationService.getFairnessScore(winProbability: winProb)
            return (option: option, fairness: fairness, winProb: winProb)
        }.sorted { $0.fairness > $1.fairness }

        if let best = scored.first {
            let round = RotationRound(
                roundNumber: 1,
                teamA: best.option.teamA,
                teamB: best.option.teamB,
                rest: [],
                fairness: best.fairness,
                winProbability: best.winProb
            )
            self.currentRotation = RotationSchedule(rounds: [round], averageFairness: best.fairness, targetGames: 1.0)
        }
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

        for match in allMatches {
            let teamA = match.teamAPlayerIds.compactMap { $0.flatMap { UUID(uuidString: $0) } }
            let teamB = match.teamBPlayerIds.compactMap { $0.flatMap { UUID(uuidString: $0) } }

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
            guard ids.isEmpty == false else { return 1000 }
            let total = ids.reduce(0.0) { partial, id in
                partial + Double(playerBadgeStats[id]?.currentElo ?? 1000)
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
                let winProbability = EloService.getWinProbability(rating: averageElo(teamA), opponentRating: averageElo(teamB))
                let fairness = max(0, min(100, Int(round((1 - abs(0.5 - winProbability) * 2) * 100))))
                let opponentPenalty = Double(opponentCounts[pairKey(teamA[0], teamB[0]), default: 0])
                let gamePenalty = Double(gamesByPlayer[teamA[0], default: 0] + gamesByPlayer[teamB[0], default: 0])
                let underplayedBonus = (gameTarget - gamePenalty) * 0.5
                let score = Double(fairness) * 2 - opponentPenalty * 6 - gamePenalty * 4 + underplayedBonus

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
                    let winProbability = EloService.getWinProbability(rating: averageElo(teamA), opponentRating: averageElo(teamB))
                    let fairness = max(0, min(100, Int(round((1 - abs(0.5 - winProbability) * 2) * 100))))

                    let teammatePenalty = Double(teammateCounts[pairKey(teamA[0], teamA[1]), default: 0] + teammateCounts[pairKey(teamB[0], teamB[1]), default: 0])
                    let opponentPenalty = Double(teamA.reduce(into: 0) { partial, aId in
                        partial += teamB.reduce(0) { $0 + opponentCounts[pairKey(aId, $1), default: 0] }
                    })
                    let gamePenalty = Double((teamA + teamB).reduce(0) { $0 + gamesByPlayer[$1, default: 0] })
                    let underplayedBonus = (gameTarget * 2 - gamePenalty) * 0.5
                    let score = Double(fairness) * 2 - teammatePenalty * 15 - opponentPenalty * 6 - gamePenalty * 4 + underplayedBonus

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
        let dayMatches = allMatches.filter { Self.dayKey(for: $0.playedAt) == dateKey }

        var winsByPlayer: [UUID: Int] = [:]
        for dayMatch in dayMatches {
            let winnersString = dayMatch.teamAScore > dayMatch.teamBScore ? dayMatch.teamAPlayerIds : dayMatch.teamBPlayerIds
            let winners = winnersString.compactMap { $0.flatMap { UUID(uuidString: $0) } }
            for id in winners {
                winsByPlayer[id, default: 0] += 1
            }
        }

        let leaders = winsByPlayer
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

        let eveningSummary = ([
            "Kväll \(dateKey): \(dayMatches.count) matcher, totalt \(totalPoints) registrerade game.",
            "Jämna matcher (skillnad ≤ 2): \(closeGameCount)",
            "Topplista:",
            leaders.isEmpty ? "• Ingen topplista ännu." : leaders.joined(separator: "\n"),
        ]).joined(separator: "\n")

        let recapSlots: (_ ids: [String?], _ names: [String]) -> [(index: Int, id: String?)] = { ids, names in
            let slotCount = max(ids.count, names.count)
            return (0..<slotCount).compactMap { index in
                let idValue = ids.indices.contains(index) ? ids[index] : nil
                let fallback = names.indices.contains(index) ? names[index].trimmingCharacters(in: .whitespacesAndNewlines) : ""
                // Note for non-coders:
                // "Spelare" is just a generic placeholder label, so we hide that.
                // "Gästspelare" is a *real* selected participant and should be visible in recaps.
                let isPlaceholder = fallback.isEmpty || fallback == "Spelare"
                guard idValue != nil || !isPlaceholder else { return nil }
                return (index, idValue)
            }
        }

        let teamAPlayers = recapSlots(match.teamAPlayerIds, match.teamANames).map { slot in
            let index = slot.index
            let idString = slot.id
            let name = resolvePlayerName(playerId: idString, fallbackLabel: match.teamANames.indices.contains(index) ? match.teamANames[index] : "Spelare")
            let uuid = idString.flatMap { UUID(uuidString: $0) }
            let stats = uuid.flatMap { playerBadgeStats[$0] }
            let history = uuid.flatMap { pid in stats?.eloHistory.first(where: { $0.matchId == match.id }) }
            let snapshot = uuid.flatMap { matchEloSnapshot(for: $0, in: match) }
            let delta = history?.delta ?? snapshot?.delta ?? 0
            let elo = history?.elo ?? snapshot?.after ?? (uuid.flatMap { pid in playerBadgeStats[pid]?.currentElo } ?? 1000)
            let player = players.first(where: { $0.id == uuid })
            return MatchRecapPlayer(id: uuid, name: name, elo: elo, delta: delta, avatarURL: player?.avatarURL)
        }

        let teamBPlayers = recapSlots(match.teamBPlayerIds, match.teamBNames).map { slot in
            let index = slot.index
            let idString = slot.id
            let name = resolvePlayerName(playerId: idString, fallbackLabel: match.teamBNames.indices.contains(index) ? match.teamBNames[index] : "Spelare")
            let uuid = idString.flatMap { UUID(uuidString: $0) }
            let stats = uuid.flatMap { playerBadgeStats[$0] }
            let history = uuid.flatMap { pid in stats?.eloHistory.first(where: { $0.matchId == match.id }) }
            let snapshot = uuid.flatMap { matchEloSnapshot(for: $0, in: match) }
            let delta = history?.delta ?? snapshot?.delta ?? 0
            let elo = history?.elo ?? snapshot?.after ?? (uuid.flatMap { pid in playerBadgeStats[pid]?.currentElo } ?? 1000)
            let player = players.first(where: { $0.id == uuid })
            return MatchRecapPlayer(id: uuid, name: name, elo: elo, delta: delta, avatarURL: player?.avatarURL)
        }

        let teamAAvg = teamAPlayers.isEmpty ? 1000 : teamAPlayers.reduce(0) { $0 + $1.elo } / teamAPlayers.count
        let teamBAvg = teamBPlayers.isEmpty ? 1000 : teamBPlayers.reduce(0) { $0 + $1.elo } / teamBPlayers.count

        let winProb = EloService.getWinProbability(rating: Double(teamAAvg), opponentRating: Double(teamBAvg))
        let fairness = Int(round((1 - abs(0.5 - winProb) * 2) * 100))

        return SingleGameRecap(
            playedAt: match.playedAt,
            teamAScore: match.teamAScore,
            teamBScore: match.teamBScore,
            teamA: MatchRecapTeam(players: teamAPlayers, averageElo: teamAAvg),
            teamB: MatchRecapTeam(players: teamBPlayers, averageElo: teamBAvg),
            fairness: fairness,
            winProbability: winProb,
            eveningSummary: eveningSummary
        )
    }

    func recalculateDerivedStats() {
        self.playerBadgeStats = BadgeService.buildAllPlayersBadgeStats(
            matches: allMatches,
            players: players,
            tournamentResults: tournamentHistoryResults
        )

        // ⚡ Optimization: Pre-index ELO deltas for O(1) lookup during stats aggregation
        var deltaMap: [UUID: [UUID: Int]] = [:]
        for (pid, stats) in playerBadgeStats {
            deltaMap[pid] = stats.eloHistory.reduce(into: [UUID: Int]()) { $0[$1.matchId] = $1.delta }
        }

        // Pre-calculate merit holders once for use in all players' badge displays
        let meritHolders = BadgeService.buildUniqueMeritHolders(allPlayerStats: playerBadgeStats)

        // Memoize leaderboard, H2H, MVP and Highlights to prevent redundant $O(N)$ work on every view refresh
        self.leaderboardPlayers = buildLeaderboardPlayers()
        self.headToHeadSummary = buildHeadToHeadSummary()
        self.latestHighlightMatch = findMatchHighlight(matches: allMatches, players: players, statsMap: playerBadgeStats)

        let sameEveningMatches = matchesForSameEvening
        self.currentMVP = mvp(for: sameEveningMatches, minimumGames: 3, deltaMap: deltaMap)

        let cutoff30 = Calendar.current.date(byAdding: .day, value: -30, to: Date()) ?? .distantPast
        let periodMatches = allMatches.filter { $0.playedAt >= cutoff30 }
        self.periodMVP = mvp(for: periodMatches, minimumGames: 6, deltaMap: deltaMap)

        if let currentId = currentPlayer?.id {
            self.currentPlayerBadges = BadgeService.buildPlayerBadges(
                playerId: currentId,
                allPlayerStats: playerBadgeStats,
                uniqueMeritHolders: meritHolders
            )

            let mvpStats = calculateAllMvpStats(deltaMap: deltaMap)

            let (against, together) = calculateRivalryStats(for: currentId, mvpStats: mvpStats, deltaMap: deltaMap)
            self.currentRivalryAgainstStats = against
            self.currentRivalryTogetherStats = together

            let heatmapTargetId = teammateFilterPlayerId ?? currentId
            self.heatmapCombos = calculateHeatmapStats(playerId: heatmapTargetId)

            calculateBestPartnerAndRival(playerId: currentId)

            if let stats = playerBadgeStats[currentId] {
                self.americanoWins = stats.americanoWins
                self.mexicanoWins = stats.mexicanoWins
                self.currentMonthlyMvpDays = mvpStats.monthlyMvpDays[currentId] ?? 0
                self.currentEveningMvps = mvpStats.eveningMvpCounts[currentId] ?? 0
            }
        }
    }

    private func calculateAllMvpStats(deltaMap: [UUID: [UUID: Int]]) -> (monthlyMvpDays: [UUID: Int], eveningMvpCounts: [UUID: Int]) {
        var monthlyMvpDays: [UUID: Int] = [:]
        var eveningMvpCounts: [UUID: Int] = [:]

        // Optimization: Linear check for sort order (ASC or DESC) to avoid O(N log N)
        var isSortedAsc = true
        var isSortedDesc = true
        if allMatches.count > 1 {
            for i in 0..<allMatches.count - 1 {
                if allMatches[i].playedAt > allMatches[i+1].playedAt { isSortedAsc = false }
                if allMatches[i].playedAt < allMatches[i+1].playedAt { isSortedDesc = false }
                if !isSortedAsc && !isSortedDesc { break }
            }
        }
        // Fix: Use Array() wrapper for reversed() to avoid type mismatch
        let sortedMatches = isSortedAsc ? allMatches : (isSortedDesc ? Array(allMatches.reversed()) : allMatches.sorted { $0.playedAt < $1.playedAt })

        guard !sortedMatches.isEmpty else { return ([:], [:]) }

        // Evening MVPs
        let groupedByDay = Dictionary(grouping: sortedMatches) { match in
            Calendar.current.startOfDay(for: match.playedAt)
        }

        for (_, dayMatches) in groupedByDay {
            if let winner = mvp(for: dayMatches, minimumGames: 3, deltaMap: deltaMap) {
                eveningMvpCounts[winner.player.id, default: 0] += 1
            }
        }

        // Monthly MVP Days (rolling 30-day window)
        // Optimization: rolling window similar to PWA
        struct RollingStat {
            var wins = 0
            var games = 0
            var eloGain = 0
        }

        var rollingStats: [UUID: RollingStat] = [:]
        for player in players { rollingStats[player.id] = RollingStat() }
        var activeInWindow: Set<UUID> = []

        var uuidCache: [String: UUID?] = [:]
        func parseUUID(_ s: String?) -> UUID? {
            guard let s = s, !s.isEmpty else { return nil }
            if let cached = uuidCache[s] { return cached }
            let u = UUID(uuidString: s)
            uuidCache[s] = u
            return u
        }

        var windowStartIdx = 0
        var windowEndIdx = 0

        let firstDate = Calendar.current.startOfDay(for: sortedMatches[0].playedAt)
        let lastDate = Calendar.current.startOfDay(for: Date())

        var currentDate = firstDate
        while currentDate <= lastDate {
            let dayEnd = Calendar.current.date(byAdding: .day, value: 1, to: currentDate)!.addingTimeInterval(-0.001)
            let cutoff = dayEnd.addingTimeInterval(-30 * 24 * 60 * 60)

            // Add matches entering window
            while windowEndIdx < sortedMatches.count && sortedMatches[windowEndIdx].playedAt <= dayEnd {
                let m = sortedMatches[windowEndIdx]
                let teamAWon = m.teamAScore > m.teamBScore

                for id in m.teamAPlayerIds.compactMap({ parseUUID($0) }) {
                    let delta = deltaMap[id]?[m.id] ?? 0
                    rollingStats[id]?.games += 1
                    rollingStats[id]?.eloGain += delta
                    if teamAWon { rollingStats[id]?.wins += 1 }
                    activeInWindow.insert(id)
                }
                for id in m.teamBPlayerIds.compactMap({ parseUUID($0) }) {
                    let delta = deltaMap[id]?[m.id] ?? 0
                    rollingStats[id]?.games += 1
                    rollingStats[id]?.eloGain += delta
                    if !teamAWon { rollingStats[id]?.wins += 1 }
                    activeInWindow.insert(id)
                }
                windowEndIdx += 1
            }

            // Remove matches leaving window
            while windowStartIdx < windowEndIdx && sortedMatches[windowStartIdx].playedAt <= cutoff {
                let m = sortedMatches[windowStartIdx]
                let teamAWon = m.teamAScore > m.teamBScore

                for id in m.teamAPlayerIds.compactMap({ parseUUID($0) }) {
                    let delta = deltaMap[id]?[m.id] ?? 0
                    rollingStats[id]?.games -= 1
                    rollingStats[id]?.eloGain -= delta
                    if teamAWon { rollingStats[id]?.wins -= 1 }
                    if rollingStats[id]?.games == 0 { activeInWindow.remove(id) }
                }
                for id in m.teamBPlayerIds.compactMap({ parseUUID($0) }) {
                    let delta = deltaMap[id]?[m.id] ?? 0
                    rollingStats[id]?.games -= 1
                    rollingStats[id]?.eloGain -= delta
                    if !teamAWon { rollingStats[id]?.wins -= 1 }
                    if rollingStats[id]?.games == 0 { activeInWindow.remove(id) }
                }
                windowStartIdx += 1
            }

            // Find winner for this day
            var bestScore = -Double.greatestFiniteMagnitude
            var winnerId: UUID?

            // Optimization: Only check players who have played in the current 30-day window
            for pid in activeInWindow {
                let s = rollingStats[pid]!
                guard s.games >= 6 else { continue }
                let winRate = Double(s.wins) / Double(s.games)
                let score = Double(s.eloGain) + (winRate * 15) + (Double(s.games) * 0.5)

                if score > bestScore {
                    bestScore = score
                    winnerId = pid
                } else if abs(score - bestScore) < 0.001 {
                    // Tie-breaker: current ELO
                    if (playerBadgeStats[pid]?.currentElo ?? 0) > (playerBadgeStats[winnerId ?? pid]?.currentElo ?? 0) {
                        winnerId = pid
                    }
                }
            }

            if let wid = winnerId {
                monthlyMvpDays[wid, default: 0] += 1
            }

            currentDate = Calendar.current.date(byAdding: .day, value: 1, to: currentDate)!
        }

        return (monthlyMvpDays, eveningMvpCounts)
    }

    private func calculateBestPartnerAndRival(playerId: UUID) {
        let cutoff = Date().addingTimeInterval(-30 * 24 * 60 * 60)
        let recentMatches = allMatches.filter { $0.playedAt >= cutoff }

        var partnerStats: [UUID: (games: Int, wins: Int)] = [:]
        var rivalStats: [UUID: (games: Int, losses: Int)] = [:]

        let pIdString = playerId.uuidString.lowercased()
        for m in recentMatches {
            let teamA = m.teamAPlayerIds.compactMap { $0?.lowercased() }
            let teamB = m.teamBPlayerIds.compactMap { $0?.lowercased() }
            let iAmTeamA = teamA.contains(pIdString)
            let iAmTeamB = teamB.contains(pIdString)
            guard iAmTeamA || iAmTeamB else { continue }

            let myTeam = (iAmTeamA ? teamA : teamB).compactMap { UUID(uuidString: $0) }
            let oppTeam = (iAmTeamA ? teamB : teamA).compactMap { UUID(uuidString: $0) }
            let won = iAmTeamA ? m.teamAScore > m.teamBScore : m.teamBScore > m.teamAScore

            for pId in myTeam where pId != playerId {
                var s = partnerStats[pId, default: (0, 0)]
                s.games += 1
                if won { s.wins += 1 }
                partnerStats[pId] = s
            }

            for oId in oppTeam {
                var s = rivalStats[oId, default: (0, 0)]
                s.games += 1
                if !won { s.losses += 1 }
                rivalStats[oId] = s
            }
        }

        let bestP = partnerStats.max { a, b in
            let rateA = Double(a.value.wins) / Double(a.value.games)
            let rateB = Double(b.value.wins) / Double(b.value.games)
            if abs(rateA - rateB) > 0.001 { return rateA < rateB }
            return a.value.games < b.value.games
        }

        if let bp = bestP, let player = players.first(where: { $0.id == bp.key }) {
            self.bestPartner = PartnerSynergy(id: bp.key, name: player.profileName, games: bp.value.games, wins: bp.value.wins)
        } else {
            self.bestPartner = nil
        }

        let toughestR = rivalStats.max { a, b in
            let rateA = Double(a.value.losses) / Double(a.value.games)
            let rateB = Double(b.value.losses) / Double(b.value.games)
            if abs(rateA - rateB) > 0.001 { return rateA < rateB }
            return a.value.games < b.value.games
        }

        if let tr = toughestR, let player = players.first(where: { $0.id == tr.key }) {
            self.toughestOpponent = ToughestOpponent(id: tr.key, name: player.profileName, games: tr.value.games, losses: tr.value.losses)
        } else {
            self.toughestOpponent = nil
        }
    }

    private func calculateRivalryStats(for playerId: UUID, mvpStats: (monthlyMvpDays: [UUID: Int], eveningMvpCounts: [UUID: Int]), deltaMap: [UUID: [UUID: Int]]) -> (against: [RivalrySummary], together: [RivalrySummary]) {
        struct Accumulator {
            var wins = 0
            var losses = 0
            var totalSetsFor = 0
            var totalSetsAgainst = 0
            var serveFirstWins = 0
            var serveFirstLosses = 0
            var serveSecondWins = 0
            var serveSecondLosses = 0
            var eloExchange = 0
            var lastMatch: Match?
            var results: [String] = []
        }

        var againstMap: [UUID: Accumulator] = [:]
        var togetherMap: [UUID: Accumulator] = [:]

        // Optimization: Linear check for sort order (DESC or ASC) to avoid O(N log N)
        var isSortedAsc = true
        var isSortedDesc = true
        if allMatches.count > 1 {
            for i in 0..<allMatches.count - 1 {
                if allMatches[i].playedAt > allMatches[i+1].playedAt { isSortedAsc = false }
                if allMatches[i].playedAt < allMatches[i+1].playedAt { isSortedDesc = false }
                if !isSortedAsc && !isSortedDesc { break }
            }
        }
        // Fix: Use Array() wrapper for reversed() to avoid type mismatch
        let sorted = isSortedDesc ? allMatches : (isSortedAsc ? Array(allMatches.reversed()) : allMatches.sorted { $0.playedAt > $1.playedAt })

        let pIdString = playerId.uuidString.lowercased()
        var uuidCache: [String: UUID?] = [:]
        func parseUUID(_ s: String?) -> UUID? {
            guard let s = s, !s.isEmpty else { return nil }
            // Fix: Cache nil results too (e.g. for "guest")
            if let cached = uuidCache[s] { return cached }
            let u = UUID(uuidString: s)
            uuidCache[s] = u
            return u
        }

        for match in sorted {
            let teamA = match.teamAPlayerIds.compactMap { $0?.lowercased() }
            let teamB = match.teamBPlayerIds.compactMap { $0?.lowercased() }
            let iAmTeamA = teamA.contains(pIdString)
            let iAmTeamB = teamB.contains(pIdString)
            guard iAmTeamA || iAmTeamB else { continue }

            let myTeam = (iAmTeamA ? match.teamAPlayerIds : match.teamBPlayerIds).compactMap { parseUUID($0) }
            let oppTeam = (iAmTeamA ? match.teamBPlayerIds : match.teamAPlayerIds).compactMap { parseUUID($0) }
            let mySets = iAmTeamA ? match.teamAScore : match.teamBScore
            let oppSets = iAmTeamA ? match.teamBScore : match.teamAScore
            let playerWon = mySets > oppSets

            // Note for non-coders:
            // In this app's match flow, Team A is the side that starts serving.
            // That means "served first" maps to "the player was in Team A".
            let playerServedFirst = iAmTeamA

            let delta = deltaMap[playerId]?[match.id] ?? 0

            func update(_ map: inout [UUID: Accumulator], targetId: UUID) {
                var acc = map[targetId, default: Accumulator()]
                if acc.lastMatch == nil { acc.lastMatch = match }
                if playerWon {
                    acc.wins += 1
                } else {
                    acc.losses += 1
                }

                var setsFor = mySets
                var setsAgainst = oppSets

                if match.scoreType == "points" {
                    if setsFor > setsAgainst {
                        setsFor = 1
                        setsAgainst = 0
                    } else if setsAgainst > setsFor {
                        setsFor = 0
                        setsAgainst = 1
                    } else {
                        setsFor = 0
                        setsAgainst = 0
                    }
                }

                acc.totalSetsFor += setsFor
                acc.totalSetsAgainst += setsAgainst

                if playerServedFirst {
                    if playerWon { acc.serveFirstWins += 1 } else { acc.serveFirstLosses += 1 }
                } else {
                    if playerWon { acc.serveSecondWins += 1 } else { acc.serveSecondLosses += 1 }
                }
                acc.eloExchange += delta
                if acc.results.count < 5 {
                    acc.results.append(playerWon ? "V" : "F")
                }
                map[targetId] = acc
            }

            for id in oppTeam { update(&againstMap, targetId: id) }
            for id in myTeam where id != playerId { update(&togetherMap, targetId: id) }
        }

        func finalize(_ map: [UUID: Accumulator]) -> [RivalrySummary] {
            map.compactMap { oppId, acc in
                guard let lastMatch = acc.lastMatch,
                      let opponent = players.first(where: { $0.id == oppId }) else { return nil }

                let teamA = lastMatch.teamAPlayerIds.compactMap { $0.flatMap(UUID.init(uuidString:)) }
                let iAmTeamA = teamA.contains(playerId)
                let didWinLast = iAmTeamA ? lastMatch.teamAScore > lastMatch.teamBScore : lastMatch.teamBScore > lastMatch.teamAScore

                let playerElo = playerBadgeStats[playerId]?.currentElo ?? 1000
                let opponentElo = playerBadgeStats[oppId]?.currentElo ?? opponent.elo
                let winProb = EloService.getWinProbability(rating: Double(playerElo), opponentRating: Double(opponentElo))

                let highestElo = playerBadgeStats[oppId]?.eloHistory.map { $0.elo }.max() ?? opponent.elo

                // Common tournaments
                let myTournamentIds = Set(tournamentHistoryResults.filter { $0.profileId == playerId }.map { $0.tournamentId })
                let oppTournamentResults = tournamentHistoryResults.filter { $0.profileId == oppId && myTournamentIds.contains($0.tournamentId) }
                let commonTournaments = oppTournamentResults.count
                let playerTournamentWins = tournamentHistoryResults.filter { $0.profileId == playerId && $0.rank == 1 }.map { $0.tournamentId }
                let commonTournamentWins = oppTournamentResults.filter { playerTournamentWins.contains($0.tournamentId) }.count

                return RivalrySummary(
                    id: oppId,
                    opponentName: opponent.profileName,
                    opponentAvatarURL: opponent.avatarURL,
                    matchesPlayed: acc.wins + acc.losses,
                    wins: acc.wins,
                    losses: acc.losses,
                    lastMatchResult: didWinLast ? "V" : "F",
                    lastMatchDate: lastMatch.playedAt,
                    eloDelta: acc.eloExchange,
                    totalSetsFor: acc.totalSetsFor,
                    totalSetsAgainst: acc.totalSetsAgainst,
                    serveFirstWins: acc.serveFirstWins,
                    serveFirstLosses: acc.serveFirstLosses,
                    serveSecondWins: acc.serveSecondWins,
                    serveSecondLosses: acc.serveSecondLosses,
                    winProbability: winProb,
                    recentResults: acc.results,
                    highestElo: highestElo,
                    monthlyMvpDays: mvpStats.monthlyMvpDays[oppId] ?? 0,
                    eveningMvps: mvpStats.eveningMvpCounts[oppId] ?? 0,
                    commonTournamentWins: commonTournamentWins,
                    commonTournaments: commonTournaments
                )
            }.sorted { $0.matchesPlayed > $1.matchesPlayed }
        }

        return (finalize(againstMap), finalize(togetherMap))
    }

    private func calculateHeatmapStats(playerId: UUID) -> [HeatmapCombo] {
        struct ComboAcc {
            var games = 0
            var wins = 0
            var serveFirstGames = 0
            var serveFirstWins = 0
            var serveSecondGames = 0
            var serveSecondWins = 0
            var results: [String] = []
            var players: [String] = []
            var playerIds: [UUID] = []
        }

        var comboMap: [String: ComboAcc] = [:]
        let playerNames = players.reduce(into: [UUID: String]()) { $0[$1.id] = $1.profileName }
        let playerElos = playerBadgeStats.mapValues { $0.currentElo }

        let pIdString = playerId.uuidString.lowercased()
        var uuidCache: [String: UUID?] = [:]
        func parseUUID(_ s: String?) -> UUID? {
            guard let s = s, !s.isEmpty else { return nil }
            // Fix: Cache nil results too (e.g. for "guest")
            if let cached = uuidCache[s] { return cached }
            let u = UUID(uuidString: s)
            uuidCache[s] = u
            return u
        }

        for match in allMatches {
            // ⚡ Optimization: check string presence before compactMap/lowercased
            let isTeamA = match.teamAPlayerIds.contains { $0?.lowercased() == pIdString }
            let isTeamB = !isTeamA && match.teamBPlayerIds.contains { $0?.lowercased() == pIdString }
            guard isTeamA || isTeamB else { continue }

            let myTeam = (isTeamA ? match.teamAPlayerIds : match.teamBPlayerIds).compactMap { parseUUID($0) }
            let playerWon = isTeamA ? match.teamAScore > match.teamBScore : match.teamBScore > match.teamAScore
            let playerServedFirst = isTeamA

            // ⚡ Optimization: Fast manual sort for 1-2 players to avoid O(N log N)
            let key: String
            let sortedIds: [UUID]
            if myTeam.count == 2 {
                if myTeam[0].uuidString < myTeam[1].uuidString {
                    sortedIds = [myTeam[0], myTeam[1]]
                    key = "\(myTeam[0].uuidString)+\(myTeam[1].uuidString)"
                } else {
                    sortedIds = [myTeam[1], myTeam[0]]
                    key = "\(myTeam[1].uuidString)+\(myTeam[0].uuidString)"
                }
            } else if myTeam.count == 1 {
                sortedIds = [myTeam[0]]
                key = myTeam[0].uuidString
            } else {
                sortedIds = myTeam.sorted { $0.uuidString < $1.uuidString }
                key = sortedIds.map { $0.uuidString }.joined(separator: "+")
            }

            var acc = comboMap[key, default: ComboAcc()]
            acc.games += 1
            if playerWon { acc.wins += 1 }
            if playerServedFirst {
                acc.serveFirstGames += 1
                if playerWon { acc.serveFirstWins += 1 }
            } else {
                acc.serveSecondGames += 1
                if playerWon { acc.serveSecondWins += 1 }
            }
            if acc.results.count < 5 {
                acc.results.append(playerWon ? "V" : "F")
            }
            acc.players = sortedIds.map { playerNames[$0] ?? "Okänd" }
            acc.playerIds = sortedIds
            comboMap[key] = acc
        }

        return comboMap.map { key, acc in
            let winPct = acc.games > 0 ? Int(round(Double(acc.wins) / Double(acc.games) * 100)) : 0
            let sfWinPct = acc.serveFirstGames > 0 ? Int(round(Double(acc.serveFirstWins) / Double(acc.serveFirstGames) * 100)) : nil
            let ssWinPct = acc.serveSecondGames > 0 ? Int(round(Double(acc.serveSecondWins) / Double(acc.serveSecondGames) * 100)) : nil
            let avgElo = acc.playerIds.isEmpty ? 1000 : acc.playerIds.reduce(0) { $0 + (playerElos[$1] ?? 1000) } / acc.playerIds.count

            return HeatmapCombo(
                id: key,
                players: acc.players,
                games: acc.games,
                wins: acc.wins,
                winPct: winPct,
                serveFirstWinPct: sfWinPct,
                serveSecondWinPct: ssWinPct,
                recentResults: acc.results,
                avgElo: avgElo
            )
        }.sorted { $0.games > $1.games }
    }

    func renamePlayer(profileId: UUID, newName: String) async {
        guard canUseAdmin else {
            adminBanner = AdminActionBanner(message: "Admin-behörighet krävs för att byta namn.", style: .failure)
            return
        }

        let badgeId = players.first(where: { $0.id == profileId })?.featuredBadgeId
        let trimmed = ProfileNameService.stripBadgeLabelFromName(newName, badgeId: badgeId)
        guard trimmed.count >= 2 else {
            adminBanner = AdminActionBanner(message: "Namnet måste vara minst 2 tecken (meriter rensas automatiskt).", style: .failure)
            return
        }

        isAdminActionRunning = true
        defer { isAdminActionRunning = false }

        do {
            try await apiClient.updateOwnProfile(profileId: profileId, fullName: trimmed, profileName: trimmed)
            adminBanner = AdminActionBanner(message: "Spelaren har bytt namn till \(trimmed).", style: .success)
            await bootstrap()
            await refreshAdminProfiles(silently: true)
        } catch {
            adminBanner = AdminActionBanner(message: "Kunde inte byta namn: \(error.localizedDescription)", style: .failure)
        }
    }

    func submitSingleGame(
        teamAPlayerIds: [String?],
        teamBPlayerIds: [String?],
        teamAScore: Int,
        teamBScore: Int,
        scoreType: String = "sets",
        scoreTarget: Int? = nil,
        sourceTournamentId: UUID? = nil,
        sourceTournamentType: String = "standalone",
        teamAServesFirst: Bool = true,
        playedAt: Date = .now
    ) async -> SingleGameRecap? {
        guard canCreateMatches else {
            statusMessage = "Du måste vara inloggad för att spara matcher."
            return nil
        }

        guard let creatorId = currentPlayer?.id else {
            statusMessage = "Kunde inte hitta din profil. Logga in igen och försök på nytt."
            return nil
        }

        let normalizeSlot: (String?) -> String? = { rawId in
            guard let rawId else { return nil }
            // Note for non-coders:
            // The database expects real UUIDs in the *_ids columns.
            // Guest slots use text labels in the UI, so we store those as nil IDs.
            if rawId == "guest" || rawId.hasPrefix("name:") { return nil }
            return rawId
        }

        let rawAIds = Array(teamAPlayerIds.prefix(2))
            + Array(repeating: nil, count: max(0, 2 - teamAPlayerIds.count))
        let rawBIds = Array(teamBPlayerIds.prefix(2))
            + Array(repeating: nil, count: max(0, 2 - teamBPlayerIds.count))

        let normalizedAIds = rawAIds.map(normalizeSlot)
        let normalizedBIds = rawBIds.map(normalizeSlot)
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
        // iOS sends IDs and names separately. For guests, IDs must be nil in the database,
        // but the name slot still has to say "Gästspelare" so history/recap shows the correct person.
        // This now matches the PWA behavior exactly.
        let resolveSubmittedName: (String?) -> String = { rawId in
            guard let rawId, !rawId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return "" }
            if rawId == "guest" { return "Gästspelare" }
            if rawId.hasPrefix("name:") {
                let customName = String(rawId.dropFirst(5)).trimmingCharacters(in: .whitespacesAndNewlines)
                return customName.isEmpty ? "Gästspelare" : customName
            }
            // Note for non-coders:
            // Swift requires `self.` inside this closure so it's crystal clear we are reading
            // the player name from this AppViewModel instance.
            return self.resolvePlayerName(playerId: rawId)
        }

        let teamANames = rawAIds.map(resolveSubmittedName)
        let teamBNames = rawBIds.map(resolveSubmittedName)

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
                playedAt: playedAt,
                // Note for non-coders:
                // The backend only allows inserts when "created_by" matches the logged-in user.
                // Sending this value avoids iOS-only 403 failures when saving matches.
                createdBy: creatorId,
                matchMode: isOneVsOne ? .oneVsOne : .twoVsTwo
            )

            try await apiClient.submitMatch(submission)

            // Note for non-coders:
            // We add the new row locally so the user sees it immediately.
            let localMatch = Match(
                id: UUID(),
                playedAt: playedAt,
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
            // Note for non-coders:
            // `allMatches` is the full dataset used by ELO/stat calculations.
            // We must insert the new match there too so recap numbers are based on this just-saved game.
            allMatches.insert(localMatch, at: 0)
            statusMessage = "Match sparad."

            // Note: recalculate stats so the recap gets correct ELO deltas
            recalculateDerivedStats()

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
        Match(id: UUID(), playedAt: .now.addingTimeInterval(-86_400), teamAName: "Alex & Sam", teamBName: "Robin & Kim", teamAScore: 6, teamBScore: 4, teamAPlayerIds: [players[0].id.uuidString, players[1].id.uuidString], teamBPlayerIds: [players[2].id.uuidString]),
        Match(id: UUID(), playedAt: .now.addingTimeInterval(-172_800), teamAName: "Alex & Kim", teamBName: "Sam & Robin", teamAScore: 7, teamBScore: 5, teamAPlayerIds: [players[0].id.uuidString, players[2].id.uuidString], teamBPlayerIds: [players[1].id.uuidString]),
        Match(id: UUID(), playedAt: .now.addingTimeInterval(-250_000), teamAName: "Alex & Sam", teamBName: "Robin & Kim", teamAScore: 6, teamBScore: 5, teamAPlayerIds: [players[0].id.uuidString, players[1].id.uuidString], teamBPlayerIds: [players[2].id.uuidString])
    ]

    static let schedule: [ScheduleEntry] = [
        ScheduleEntry(id: UUID(), date: "2030-01-15", startTime: "18:00:00", location: "Center Court", description: "Friendly doubles"),
        ScheduleEntry(id: UUID(), date: "2030-01-17", startTime: "19:00:00", location: "North Hall", description: "Weekly ladder"),
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
