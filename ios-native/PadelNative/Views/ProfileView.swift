import SwiftUI

struct ProfileView: View {
    @EnvironmentObject private var viewModel: AppViewModel

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    SectionCard(title: "Account") {
                        Text("Signed in player profile and permissions can be connected to Supabase auth.")
                            .foregroundStyle(.secondary)
                    }

                    if let current = viewModel.players.first {
                        SectionCard(title: "Current Player") {
                            Text(current.fullName)
                                .font(.title3).bold()
                            Text("ELO: \(current.elo)")
                            Text(current.isAdmin ? "Admin" : "Member")
                                .foregroundStyle(.secondary)
                        }
                    }
                }
                .padding()
            }
            .navigationTitle("Profile")
        }
    }
}
