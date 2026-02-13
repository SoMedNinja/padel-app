import SwiftUI


struct MainTabView: View {
    @EnvironmentObject private var viewModel: AppViewModel
    @State private var showQuickAdd = false
    @Environment(\.openURL) private var openURL

    var body: some View {
        TabView(selection: $viewModel.selectedMainTab) {
            ProfileView()
                .tabItem {
                    Label("Profil", systemImage: "person.crop.circle")
                }
                .tag(0)

            DashboardView()
                .tabItem {
                    Label("Översikt", systemImage: "chart.xyaxis.line")
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
                        if #available(iOS 17.0, *) {
                            Label {
                                Text("Turnering")
                            } icon: {
                                Image(systemName: "trophy")
                                    .symbolEffect(.pulse, options: .repeating, value: viewModel.activeTournamentNotice != nil)
                            }
                        } else {
                            Label("Turnering", systemImage: "trophy")
                        }
                    }
                    .tag(4)
            }


            if viewModel.canUseSingleGame {
                SingleGameView()
                    .tabItem {
                        Label("Match", systemImage: "plus.square.on.square")
                    }
                    .tag(5)
            }

            if viewModel.canUseAdmin {
                AdminView()
                    .tabItem {
                        Label("Admin", systemImage: "person.badge.key")
                    }
                    .tag(6)
            }

            SettingsView()
                .tabItem {
                    Label("Inställningar", systemImage: "gearshape")
                }
                .tag(7)
        }
        .overlay(alignment: .top) {
            VStack(spacing: 8) {
                // Note for non-coders:
                // This small banner confirms background sync changed visible data.
                if let updateBanner = viewModel.liveUpdateBanner {
                    Text(updateBanner)
                        .font(.footnote.weight(.semibold))
                        .padding(.horizontal, 14)
                        .padding(.vertical, 8)
                        .background(.ultraThinMaterial, in: Capsule())
                        .transition(.move(edge: .top).combined(with: .opacity))
                }


                if viewModel.isGuestMode {
                    HStack(spacing: 10) {
                        Image(systemName: "person.crop.circle.badge.exclamationmark")
                            .foregroundStyle(.orange)
                        Text("Gästläge: du kan visa statistik, men inte spara ändringar.")
                            .font(.footnote.weight(.semibold))
                            .multilineTextAlignment(.leading)
                        Spacer(minLength: 0)
                        Button("Logga in") {
                            // Note for non-coders:
                            // This exits guest mode and returns to the normal login screen.
                            viewModel.exitGuestMode()
                        }
                        .buttonStyle(.borderedProminent)
                        .controlSize(.small)
                    }
                    .padding(10)
                    .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                }

                if let versionMessage = viewModel.appVersionMessage {
                    HStack(spacing: 10) {
                        Image(systemName: viewModel.isUpdateRequired ? "exclamationmark.triangle.fill" : "arrow.down.circle.fill")
                            .foregroundStyle(viewModel.isUpdateRequired ? Color.orange : AppColors.brandPrimary)
                        Text(versionMessage)
                            .font(.footnote.weight(.semibold))
                            .multilineTextAlignment(.leading)
                        Spacer(minLength: 0)
                        if let updateURL = viewModel.appStoreUpdateURL {
                            Button("Uppdatera") {
                                openURL(updateURL)
                            }
                            .buttonStyle(.borderedProminent)
                            .controlSize(.small)
                        }
                    }
                    .padding(10)
                    .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
            }
            .padding(.top, 8)
            .padding(.horizontal, 12)
            .animation(.easeInOut(duration: 0.2), value: viewModel.liveUpdateBanner)
            .animation(.easeInOut(duration: 0.2), value: viewModel.appVersionMessage)
        }
        .safeAreaInset(edge: .bottom) {
            // Note for non-coders:
            // We place quick-add inside iOS safe area so it avoids clashing with the
            // tab bar/home indicator, which feels more native on different iPhones.
            if viewModel.selectedMainTab != 5 {
                HStack {
                    Spacer()
                    Button {
                        showQuickAdd = true
                    } label: {
                        Image(systemName: "plus")
                            .font(.title2.weight(.bold))
                            .foregroundStyle(.white)
                            .frame(width: 58, height: 58)
                            .background(Circle().fill(AppColors.brandPrimary))
                            .shadow(color: .black.opacity(0.2), radius: 8, y: 4)
                    }
                    .accessibilityLabel("Snabblägg till match")
                     .disabled(!viewModel.canCreateMatches || viewModel.isUpdateRequired || viewModel.isGuestMode)
                    .opacity(viewModel.canCreateMatches && !viewModel.isGuestMode ? 1 : 0.45)
                    .padding(.trailing, 16)
                    .padding(.bottom, 6)
                }
            }
        }
        .sheet(isPresented: $showQuickAdd) {
            SingleGameView()
                .environmentObject(viewModel)
                .presentationDetents([.medium, .large])
        }
        .padelLiquidGlassChrome()
    }
}
