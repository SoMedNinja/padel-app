import SwiftUI

struct ProfileView: View {
    @EnvironmentObject private var viewModel: AppViewModel

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    SectionCard(title: "Account") {
                        Text("Note for non-coders: this screen is the native version of the web profile route and shows who is signed in plus which routes they are allowed to open.")
                            .foregroundStyle(.secondary)
                    }

                    if let current = viewModel.currentPlayer {
                        SectionCard(title: "Current Player") {
                            Text(current.fullName)
                                .font(.title3).bold()
                            Text("ELO: \(current.elo)")
                            Text(current.isAdmin ? "Admin" : "Member")
                                .foregroundStyle(.secondary)
                        }

                        SectionCard(title: "Permissions") {
                            Label(current.isRegular ? "Schedule enabled" : "Schedule disabled", systemImage: current.isRegular ? "checkmark.circle" : "xmark.circle")
                            Label(current.isAdmin ? "Admin tools enabled" : "Admin tools disabled", systemImage: current.isAdmin ? "checkmark.shield" : "shield.slash")
                        }
                    }
                }
                .padding()
            }
            .navigationTitle("Profile")
        }
    }
}
