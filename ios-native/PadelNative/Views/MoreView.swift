import SwiftUI

struct MoreView: View {
    @EnvironmentObject private var viewModel: AppViewModel
    @State private var pullProgress: CGFloat = 0
    @State private var isDeepLinkedAdminActive = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    ScrollOffsetTracker()
                    PadelRefreshHeader(isRefreshing: viewModel.isDashboardLoading && !viewModel.players.isEmpty, pullProgress: pullProgress)

                    VStack(spacing: 0) {
                        moreLink(title: "Historik", icon: "clock.arrow.circlepath") {
                            HistoryView()
                        }

                        Divider().padding(.leading, 44)

                        if viewModel.canSeeTournament {
                            moreLink(title: "Turnering", icon: "trophy") {
                                TournamentView()
                            }
                            Divider().padding(.leading, 44)
                        }

                        if viewModel.canUseAdmin {
                            moreLink(title: "Admin", icon: "person.badge.key") {
                                AdminView()
                            }
                            Divider().padding(.leading, 44)
                        }

                        moreLink(title: "Inställningar", icon: "gearshape") {
                            SettingsView()
                        }
                    }
                    .padelSurfaceCard()

                    NavigationLink(isActive: $isDeepLinkedAdminActive) {
                        AdminView()
                    } label: {
                        EmptyView()
                    }
                    .hidden()
                }
                .padding()
            }
            .navigationTitle("Mer")
            .navigationBarTitleDisplayMode(.inline)
            .background(AppColors.background)
            .coordinateSpace(name: "padelScroll")
            .onPreferenceChange(ScrollOffsetPreferenceKey.self) { offset in
                let threshold: CGFloat = 80
                pullProgress = max(0, min(1.0, offset / threshold))
            }
            .refreshable {
                await viewModel.bootstrap()
            }
            .onChange(of: viewModel.shouldOpenAdminFromDeepLink) { _, shouldOpenAdmin in
                guard shouldOpenAdmin else { return }
                // Note for non-coders: deep links can open a screen without the user tapping it manually.
                isDeepLinkedAdminActive = true
                viewModel.consumeOpenAdminFromDeepLinkFlag()
            }
            .padelLiquidGlassChrome()
        }
    }

    private func moreLink<Destination: View>(title: String, icon: String, @ViewBuilder destination: () -> Destination) -> some View {
        NavigationLink(destination: destination) {
            HStack(spacing: 12) {
                Image(systemName: icon)
                    .font(.headline)
                    .foregroundStyle(AppColors.brandPrimary)
                    .frame(width: 32)

                Text(title)
                    .font(.inter(.body))
                    .foregroundStyle(AppColors.textPrimary)

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.caption.bold())
                    .foregroundStyle(AppColors.textSecondary.opacity(0.5))
            }
            .padding(.vertical, 14)
            .padding(.horizontal, 16)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}
