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

@MainActor
final class AppViewModel: ObservableObject {
    struct AdminActionBanner {
        let message: String
        let isSuccess: Bool
    }

    @Published var players: [Player] = []
    @Published var matches: [Match] = []
    @Published var schedule: [ScheduleEntry] = []
    @Published var adminProfiles: [AdminProfile] = []
    @Published var adminBanner: AdminActionBanner?
    @Published var lastErrorMessage: String?
    @Published var statusMessage: String?
    @Published var isAuthenticated = false
    @Published var isAuthenticating = false
    @Published var authMessage: String?
    @Published var selectedAvatarSymbol = "person.crop.circle.fill"

    private(set) var signedInEmail: String?

    private var accountStore: [String: String] = [
        "alex@padel.app": "padel123",
        "sam@padel.app": "padel123"
    ]

    // Note for non-coders:
    // We keep auth details in-memory for this starter iOS client so teams can test
    // the full sign in / sign up flow before wiring secure production authentication.
    // In production, this should use Supabase Auth sessions and secure storage.
    func signIn(email: String, password: String) async {
        let normalizedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        let normalizedPassword = password.trimmingCharacters(in: .whitespacesAndNewlines)

        guard !normalizedEmail.isEmpty, !normalizedPassword.isEmpty else {
            authMessage = "Please enter both email and password."
            return
        }

        isAuthenticating = true
        defer { isAuthenticating = false }

        try? await Task.sleep(nanoseconds: 350_000_000)

        guard let storedPassword = accountStore[normalizedEmail], storedPassword == normalizedPassword else {
            authMessage = "Invalid email or password."
            return
        }

        signedInEmail = normalizedEmail
        isAuthenticated = true
        authMessage = nil
        await bootstrap()
    }

    // Note for non-coders:
    // Sign up creates a new account in this prototype auth store and then signs the
    // person in immediately, matching the instant onboarding pattern in the web app.
    func signUp(name: String, email: String, password: String) async {
        let normalizedName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        let normalizedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        let normalizedPassword = password.trimmingCharacters(in: .whitespacesAndNewlines)

        guard normalizedName.count >= 2 else {
            authMessage = "Please enter your full name."
            return
        }

        guard normalizedPassword.count >= 6 else {
            authMessage = "Password must be at least 6 characters."
            return
        }

        guard !normalizedEmail.isEmpty else {
            authMessage = "Please enter an email address."
            return
        }

        if accountStore[normalizedEmail] != nil {
            authMessage = "An account already exists with this email."
            return
        }

        accountStore[normalizedEmail] = normalizedPassword
        signedInEmail = normalizedEmail
        isAuthenticated = true
        authMessage = nil

        if players.isEmpty {
            players = SampleData.players
        }

        if !players.contains(where: { $0.fullName.caseInsensitiveCompare(normalizedName) == .orderedSame }) {
            players.insert(
                Player(id: UUID(), fullName: normalizedName, elo: 1200, isAdmin: false, isRegular: true),
                at: 0
            )
        }

        await bootstrap()
    }

    func signOut() {
        // Note for non-coders:
        // Signing out clears local session state and returns to the auth screen,
        // similar to how the web app returns to its login flow.
        isAuthenticated = false
        signedInEmail = nil
        authMessage = nil
        statusMessage = nil
    }

    // Note for non-coders:
    // We map the signed-in email to a player profile name if possible so the right
    // person appears in Profile and permission-gated sections.
    var currentPlayer: Player? {
        guard let signedInEmail else { return players.first }
        let emailPrefix = signedInEmail.split(separator: "@").first?.replacingOccurrences(of: ".", with: " ") ?? ""
        if let exact = players.first(where: { $0.fullName.caseInsensitiveCompare(String(emailPrefix)) == .orderedSame }) {
            return exact
        }
        return players.first
    }

    var canSeeSchedule: Bool { currentPlayer?.isRegular ?? true }
    var canUseAdmin: Bool { currentPlayer?.isAdmin ?? false }

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

    private let apiClient = SupabaseRESTClient()

    func bootstrap() async {
        do {
            async let playersTask = apiClient.fetchLeaderboard()
            async let matchesTask = apiClient.fetchRecentMatches()
            async let scheduleTask = apiClient.fetchSchedule()

            self.players = try await playersTask
            self.matches = try await matchesTask
            self.schedule = try await scheduleTask

            if canUseAdmin {
                self.adminProfiles = try await apiClient.fetchAdminProfiles(isRequesterAdmin: true)
            } else {
                self.adminProfiles = []
            }
            self.lastErrorMessage = nil
        } catch {
            // Note for non-coders:
            // If backend values are missing or internet is unavailable,
            // we still show sample data so the app stays usable.
            self.players = SampleData.players
            self.matches = SampleData.matches
            self.schedule = SampleData.schedule
            self.adminProfiles = canUseAdmin ? SampleData.adminProfiles : []
            self.lastErrorMessage = error.localizedDescription
        }
    }

    func refreshAdminData() async {
        guard canUseAdmin else {
            adminProfiles = []
            return
        }

        do {
            adminProfiles = try await apiClient.fetchAdminProfiles(isRequesterAdmin: true)
        } catch {
            adminBanner = AdminActionBanner(message: "Could not refresh admin data: \(error.localizedDescription)", isSuccess: false)
        }
    }

    func clearAdminBanner() {
        adminBanner = nil
    }

    func toggleAdminRole(for profile: AdminProfile) async {
        guard canUseAdmin else { return }
        guard profile.id != currentPlayer?.id else {
            adminBanner = AdminActionBanner(message: "You cannot remove your own admin role.", isSuccess: false)
            return
        }

        await runAdminMutation(
            bannerSuccessMessage: profile.isAdmin ? "Admin role removed for \(profile.fullName)." : "Admin role granted to \(profile.fullName)."
        ) {
            try await apiClient.updateAdminProfile(
                id: profile.id,
                updates: ProfileAdminUpdate(isAdmin: !profile.isAdmin, isRegular: nil, isApproved: nil, isDeleted: nil),
                isRequesterAdmin: canUseAdmin
            )
        }
    }

    func toggleApproval(for profile: AdminProfile) async {
        guard canUseAdmin else { return }

        await runAdminMutation(
            bannerSuccessMessage: profile.isApproved ? "Approval revoked for \(profile.fullName)." : "\(profile.fullName) is now approved."
        ) {
            try await apiClient.updateAdminProfile(
                id: profile.id,
                updates: ProfileAdminUpdate(isAdmin: nil, isRegular: nil, isApproved: !profile.isApproved, isDeleted: nil),
                isRequesterAdmin: canUseAdmin
            )
        }
    }

    func toggleRegularRole(for profile: AdminProfile) async {
        guard canUseAdmin else { return }

        await runAdminMutation(
            bannerSuccessMessage: profile.isRegular ? "Regular status removed for \(profile.fullName)." : "Regular status enabled for \(profile.fullName)."
        ) {
            try await apiClient.updateAdminProfile(
                id: profile.id,
                updates: ProfileAdminUpdate(isAdmin: nil, isRegular: !profile.isRegular, isApproved: nil, isDeleted: nil),
                isRequesterAdmin: canUseAdmin
            )
        }
    }

    func toggleDeactivation(for profile: AdminProfile) async {
        guard canUseAdmin else { return }
        guard profile.id != currentPlayer?.id else {
            adminBanner = AdminActionBanner(message: "You cannot deactivate your own account.", isSuccess: false)
            return
        }

        // Note for non-coders:
        // Deactivating a profile also removes sensitive permissions so the account is
        // effectively blocked from privileged areas until reactivated.
        let deactivating = !profile.isDeleted
        let updates = ProfileAdminUpdate(
            isAdmin: deactivating ? false : nil,
            isRegular: deactivating ? false : true,
            isApproved: deactivating ? false : true,
            isDeleted: deactivating
        )

        await runAdminMutation(
            bannerSuccessMessage: deactivating ? "\(profile.fullName) has been deactivated." : "\(profile.fullName) has been reactivated."
        ) {
            try await apiClient.updateAdminProfile(id: profile.id, updates: updates, isRequesterAdmin: canUseAdmin)
        }
    }

    private func runAdminMutation(
        bannerSuccessMessage: String,
        action: () async throws -> Void
    ) async {
        do {
            try await action()
            adminBanner = AdminActionBanner(message: bannerSuccessMessage, isSuccess: true)
            await bootstrap()
        } catch {
            adminBanner = AdminActionBanner(message: "Admin action failed: \(error.localizedDescription)", isSuccess: false)
        }
    }

    func submitSingleGame(teamAName: String, teamBName: String, teamAScore: Int, teamBScore: Int) async {
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

        do {
            let submission = MatchSubmission(
                teamAName: trimmedA,
                teamBName: trimmedB,
                teamAScore: teamAScore,
                teamBScore: teamBScore,
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
                teamBScore: teamBScore
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

    static let adminProfiles: [AdminProfile] = [
        AdminProfile(
            id: UUID(uuidString: "11111111-1111-1111-1111-111111111111")!,
            fullName: "Alex",
            elo: 1510,
            isAdmin: true,
            isRegular: true,
            isApproved: true,
            isDeleted: false
        ),
        AdminProfile(
            id: UUID(uuidString: "22222222-2222-2222-2222-222222222222")!,
            fullName: "Sam",
            elo: 1465,
            isAdmin: false,
            isRegular: true,
            isApproved: true,
            isDeleted: false
        ),
        AdminProfile(
            id: UUID(uuidString: "33333333-3333-3333-3333-333333333333")!,
            fullName: "Robin",
            elo: 1430,
            isAdmin: false,
            isRegular: false,
            isApproved: false,
            isDeleted: false
        )
    ]
}
