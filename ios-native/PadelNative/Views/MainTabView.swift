import SwiftUI

struct MainTabView: View {
    @EnvironmentObject private var viewModel: AppViewModel

    var body: some View {
        TabView {
            ProfileView()
                .tabItem {
                    Label("Profile", systemImage: "person.crop.circle")
                }

            DashboardView()
                .tabItem {
                    Label("Dashboard", systemImage: "chart.bar")
                }

            HistoryView()
                .tabItem {
                    Label("History", systemImage: "clock.arrow.circlepath")
                }

            if viewModel.canSeeSchedule {
                ScheduleView()
                    .tabItem {
                        Label("Schedule", systemImage: "calendar")
                    }
            }

            TournamentView()
                .tabItem {
                    Label("Tournament", systemImage: "trophy")
                }

            SingleGameView()
                .tabItem {
                    Label("Single Game", systemImage: "sportscourt")
                }

            if viewModel.canUseAdmin {
                AdminView()
                    .tabItem {
                        Label("Admin", systemImage: "gearshape.2")
                    }
            }
        }
        .padelLiquidGlassChrome()
    }
}
