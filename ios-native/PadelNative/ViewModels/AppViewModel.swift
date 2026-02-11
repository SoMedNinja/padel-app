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

struct ScheduleWeekOption: Identifiable {
    let key: String
    let label: String
    let week: Int
    let year: Int

    var id: String { key }
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
    @Published var selectedAvatarSymbol = "person.crop.circle.fill"
    @Published var activeTournament: Tournament?
    @Published var tournamentRounds: [TournamentRound] = []
    @Published var tournamentStandings: [TournamentStanding] = []
    @Published var tournamentHistoryResults: [TournamentResult] = []
    @Published var tournamentStatusMessage: String?
    @Published var isTournamentLoading = false
    @Published var adminProfiles: [AdminProfile] = []
    @Published var adminBanner: AdminActionBanner?
    @Published var isAdminActionRunning = false
    @Published var liveUpdateBanner: String?

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
        adminProfiles = []
        adminBanner = nil
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
        let involvingCurrent = matches.filter { match in
            match.teamAName.localizedCaseInsensitiveContains(currentPlayer.fullName)
                || match.teamBName.localizedCaseInsensitiveContains(currentPlayer.fullName)
        }
        guard !involvingCurrent.isEmpty else { return 0 }
        let wins = involvingCurrent.filter { match in
            if match.teamAName.localizedCaseInsensitiveContains(currentPlayer.fullName) {
                return match.teamAScore > match.teamBScore
            }
            return match.teamBScore > match.teamAScore
        }
        return Int((Double(wins.count) / Double(involvingCurrent.count)) * 100)
    }

    var profileMatchesPlayed: Int {
        guard let currentPlayer else { return 0 }
        return matches.filter { match in
            match.teamAName.localizedCaseInsensitiveContains(currentPlayer.fullName)
                || match.teamBName.localizedCaseInsensitiveContains(currentPlayer.fullName)
        }.count
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


    func bootstrap() async {
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
            let tournament = try await apiClient.fetchActiveTournament()
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
        } catch {
            // Note for non-coders:
            // If the network call fails, we keep any on-screen tournament data intact
            // and show a message so users know they can try a manual refresh.
            tournamentStatusMessage = "Could not load tournament data: \(error.localizedDescription)"
        }
    }

    func saveTournamentRound(round: TournamentRound, team1Score: Int, team2Score: Int) async {
        guard canMutateTournament else {
            tournamentStatusMessage = "Guests can view tournaments, but sign in is required to save scores."
            return
        }

        do {
            try await apiClient.saveTournamentRoundScore(roundId: round.id, team1Score: team1Score, team2Score: team2Score)
            tournamentStatusMessage = "Round \(round.roundNumber) score saved."
            await loadTournamentData(silently: false)
        } catch {
            tournamentStatusMessage = "Could not save round score: \(error.localizedDescription)"
        }
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
            tournamentStatusMessage = "Could not complete tournament: \(error.localizedDescription)"
        }
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
