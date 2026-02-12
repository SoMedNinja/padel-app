import SwiftUI

struct DashboardView: View {
    @EnvironmentObject private var viewModel: AppViewModel

    private let dateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter
    }()

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isDashboardLoading {
                    loadingState
                } else if let error = viewModel.lastErrorMessage,
                          viewModel.players.isEmpty,
                          viewModel.matches.isEmpty {
                    errorState(message: error)
                } else if viewModel.dashboardFilteredMatches.isEmpty {
                    emptyState
                } else {
                    dashboardContent
                }
            }
            .navigationTitle("Dashboard")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Sign Out") {
                        viewModel.signOut()
                    }
                }
            }
            .padelLiquidGlassChrome()
            .task {
                // Note for non-coders: this keeps "dismissed" cards synced with the newest match date, like the web app.
                viewModel.syncHighlightDismissalWindow()
            }
            .refreshable {
                await viewModel.bootstrap()
            }
        }
    }

    private var loadingState: some View {
        List {
            Section {
                ProgressView("Loading dashboard…")
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.secondary.opacity(0.15))
                    .frame(height: 90)
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.secondary.opacity(0.15))
                    .frame(height: 160)
            }
        }
    }

    private func errorState(message: String) -> some View {
        List {
            Section("Could not load data") {
                Text(message)
                    .foregroundStyle(.red)
                Button("Try again") {
                    Task { await viewModel.bootstrap() }
                }
            }
        }
    }

    private var emptyState: some View {
        List {
            Section("No matches yet") {
                Text("Add your first match to unlock leaderboard trends, highlights, and MVP cards.")
                    .foregroundStyle(.secondary)
            }
        }
    }

    private var dashboardContent: some View {
        List {
            if let error = viewModel.lastErrorMessage {
                Section {
                    VStack(alignment: .leading, spacing: 8) {
                        Label("Data refresh warning", systemImage: "exclamationmark.triangle.fill")
                            .font(.headline)
                            .foregroundStyle(.orange)
                        Text(error)
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                        // Note for non-coders:
                        // This card tells users that some widgets may be stale because
                        // a live refresh failed, even though existing data is still visible.
                    }
                    .padding(.vertical, 4)
                }
            }
            if let notice = viewModel.activeTournamentNotice {
                Section {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Tournament in progress")
                            .font(.headline)
                        Text("\(notice.name) is live right now.")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                        HStack {
                            Button("Open Tournament") {
                                viewModel.openTournamentTab()
                            }
                            .buttonStyle(.borderedProminent)

                            Button("Dismiss") {
                                viewModel.dismissTournamentNotice()
                            }
                            .buttonStyle(.bordered)
                        }
                    }
                    .padding(.vertical, 4)
                }
            }

            if let upcoming = viewModel.nextScheduledGameNotice {
                Section {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Upcoming scheduled game")
                            .font(.headline)
                        Text("\(upcoming.description) • \(upcoming.location)")
                            .font(.subheadline)
                        Text(dateFormatter.string(from: upcoming.startsAt))
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        HStack {
                            Button("Open Schedule") {
                                viewModel.openScheduleTab()
                            }
                            .buttonStyle(.bordered)
                            Button("Dismiss") {
                                viewModel.dismissScheduledGameNotice()
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.vertical, 4)
                }
            }

            if let recent = viewModel.latestRecentMatch {
                Section("Recent highlight") {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("New result!")
                            .font(.headline)
                        Text("\(recent.teamAName) vs \(recent.teamBName)")
                        Text("Score: \(recent.teamAScore)-\(recent.teamBScore)")
                            .font(.subheadline.weight(.semibold))
                        Button("Dismiss") {
                            viewModel.dismissRecentMatchNotice()
                        }
                        .buttonStyle(.plain)
                    }
                    .padding(.vertical, 4)
                }
            }

            Section("Filter") {
                Picker("Period", selection: $viewModel.dashboardFilter) {
                    ForEach(DashboardMatchFilter.allCases) { filter in
                        Text(filter.title).tag(filter)
                    }
                }
                .pickerStyle(.segmented)
                // Note for non-coders: we use a menu here because iOS segmented controls become cramped with many options.

                if viewModel.dashboardFilter == .custom {
                    DatePicker("From", selection: $viewModel.dashboardCustomStartDate, displayedComponents: [.date])
                    DatePicker("To", selection: $viewModel.dashboardCustomEndDate, displayedComponents: [.date])

                    Button("Reset to all") {
                        viewModel.dashboardFilter = .all
                    }
                    .buttonStyle(.bordered)
                }

                Text("Active filter: \(viewModel.dashboardActiveFilterLabel)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Section("MVP-centret") {
                if let evening = viewModel.currentMVP {
                    mvpRow(title: "Kvällens MVP", result: evening)
                } else {
                    Text("Ingen kvällens MVP ännu (behöver fler matcher i kväll).")
                        .foregroundStyle(.secondary)
                }

                if let monthly = viewModel.periodMVP {
                    mvpRow(title: "Månadens MVP", result: monthly)
                } else {
                    Text("Ingen månadens MVP ännu (behöver fler matcher den här månaden).")
                        .foregroundStyle(.secondary)
                }
            }

            if viewModel.showHighlightCard, let highlight = viewModel.latestHighlightMatch,
               let match = viewModel.matches.first(where: { $0.id == highlight.matchId }) {
                Section("Match spotlight") {
                    VStack(alignment: .leading, spacing: 6) {
                        Text(highlight.title)
                            .font(.headline)
                        Text(highlight.description)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                        Text("\(match.teamAName) \(match.teamAScore)-\(match.teamBScore) \(match.teamBName)")
                            .font(.caption)
                        Button("Dismiss") {
                            viewModel.dismissHighlightCard()
                        }
                        .buttonStyle(.plain)
                    }
                    .padding(.vertical, 4)
                }
            }

            Section("ELO-topplista") {
                ForEach(Array(viewModel.players.enumerated()), id: \.element.id) { index, player in
                    NavigationLink(destination: RivalryView(opponentId: player.id)) {
                        HStack(spacing: 12) {
                            Text("#\(index + 1)")
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(.secondary)
                                .frame(width: 28)

                            VStack(alignment: .leading, spacing: 2) {
                                Text(player.profileName)
                                    .font(.subheadline.weight(.semibold))
                                Text(player.isAdmin ? "Admin" : "Medlem")
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                            }

                            Spacer()

                            // Sparkline for recent ELO trend
                            let points = viewModel.playerEloTimeline(playerId: player.id, filter: .all).suffix(10).map { $0.elo }
                            if points.count >= 2 {
                                SparklineView(points: Array(points))
                                    .frame(width: 50, height: 20)
                                    .opacity(0.6)
                            }

                            VStack(alignment: .trailing) {
                                Text("\(player.elo)")
                                    .font(.headline)
                                    .foregroundStyle(Color.accentColor)
                            }
                        }
                    }
                }
            }

            Section("Head-to-head") {
                if viewModel.headToHeadSummary.isEmpty {
                    Text("No rivalry data yet.")
                        .foregroundStyle(.secondary)
                } else {
                    ForEach(viewModel.headToHeadSummary) { summary in
                        VStack(alignment: .leading, spacing: 4) {
                            Text(summary.pairing)
                                .font(.subheadline.weight(.semibold))
                            Text("Matches played: \(summary.matchesPlayed)")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            Text("Close matches: \(summary.closeMatches)")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        .padding(.vertical, 4)
                    }
                }
            }
        }
    }

    private func mvpRow(title: String, result: DashboardMVPResult) -> some View {
        HStack(spacing: 12) {
            AsyncImage(url: URL(string: result.player.avatarURL ?? "")) { image in
                image.resizable().scaledToFill()
            } placeholder: {
                Image(systemName: "person.crop.circle.fill")
                    .font(.title2)
                    .foregroundStyle(Color.accentColor)
            }
            .frame(width: 44, height: 44)
            .clipShape(Circle())
            .overlay(Circle().stroke(Color.accentColor.opacity(0.1), lineWidth: 1))

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.caption2.weight(.bold))
                    .foregroundStyle(AppColors.success)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(AppColors.success.opacity(0.1), in: Capsule())

                Text(result.player.profileName)
                    .font(.headline)

                Text("\(result.wins) vinster på \(result.games) matcher • \(result.periodEloGain >= 0 ? "+" : "")\(result.periodEloGain) ELO")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer()
        }
        .padding(.vertical, 4)
    }
}
