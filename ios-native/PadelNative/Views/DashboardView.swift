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

                Section("Leaderboard") {
                    ForEach(viewModel.players) { player in
                        HStack {
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
            }
            .navigationTitle("Dashboard")
            .refreshable {
                await viewModel.bootstrap()
            }
        }
    }
}
