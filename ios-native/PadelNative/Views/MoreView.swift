import SwiftUI

struct MoreView: View {
    @EnvironmentObject private var viewModel: AppViewModel

    var body: some View {
        NavigationStack {
            List {
                NavigationLink {
                    HistoryView()
                } label: {
                    Label("Historik", systemImage: "clock.arrow.circlepath")
                }

                if viewModel.canSeeTournament {
                    NavigationLink {
                        TournamentView()
                    } label: {
                        Label("Turnering", systemImage: "trophy")
                    }
                }

                if viewModel.canUseAdmin {
                    NavigationLink {
                        AdminView()
                    } label: {
                        Label("Admin", systemImage: "person.badge.key")
                    }
                }

                NavigationLink {
                    SettingsView()
                } label: {
                    Label("Inställningar", systemImage: "gearshape")
                }
            }
            .navigationTitle("More")
            .navigationBarTitleDisplayMode(.inline)
            .scrollContentBackground(.hidden)
            .background(AppColors.background)
            .padelLiquidGlassChrome()
        }
    }
}
