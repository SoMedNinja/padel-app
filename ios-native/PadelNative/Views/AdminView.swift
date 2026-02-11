import SwiftUI

struct AdminView: View {
    @EnvironmentObject private var viewModel: AppViewModel

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.canUseAdmin {
                    List {
                        Section("Overview") {
                            HStack {
                                Text("Players")
                                Spacer()
                                Text("\(viewModel.adminSnapshot.playerCount)")
                                    .bold()
                            }
                            HStack {
                                Text("Matches")
                                Spacer()
                                Text("\(viewModel.adminSnapshot.matchCount)")
                                    .bold()
                            }
                            HStack {
                                Text("Scheduled Games")
                                Spacer()
                                Text("\(viewModel.adminSnapshot.scheduledCount)")
                                    .bold()
                            }
                        }

                        Section("Admin tools") {
                            Text("Refresh data from server")
                            Text("Review latest activity")
                            Text("Monitor player access")
                        }

                        Section("What this does") {
                            Text("Note for non-coders: this tab mirrors the web app's admin route. It only appears for admin users and gives an operational summary.")
                                .foregroundStyle(.secondary)
                        }
                    }
                } else {
                    ContentUnavailableView(
                        "Admin Access Required",
                        systemImage: "lock.shield",
                        description: Text("Note for non-coders: this area is hidden for non-admin users, matching the web app's permission rules.")
                    )
                }
            }
            .navigationTitle("Admin")
            .refreshable {
                await viewModel.bootstrap()
            }
        }
    }
}
