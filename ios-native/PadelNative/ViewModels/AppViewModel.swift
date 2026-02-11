import Foundation

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

    var id: String { rawValue }

    var title: String {
        switch self {
        case .all: return "All"
        case .last7: return "Last 7d"
        case .last30: return "Last 30d"
        case .short: return "Short"
        case .long: return "Long"
        case .tournaments: return "Tournament"
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
    @Published var isAuthenticating = false
    @Published var authMessage: String?
    @Published var isCheckingSession = true
    @Published var hasRecoveryFailed = false
    @Published var sessionRecoveryError: String?
    @Published var isGuestMode = false
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
    @Published var isDashboardLoading = false
    @Published var selectedMainTab = 1

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
    private var liveSyncTask: Task<Void, Never>?
    private var liveSyncDebounceTask: Task<Void, Never>?
    private var liveUpdateBannerTask: Task<Void, Never>?
    private var pendingLiveSyncScopes: Set<LiveSyncScope> = []
    private var lastTournamentMarker: SupabaseRESTClient.TournamentLiveMarker?
    private let liveSyncIntervalNanoseconds: UInt64 = 18_000_000_000
    private let liveSyncDebounceNanoseconds: UInt64 = 900_000_000
    private static let adminDayFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .iso8601)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()

    private let dismissalStore = UserDefaults.standard
    private let dismissedHighlightIdKey = "dashboard.dismissedHighlightMatchId"
    private let dismissedHighlightDateKeyStore = "dashboard.dismissedHighlightDate"
    private let dismissedRecentMatchIdKey = "dashboard.dismissedRecentMatchId"
    private let dismissedScheduledGameIdKey = "dashboard.dismissedScheduledGameId"
    private let dismissedTournamentNoticeIdKey = "dashboard.dismissedTournamentNoticeId"

    init() {
        dismissedHighlightMatchId = Self.uuidValue(from: dismissalStore, key: dismissedHighlightIdKey)
        dismissedHighlightDateKey = dismissalStore.string(forKey: dismissedHighlightDateKeyStore)
        dismissedRecentMatchId = Self.uuidValue(from: dismissalStore, key: dismissedRecentMatchIdKey)
        dismissedScheduledGameId = Self.uuidValue(from: dismissalStore, key: dismissedScheduledGameIdKey)
        dismissedTournamentNoticeId = Self.uuidValue(from: dismissalStore, key: dismissedTournamentNoticeIdKey)
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

    func continueAsGuest() {
        // Note for non-coders:
        // Guest mode allows browsing without account access, but editing actions stay locked.
        isGuestMode = true
        isAuthenticated = false
        signedInEmail = nil
        currentIdentity = .guest
        authMessage = nil
        Task {
            await bootstrap()
        }
    }

    func signOut() {
        // Note for non-coders:
        // Signing out clears local state and also asks Supabase to end server session.
        Task {
            await authService.signOut(accessToken: nil)
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
        stopLiveSync()
    }

    func restoreSession() async {
        isCheckingSession = true
        hasRecoveryFailed = false
        sessionRecoveryError = nil

        defer { isCheckingSession = false }

        do {
            let identity = try await authService.restoreSession()
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

    private func applySignedInState(identity: AuthIdentity) {
        isGuestMode = identity.isGuest
        isAuthenticated = !identity.isGuest
        signedInEmail = identity.email
        currentIdentity = identity
        hasRecoveryFailed = false
        sessionRecoveryError = nil
    }

    // Note for non-coders:
    // Permissions now come from the signed-in user's own profile row only.
    // If that row is missing, we deny access by default to avoid exposing admin/member-only areas.
    private var authenticatedProfile: Player? {
        guard !isGuestMode, let profileId = currentIdentity?.profileId else {
            return nil
        }
        return players.first(where: { $0.id == profileId })
    }

    var currentPlayer: Player? { authenticatedProfile }

    var profileSetupPrompt: String {
        if isGuestMode {
            return "Log in to set up your player profile, upload an avatar, and choose a featured badge."
        }
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

    var profilePerformanceWidgets: [ProfilePerformanceWidget] {
        guard let currentPlayer else { return [] }
        let myMatches = currentPlayerMatches
        let wins = myMatches.filter { match in
            let teamAIds = match.teamAPlayerIds.compactMap { $0 }
            let iAmTeamA = teamAIds.contains(currentPlayer.id) || match.teamAName.localizedCaseInsensitiveContains(currentPlayer.fullName)
            return iAmTeamA ? match.teamAScore > match.teamBScore : match.teamBScore > match.teamAScore
        }.count
        let tournamentsPlayed = myMatches.filter { $0.sourceTournamentId != nil }.count
        let closeMatches = myMatches.filter { abs($0.teamAScore - $0.teamBScore) <= 1 }.count

        return [
            ProfilePerformanceWidget(id: "elo", title: "Current ELO", value: "\(currentPlayer.elo)", detail: "Live rating used in matchup balancing", symbol: "chart.line.uptrend.xyaxis"),
            ProfilePerformanceWidget(id: "winRate", title: "Win rate", value: "\(profileWinRate)%", detail: "\(wins) wins in \(myMatches.count) matches", symbol: "percent"),
            ProfilePerformanceWidget(id: "tournaments", title: "Tournament games", value: "\(tournamentsPlayed)", detail: "Matches with a tournament source", symbol: "trophy"),
            ProfilePerformanceWidget(id: "clutch", title: "Close battles", value: "\(closeMatches)", detail: "Matches decided by one set", symbol: "bolt.heart"),
        ]
    }

    var highlightedBadgeTitle: String {
        guard let currentPlayer else { return "No badge selected" }
        let selectedId = selectedFeaturedBadgeId ?? currentPlayer.featuredBadgeId
        guard let selectedId else { return "No badge selected" }
        return availableBadgeOptions.first(where: { $0.id == selectedId })?.title ?? selectedId
    }

    // Note for non-coders:
    // This mirrors web route guards. Guests cannot see the schedule, and signed-in users
    // only see it if their profile explicitly marks them as a regular member.
    var canSeeSchedule: Bool {
        guard !isGuestMode else { return false }
        guard let profile = authenticatedProfile else { return false }
        return profile.isRegular
    }

    var canManageSchedulePolls: Bool {
        canUseAdmin
    }

    var canVoteInSchedulePolls: Bool {
        canSeeSchedule
    }

    // Note for non-coders:
    // Missing profile/role data is treated as "not admin" so we never grant admin by accident.
    var canUseAdmin: Bool {
        guard !isGuestMode else { return false }
        guard let profile = authenticatedProfile else { return false }
        return profile.isAdmin
    }

    var canSeeTournament: Bool { !isGuestMode }
    var canUseSingleGame: Bool { !isGuestMode }

    var canMutateTournament: Bool { isAuthenticated && !isGuestMode }
    var canCreateMatches: Bool { isAuthenticated && canUseSingleGame }

    var isAwaitingApproval: Bool {
        guard !isGuestMode else { return false }
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
        let now = Date()
        let calendar = Calendar.current

        switch dashboardFilter {
        case .all:
            return matches
        case .short:
            return matches.filter { ($0.scoreType ?? "sets") == "sets" && max($0.teamAScore, $0.teamBScore) <= 3 }
        case .long:
            return matches.filter { ($0.scoreType ?? "sets") == "sets" && max($0.teamAScore, $0.teamBScore) >= 6 }
        case .tournaments:
            return matches.filter { $0.sourceTournamentId != nil }
        case .last7:
            guard let cutoff = calendar.date(byAdding: .day, value: -7, to: now) else { return matches }
            return matches.filter { $0.playedAt >= cutoff && $0.playedAt <= now }
        case .last30:
            guard let cutoff = calendar.date(byAdding: .day, value: -30, to: now) else { return matches }
            return matches.filter { $0.playedAt >= cutoff && $0.playedAt <= now }
        }
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

    var shouldShowDashboardGuestRestriction: Bool {
        isGuestMode
    }


    func bootstrap() async {
        isDashboardLoading = true
        defer { isDashboardLoading = false }

        if scheduleWeekOptions.isEmpty {
            scheduleWeekOptions = buildUpcomingWeeks()
            selectedScheduleWeekKey = scheduleWeekOptions.dropFirst().first?.key ?? scheduleWeekOptions.first?.key ?? ""
        }

        do {
            async let playersTask = apiClient.fetchLeaderboard()
            async let matchesTask = apiClient.fetchRecentMatches()
            async let scheduleTask = apiClient.fetchSchedule()
            async let pollsTask = apiClient.fetchAvailabilityPolls()
            async let tournamentTask = loadTournamentData(silently: true)

            self.players = try await playersTask
            syncProfileSetupDraftFromCurrentPlayer()
            self.matches = try await matchesTask
            self.schedule = try await scheduleTask
            self.polls = sortPolls(try await pollsTask)
            syncVoteDraftsFromPolls()
            _ = await tournamentTask
            await refreshAdminProfiles(silently: true)
            self.lastErrorMessage = nil
            startLiveSyncIfNeeded()
        } catch {
            // Note for non-coders:
            // If backend values are missing or internet is unavailable,
            // we still show sample data so the app stays usable.
            self.players = SampleData.players
            syncProfileSetupDraftFromCurrentPlayer()
            self.matches = SampleData.matches
            self.schedule = SampleData.schedule
            self.activeTournament = SampleData.tournament
            self.tournamentRounds = SampleData.tournamentRounds
            self.tournamentStandings = SampleData.tournamentStandings
            self.tournamentHistoryResults = SampleData.tournamentResultsHistory
            self.adminProfiles = []
            self.polls = []
            self.voteDraftsByDay = [:]
            self.lastErrorMessage = error.localizedDescription
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
        guard (isAuthenticated || isGuestMode), liveSyncTask == nil else { return }

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
        guard isAuthenticated || isGuestMode else { return }

        do {
            async let playersTask = apiClient.fetchLeaderboard()
            async let matchesTask = apiClient.fetchRecentMatches()
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
                changedCollections.append("matches")
            }

            if scheduleSignature(latestSchedule) != scheduleSignature(schedule) {
                schedule = latestSchedule
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
            // Live sync errors are intentionally silent so background polling never disrupts normal app usage.
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
            scheduleErrorMessage = nil
        } catch {
            scheduleErrorMessage = "Could not refresh schedule data: \(error.localizedDescription)"
        }
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
                let rounds = try await roundsTask
                let standingRows = try await standingsTask
                tournamentRounds = rounds
                tournamentStandings = resolveStandings(fromRounds: rounds, backendResults: standingRows)
            } else {
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
        tournamentType: String
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
            selectedTournamentId = created.id
            tournamentStatusMessage = "Tournament created in draft mode."
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

        // Note for non-coders:
        // This text payload mirrors what web shares in its modal so it can be copied,
        // sent to chat apps, or passed to iOS ShareLink without extra formatting work.
        return ([
            "\(tournament.name) (\(tournament.tournamentType.capitalized))",
            "Status: Completed",
            "",
            "Standings:",
        ] + lines).joined(separator: "\n")
    }

    func saveTournamentRound(round: TournamentRound, team1Score: Int, team2Score: Int) async {
        guard canMutateTournament else {
            tournamentStatusMessage = "Guests can view tournaments, but sign in is required to save scores."
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
            tournamentStatusMessage = "Guests can view tournaments, but sign in is required to complete them."
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
                    playerName: players.first(where: { $0.id == profileId })?.fullName ?? "Unknown player",
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
                playerName: players.first(where: { $0.id == playerId })?.fullName ?? "Unknown player",
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
    func submitSingleGame(
        teamAName: String,
        teamBName: String,
        teamAScore: Int,
        teamBScore: Int,
        scoreType: String = "sets",
        scoreTarget: Int? = nil,
        sourceTournamentId: UUID? = nil,
        sourceTournamentType: String = "standalone",
        teamAServesFirst: Bool = true
    ) async {
        let trimmedA = teamAName.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedB = teamBName.trimmingCharacters(in: .whitespacesAndNewlines)

        guard !trimmedA.isEmpty, !trimmedB.isEmpty else {
            statusMessage = "Please enter both team names."
            return
        }

        guard (0...99).contains(teamAScore), (0...99).contains(teamBScore) else {
            statusMessage = "Scores must be between 0 and 99."
            return
        }

        let normalizedScoreType = scoreType == "points" ? "points" : "sets"
        let normalizedTarget = normalizedScoreType == "points" ? scoreTarget : nil
        let normalizedTournamentType = sourceTournamentType.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            ? "standalone"
            : sourceTournamentType.trimmingCharacters(in: .whitespacesAndNewlines)

        // Note for non-coders:
        // The web database expects exactly two slots in each team ID list.
        // iOS single-game currently uses manual team names, so we safely send unknown IDs as nil placeholders.
        let unknownIds: [UUID?] = [nil, nil]
        let teamANames = normalizedTeamNames(from: trimmedA)
        let teamBNames = normalizedTeamNames(from: trimmedB)

        do {
            let submission = MatchSubmission(
                teamAName: teamANames.isEmpty ? [trimmedA] : teamANames,
                teamBName: teamBNames.isEmpty ? [trimmedB] : teamBNames,
                teamAPlayerIds: unknownIds,
                teamBPlayerIds: unknownIds,
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
                teamAName: trimmedA,
                teamBName: trimmedB,
                teamAScore: teamAScore,
                teamBScore: teamBScore,
                teamAPlayerIds: unknownIds,
                teamBPlayerIds: unknownIds,
                scoreType: normalizedScoreType,
                scoreTarget: normalizedTarget,
                sourceTournamentId: sourceTournamentId,
                sourceTournamentType: normalizedTournamentType,
                teamAServesFirst: teamAServesFirst
            )
            matches.insert(localMatch, at: 0)
            statusMessage = "Match saved successfully."
            await bootstrap()
        } catch {
            statusMessage = "Could not save match: \(error.localizedDescription)"
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
