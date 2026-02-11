import SwiftUI

struct MainTabView: View {
    @EnvironmentObject private var viewModel: AppViewModel
    @State private var showQuickAdd = false

    var body: some View {
        TabView(selection: $viewModel.selectedMainTab) {
            ProfileView()
                .tabItem {
                    Label("Profil", systemImage: "person.crop.circle")
                }
                .tag(0)

            DashboardView()
                .tabItem {
                    Label("Dashboard", systemImage: "chart.xyaxis.line")
                }
                .tag(1)

            HistoryView()
                .tabItem {
                    Label("Historik", systemImage: "clock.arrow.circlepath")
                }
                .tag(2)

            if viewModel.canSeeSchedule {
                ScheduleView()
                    .tabItem {
                        Label("Schema", systemImage: "calendar")
                    }
                    .tag(3)
            }

            if viewModel.canSeeTournament {
                TournamentView()
                    .tabItem {
                        Label("Turnering", systemImage: "trophy")
                    }
                    .tag(4)
            }

            if viewModel.canUseAdmin {
                AdminView()
                    .tabItem {
                        Label("Admin", systemImage: "gearshape.2")
                    }
                    .tag(5)
            }
        }
        .overlay(alignment: .top) {
            // Note for non-coders:
            // This small banner confirms background sync changed visible data.
            if let updateBanner = viewModel.liveUpdateBanner {
                Text(updateBanner)
                    .font(.footnote.weight(.semibold))
                    .padding(.horizontal, 14)
                    .padding(.vertical, 8)
                    .background(.ultraThinMaterial, in: Capsule())
                    .padding(.top, 8)
                    .transition(.move(edge: .top).combined(with: .opacity))
            }
        }
        .overlay(alignment: .bottom) {
            // Note for non-coders:
            // This floating + button mirrors the web app's quick-add action so users
            // can submit a match from anywhere without switching tabs.
            Button {
                showQuickAdd = true
            } label: {
                Image(systemName: "plus")
                    .font(.title2.weight(.bold))
                    .foregroundStyle(.white)
                    .frame(width: 58, height: 58)
                    .background(Circle().fill(Color.accentColor))
                    .shadow(color: .black.opacity(0.2), radius: 8, y: 4)
            }
            .padding(.bottom, 18)
            .accessibilityLabel("Snabblägg till match")
            .disabled(!viewModel.canCreateMatches)
            .opacity(viewModel.canCreateMatches ? 1 : 0.45)
        }
        .sheet(isPresented: $showQuickAdd) {
            SingleGameView()
                .environmentObject(viewModel)
                .presentationDetents([.medium, .large])
        }
        .padelLiquidGlassChrome()
    }
}
