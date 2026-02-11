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

            Section("Filters") {
                Picker("Match filter", selection: $viewModel.dashboardFilter) {
                    ForEach(DashboardMatchFilter.allCases) { filter in
                        Text(filter.title).tag(filter)
                    }
                }
                .pickerStyle(.segmented)
                // Note for non-coders: this segmented control is the iOS version of the web filter bar.
            }

            Section("MVP") {
                if let evening = viewModel.currentMVP {
                    mvpRow(title: "Current MVP", result: evening)
                } else {
                    Text("No current MVP yet (needs enough games tonight).")
                        .foregroundStyle(.secondary)
                }

                if let monthly = viewModel.periodMVP {
                    mvpRow(title: "30-day MVP", result: monthly)
                } else {
                    Text("No period MVP yet (needs enough games this month).")
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

            Section("ELO Leaderboard") {
                ForEach(Array(viewModel.players.enumerated()), id: \.element.id) { index, player in
                    HStack {
                        Text("#\(index + 1)")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(.secondary)
                            .frame(width: 28)

                        VStack(alignment: .leading) {
                            Text(player.fullName)
                            Text(player.isAdmin ? "Admin" : "Member")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                        Text("\(player.elo)")
                            .font(.headline)
                    }
                }
            }

            Section("Head-to-Head") {
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
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)
            Text(result.player.fullName)
                .font(.headline)
            Text("Wins \(result.wins)/\(result.games) • ELO delta \(result.periodEloGain >= 0 ? "+" : "")\(result.periodEloGain)")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding(.vertical, 4)
    }
}
