import SwiftUI

struct MoreView: View {
    @EnvironmentObject private var viewModel: AppViewModel
    @State private var pullProgress: CGFloat = 0
    @State private var isPullRefreshing = false
    @State private var isDeepLinkedAdminActive = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    ScrollOffsetTracker()
                    PadelRefreshHeader(isRefreshing: isPullRefreshing, pullProgress: pullProgress)

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

                    // Note for non-coders: this is the modern iOS navigation API for opening screens in code (for deep links).
                    Color.clear
                        .frame(width: 0, height: 0)
                }
                .padding()
            }
            .navigationTitle("Mer")
            .navigationBarTitleDisplayMode(.inline)
            .background(AppColors.background)
            .coordinateSpace(name: "padelScroll")
            .onPreferenceChange(ScrollOffsetPreferenceKey.self) { offset in
                pullProgress = PullToRefreshBehavior.progress(for: offset)
            }
            .refreshable {
                await PullToRefreshBehavior.performRefresh(isPullRefreshing: $isPullRefreshing) {
                    await viewModel.bootstrap()
                }
            }
            .onChange(of: viewModel.shouldOpenAdminFromDeepLink) { _, shouldOpenAdmin in
                guard shouldOpenAdmin else { return }
                // Note for non-coders: deep links can open a screen without the user tapping it manually.
                isDeepLinkedAdminActive = true
                viewModel.consumeOpenAdminFromDeepLinkFlag()
            }
            .navigationDestination(isPresented: $isDeepLinkedAdminActive) {
                AdminView()
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
