import SwiftUI

struct MainTabView: View {
    @EnvironmentObject private var viewModel: AppViewModel
    @Environment(\.openURL) private var openURL

    var body: some View {
        TabView(selection: $viewModel.selectedMainTab) {
            DashboardView()
                .tabItem {
                    Label("Översikt", systemImage: "chart.xyaxis.line")
                }
                .tag(0)

            ProfileView()
                .tabItem {
                    Label("Profil", systemImage: "person.crop.circle")
                }
                .tag(2)

            if viewModel.canUseSingleGame {
                SingleGameView()
                    .tabItem {
                        Label("Match", systemImage: "plus.square.on.square")
                    }
                    .tag(1)
            }

            if viewModel.canSeeSchedule {
                ScheduleView()
                    .tabItem {
                        Label("Schema", systemImage: "calendar")
                    }
                    .tag(3)
            }

            MoreView()
                .tabItem {
                    Label("Mer", systemImage: "ellipsis.circle")
                }
                .tag(4)
        }
        .overlay(alignment: .top) {
            let syncSnapshot = viewModel.pendingWriteQueueSnapshot
            let showSyncBanner = syncSnapshot.status != .synced || syncSnapshot.pendingCount > 0 || syncSnapshot.failedCount > 0
            if (viewModel.liveUpdateBanner != nil && viewModel.liveUpdateBanner?.isEmpty == false) ||
                viewModel.isGuestMode ||
                viewModel.appVersionMessage != nil ||
                showSyncBanner {
                VStack(spacing: 8) {
                    if showSyncBanner {
                        PendingWriteSyncBanner()
                    }

                    if let updateBanner = viewModel.liveUpdateBanner, !updateBanner.isEmpty {
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
        }
        .sheet(item: $viewModel.pendingVersionHighlights) { release in
            NavigationStack {
                VStack(alignment: .leading, spacing: 16) {
                    // Note for non-coders: this title tells users exactly which app version the notes apply to.
                    Text("Version \(release.version)")
                        .font(.inter(.subheadline, weight: .bold))
                        .foregroundStyle(AppColors.textSecondary)

                    Text(release.title)
                        .font(.inter(.title3, weight: .bold))
                        .foregroundStyle(AppColors.textPrimary)

                    VStack(alignment: .leading, spacing: 12) {
                        ForEach(Array(release.changes.enumerated()), id: \.offset) { _, change in
                            HStack(alignment: .top, spacing: 8) {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundStyle(AppColors.brandPrimary)
                                    .padding(.top, 1)
                                Text(change)
                                    .font(.inter(.body))
                                    .foregroundStyle(AppColors.textPrimary)
                            }
                        }
                    }

                    Spacer()

                    Button("Stäng") {
                        viewModel.dismissVersionHighlights()
                    }
                    .buttonStyle(.borderedProminent)
                    .frame(maxWidth: .infinity, alignment: .center)
                }
                .padding()
                .navigationTitle("Nyheter")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Klar") {
                            viewModel.dismissVersionHighlights()
                        }
                    }
                }
            }
            .presentationDetents([.medium, .large])
            .interactiveDismissDisabled(true)
        }
    }
}
