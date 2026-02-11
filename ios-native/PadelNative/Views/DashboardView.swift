import SwiftUI

struct DashboardView: View {
    @EnvironmentObject private var viewModel: AppViewModel

    var body: some View {
        NavigationStack {
            List {
                if let message = viewModel.lastErrorMessage {
                    Section("Status") {
                        Text("Using fallback data: \(message)")
                            .foregroundStyle(.orange)
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

                Section("Quick notes") {
                    Text("Note for non-coders: this dashboard keeps the same PWA capabilities (leaderboard + rivalry insights) but uses native list cards that feel at home on iOS.")
                        .foregroundStyle(.secondary)
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
            .refreshable {
                await viewModel.bootstrap()
            }
        }
    }
}
