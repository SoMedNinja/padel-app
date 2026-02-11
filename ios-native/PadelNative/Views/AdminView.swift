import SwiftUI

private enum PendingAdminAction: Identifiable {
    case toggleApproval(AdminProfile)
    case toggleAdmin(AdminProfile)
    case toggleRegular(AdminProfile)
    case deactivate(AdminProfile)

    var id: UUID {
        switch self {
        case .toggleApproval(let profile), .toggleAdmin(let profile), .toggleRegular(let profile), .deactivate(let profile):
            return profile.id
        }
    }

    var title: String {
        switch self {
        case .toggleApproval(let profile):
            return profile.isApproved ? "Remove approval?" : "Approve user?"
        case .toggleAdmin(let profile):
            return profile.isAdmin ? "Remove admin role?" : "Grant admin role?"
        case .toggleRegular(let profile):
            return profile.isRegular ? "Remove regular access?" : "Grant regular access?"
        case .deactivate:
            return "Deactivate user?"
        }
    }

    var message: String {
        switch self {
        case .toggleApproval(let profile):
            return "This updates whether \(profile.name) can use member features."
        case .toggleAdmin(let profile):
            return "This updates whether \(profile.name) can access admin tools."
        case .toggleRegular(let profile):
            return "This updates whether \(profile.name) can access schedule workflows."
        case .deactivate(let profile):
            return "This will deactivate \(profile.name), remove elevated access, and hide the profile from active users."
        }
    }
}

private enum AdminTab: String, CaseIterable, Identifiable {
    case users = "Users"
    case reports = "Reports"
    case emails = "Emails"

    var id: String { rawValue }
}

struct AdminView: View {
    @EnvironmentObject private var viewModel: AppViewModel
    @State private var pendingAction: PendingAdminAction?
    @State private var selectedTab: AdminTab = .users
    @State private var selectedEvening: String = ""
    @State private var selectedReportTournamentId: UUID?
    @State private var selectedEmailTournamentId: UUID?
    @State private var selectedWeeklyTimeframe: AdminWeeklyTimeframe = .last7
    @State private var selectedISOWeek = Calendar(identifier: .iso8601).component(.weekOfYear, from: .now)
    @State private var selectedISOYear = Calendar(identifier: .iso8601).component(.yearForWeekOfYear, from: .now)

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.canUseAdmin {
                    List {
                        Section {
                            Picker("Admin area", selection: $selectedTab) {
                                ForEach(AdminTab.allCases) { tab in
                                    Text(tab.rawValue).tag(tab)
                                }
                            }
                            .pickerStyle(.segmented)
                        }

                        if let adminBanner = viewModel.adminBanner {
                            Section {
                                bannerView(adminBanner)
                            }
                        }

                        switch selectedTab {
                        case .users:
                            usersSection
                        case .reports:
                            reportsSection
                        case .emails:
                            emailsSection
                        }

                        Section("What this does") {
                            Text("Note for non-coders: this admin screen now mirrors web tabs (users, reports, emails). Every action keeps strict admin checks before any server change runs.")
                                .foregroundStyle(.secondary)
                        }
                    }
                    .overlay {
                        if viewModel.isAdminActionRunning || viewModel.isAdminReportRunning || viewModel.isAdminEmailActionRunning {
                            ProgressView("Processing admin action...")
                                .padding()
                                .background(.ultraThinMaterial)
                                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                        }
                    }
                } else {
                    ContentUnavailableView(
                        "Admin Access Required",
                        systemImage: "lock.shield",
                        description: Text("Note for non-coders: this area is hidden for non-admin users to match web permission gating.")
                    )
                }
            }
            .navigationTitle("Admin")
            .padelLiquidGlassChrome()
            .task {
                guard viewModel.canUseAdmin else { return }
                await viewModel.refreshAdminProfiles(silently: true)
                if selectedEvening.isEmpty {
                    selectedEvening = viewModel.adminMatchEveningOptions.first ?? ""
                }
                if selectedReportTournamentId == nil {
                    selectedReportTournamentId = viewModel.tournaments.first(where: { $0.status == "completed" })?.id
                }
                if selectedEmailTournamentId == nil {
                    selectedEmailTournamentId = viewModel.tournaments.first(where: { $0.status == "completed" })?.id
                }
            }
            .refreshable {
                guard viewModel.canUseAdmin else { return }
                await viewModel.bootstrap()
            }
            .alert(item: $pendingAction) { action in
                Alert(
                    title: Text(action.title),
                    message: Text(action.message),
                    primaryButton: .destructive(Text("Confirm")) {
                        Task { await run(action) }
                    },
                    secondaryButton: .cancel()
                )
            }
        }
    }

    private var usersSection: some View {
        Group {
            Section("Overview") {
                metricRow(label: "Players", value: "\(viewModel.adminSnapshot.playerCount)")
                metricRow(label: "Matches", value: "\(viewModel.adminSnapshot.matchCount)")
                metricRow(label: "Scheduled Games", value: "\(viewModel.adminSnapshot.scheduledCount)")
            }

            Section("User management") {
                ForEach(viewModel.adminProfiles) { profile in
                    VStack(alignment: .leading, spacing: 10) {
                        HStack {
                            Text(profile.name).font(.headline)
                            Spacer()
                            if profile.isApproved {
                                Label("Approved", systemImage: "checkmark.seal.fill")
                                    .font(.caption)
                                    .foregroundStyle(.green)
                            } else {
                                Label("Pending", systemImage: "hourglass")
                                    .font(.caption)
                                    .foregroundStyle(.orange)
                            }
                        }

                        HStack(spacing: 8) {
                            Button(profile.isApproved ? "Revoke" : "Approve") { pendingAction = .toggleApproval(profile) }
                                .buttonStyle(.bordered)
                            Button(profile.isAdmin ? "Demote" : "Make admin") { pendingAction = .toggleAdmin(profile) }
                                .buttonStyle(.bordered)
                            Button(profile.isRegular ? "Remove regular" : "Make regular") { pendingAction = .toggleRegular(profile) }
                                .buttonStyle(.bordered)
                        }
                        .font(.caption)

                        Button(role: .destructive) { pendingAction = .deactivate(profile) } label: {
                            Label("Deactivate user", systemImage: "person.crop.circle.badge.xmark")
                        }
                        .font(.caption)
                    }
                    .padding(.vertical, 6)
                }
            }
        }
    }

    private var reportsSection: some View {
        Group {
            Section("Match-evening report") {
                // Note for non-coders:
                // Admin picks a past play date, then the app builds a shareable text summary.
                Picker("Play date", selection: $selectedEvening) {
                    ForEach(viewModel.adminMatchEveningOptions, id: \.self) { day in
                        Text(day).tag(day)
                    }
                }
                .disabled(viewModel.adminMatchEveningOptions.isEmpty)

                Button("Generate evening report") {
                    viewModel.generateMatchEveningReport(for: selectedEvening)
                }
                .disabled(selectedEvening.isEmpty)
            }

            Section("Tournament report") {
                Picker("Completed tournament", selection: $selectedReportTournamentId) {
                    Text("Select tournament").tag(Optional<UUID>.none)
                    ForEach(viewModel.tournaments.filter { $0.status == "completed" }) { tournament in
                        Text(tournament.name).tag(Optional(tournament.id))
                    }
                }

                Button("Generate tournament report") {
                    guard let id = selectedReportTournamentId else { return }
                    Task { await viewModel.generateTournamentReport(for: id) }
                }
                .disabled(selectedReportTournamentId == nil)
            }

            previewSection(
                title: "Report preview/share",
                content: viewModel.adminReportPreviewText,
                status: viewModel.adminReportStatusMessage
            )
        }
    }

    private var emailsSection: some View {
        Group {
            Section("Weekly email") {
                Picker("Timeframe", selection: $selectedWeeklyTimeframe) {
                    ForEach(AdminWeeklyTimeframe.allCases) { option in
                        Text(option.title).tag(option)
                    }
                }

                if selectedWeeklyTimeframe == .isoWeek {
                    Stepper("ISO Week: \(selectedISOWeek)", value: $selectedISOWeek, in: 1...53)
                    Stepper("ISO Year: \(selectedISOYear)", value: $selectedISOYear, in: 2020...2100)
                }

                Button("Preview weekly email") {
                    let week = selectedWeeklyTimeframe == .isoWeek ? selectedISOWeek : nil
                    let year = selectedWeeklyTimeframe == .isoWeek ? selectedISOYear : nil
                    viewModel.buildWeeklyEmailPreview(timeframe: selectedWeeklyTimeframe, week: week, year: year)
                }

                Button("Run weekly email test") {
                    let week = selectedWeeklyTimeframe == .isoWeek ? selectedISOWeek : nil
                    let year = selectedWeeklyTimeframe == .isoWeek ? selectedISOYear : nil
                    Task { await viewModel.sendWeeklyEmailTest(timeframe: selectedWeeklyTimeframe, week: week, year: year) }
                }
                .buttonStyle(.borderedProminent)
            }

            Section("Tournament email") {
                Picker("Completed tournament", selection: $selectedEmailTournamentId) {
                    Text("Select tournament").tag(Optional<UUID>.none)
                    ForEach(viewModel.tournaments.filter { $0.status == "completed" }) { tournament in
                        Text(tournament.name).tag(Optional(tournament.id))
                    }
                }

                Button("Preview tournament email") {
                    guard let id = selectedEmailTournamentId else { return }
                    Task { await viewModel.buildTournamentEmailPreview(for: id) }
                }
                .disabled(selectedEmailTournamentId == nil)

                Button("Run tournament email test") {
                    Task { await viewModel.sendTournamentEmailTest() }
                }
                .buttonStyle(.borderedProminent)
            }

            previewSection(
                title: "Email preview/test output",
                content: viewModel.adminEmailPreviewText,
                status: viewModel.adminEmailStatusMessage
            )
        }
    }

    private func metricRow(label: String, value: String) -> some View {
        HStack {
            Text(label)
            Spacer()
            Text(value).bold()
        }
    }

    @ViewBuilder
    private func previewSection(title: String, content: String?, status: String?) -> some View {
        Section(title) {
            if let content, content.isEmpty == false {
                Text(content)
                    .font(.footnote)
                    .textSelection(.enabled)

                if let cardURL = adminShareImageURL(content: content, title: title) {
                    ShareLink(item: cardURL) {
                        Label("Share as image", systemImage: "photo.on.rectangle")
                    }
                }

                ShareLink(item: content) {
                    Label("Share output text", systemImage: "square.and.arrow.up")
                }

                Text("Note for non-coders: image sharing gives a cleaner card in chat apps; text sharing remains as backup.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            } else {
                Text("No preview yet. Generate one using the actions above.")
                    .foregroundStyle(.secondary)
            }

            if let status, status.isEmpty == false {
                Text(status)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }


    private func adminShareImageURL(content: String, title: String) -> URL? {
        let lines = content.split(separator: "\n").map(String.init).prefix(18)
        return try? ShareCardService.createShareImageFile(
            title: title,
            bodyLines: Array(lines),
            fileNamePrefix: "admin-report"
        )
    }

    @ViewBuilder
    private func bannerView(_ banner: AdminActionBanner) -> some View {
        HStack(spacing: 8) {
            Image(systemName: banner.style == .success ? "checkmark.circle.fill" : "xmark.octagon.fill")
            Text(banner.message)
                .font(.subheadline)
                .multilineTextAlignment(.leading)
        }
        .foregroundStyle(.white)
        .padding(10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(banner.style == .success ? Color.green : Color.red)
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
    }

    private func run(_ action: PendingAdminAction) async {
        switch action {
        case .toggleApproval(let profile):
            await viewModel.setApproval(for: profile, approved: !profile.isApproved)
        case .toggleAdmin(let profile):
            await viewModel.setAdminRole(for: profile, isAdmin: !profile.isAdmin)
        case .toggleRegular(let profile):
            await viewModel.setRegularRole(for: profile, isRegular: !profile.isRegular)
        case .deactivate(let profile):
            await viewModel.deactivateProfile(profile)
        }
    }
}
