import SwiftUI

struct RivalryView: View {
    @EnvironmentObject private var viewModel: AppViewModel
    let opponentId: UUID

    @State private var mode: String = "against"
    @State private var pullProgress: CGFloat = 0
    @State private var isPullRefreshing = false

    private var summary: RivalrySummary? {
        if mode == "against" {
            return viewModel.currentRivalryAgainstStats.first(where: { $0.id == opponentId })
        } else {
            return viewModel.currentRivalryTogetherStats.first(where: { $0.id == opponentId })
        }
    }

    private var opponent: Player? {
        viewModel.players.first(where: { $0.id == opponentId })
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                ScrollOffsetTracker()
                PadelRefreshHeader(isRefreshing: isPullRefreshing, pullProgress: pullProgress)

                Picker("Läge", selection: $mode) {
                    Text("Möten").tag("against")
                    Text("Tillsammans").tag("together")
                }
                .pickerStyle(.segmented)

                headerSection
                statsGrid
                detailedComparisonSection
                recentResultsSection
            }
            .padding()
        }
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
        .navigationTitle("Head-to-head")
        .padelLiquidGlassChrome()
    }

    private var headerSection: some View {
        HStack(spacing: 16) {
            playerCard(player: viewModel.currentPlayer, label: "Du")
            Text(mode == "against" ? "VS" : "&")
                .font(.inter(.title, weight: .black))
                .foregroundStyle(AppColors.textSecondary.opacity(0.5))
            playerCard(player: opponent, label: mode == "against" ? "Motstånd" : "Partner")
        }
    }

    private func playerCard(player: Player?, label: String) -> some View {
        let elo = (player?.id).flatMap { viewModel.playerBadgeStats[$0]?.currentElo } ?? player?.elo ?? 1000

        return VStack(spacing: 10) {
            PlayerAvatarView(urlString: player?.avatarURL, size: 64)
                .overlay(Circle().stroke(AppColors.brandPrimary.opacity(0.15), lineWidth: 2))

            VStack(spacing: 2) {
                Text(player?.profileName ?? "Okänd")
                    .font(.inter(.subheadline, weight: .bold))
                    .foregroundStyle(AppColors.textPrimary)
                Text("\(label) • ELO \(elo)")
                    .font(.inter(.caption))
                    .foregroundStyle(AppColors.textSecondary)
            }
        }
        .frame(maxWidth: .infinity)
        .padding()
        .padelSurfaceCard()
    }

    private var statsGrid: some View {
        VStack(spacing: 16) {
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
                statCard(title: "Matcher", value: "\(summary?.matchesPlayed ?? 0)")
                statCard(title: "Vinst/förlust", value: "\(summary?.wins ?? 0) - \(summary?.losses ?? 0)")
                statCard(title: "Vinst %", value: "\(Int((summary?.winRate ?? 0) * 100))%")
                statCard(title: "Totala set", value: "\(summary?.totalSetsFor ?? 0) - \(summary?.totalSetsAgainst ?? 0)")

                statCard(title: "Vinst (start-serve)", value: "\(summary?.serveFirstWins ?? 0) - \(summary?.serveFirstLosses ?? 0)")
                statCard(title: "Vinst (mottagning)", value: "\(summary?.serveSecondWins ?? 0) - \(summary?.serveSecondLosses ?? 0)")

                statCard(title: "Högsta ELO", value: "\(summary?.highestElo ?? 1000)")

                if mode == "against" {
                    statCard(title: "Vinstchans", value: "\(Int(round((summary?.winProbability ?? 0.5) * 100)))%")
                    statCard(title: "ELO-utbyte", value: "\(summary?.eloDelta ?? 0 >= 0 ? "+" : "")\(summary?.eloDelta ?? 0)", color: (summary?.eloDelta ?? 0) >= 0 ? AppColors.success : AppColors.error)
                }
            }

            if let last = summary?.lastMatchDate {
                VStack(spacing: 6) {
                    Text("SENASTE MÖTET")
                        .font(.inter(.caption2, weight: .black))
                        .foregroundStyle(AppColors.textSecondary)
                    Text("\(last, style: .date): \(summary?.lastMatchResult == "V" ? "Vinst" : "Förlust")")
                        .font(.inter(.subheadline, weight: .bold))
                        .foregroundStyle(summary?.lastMatchResult == "V" ? AppColors.success : AppColors.error)
                }
                .frame(maxWidth: .infinity)
                .padding()
                .padelSurfaceCard()
            }
        }
    }

    private var detailedComparisonSection: some View {
        Group {
            if let summary = summary {
                VStack(spacing: 16) {
                    comparisonRow(
                        title: "Antal dagar som månadens MVP",
                        myValue: "\(viewModel.currentMonthlyMvpDays)",
                        oppValue: "\(summary.monthlyMvpDays)"
                    )

                    comparisonRow(
                        title: "Antal kvällens MVP",
                        myValue: "\(viewModel.currentEveningMvps)",
                        oppValue: "\(summary.eveningMvps)"
                    )

                    comparisonRow(
                        title: "Turneringar (Gemensamma / Vinster)",
                        myValue: "\(summary.commonTournaments)",
                        oppValue: "\(summary.commonTournamentWins)",
                        myLabel: "Gemensamma",
                        oppLabel: "Dina vinster"
                    )
                }
            }
        }
    }

    private func comparisonRow(title: String, myValue: String, oppValue: String, myLabel: String = "Du", oppLabel: String? = nil) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title.uppercased())
                .font(.inter(size: 9, weight: .black))
                .foregroundStyle(AppColors.textSecondary)

            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(myLabel)
                        .font(.inter(.caption2, weight: .bold))
                        .foregroundStyle(AppColors.textSecondary)
                    Text(myValue)
                        .font(.inter(.title3, weight: .bold))
                        .foregroundStyle(AppColors.textPrimary)
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 2) {
                    Text(oppLabel ?? (opponent?.profileName ?? "Motståndare"))
                        .font(.inter(.caption2, weight: .bold))
                        .foregroundStyle(AppColors.textSecondary)
                    Text(oppValue)
                        .font(.inter(.title3, weight: .bold))
                        .foregroundStyle(AppColors.textPrimary)
                }
            }
        }
        .padding()
        .padelSurfaceCard()
    }

    private func statCard(title: String, value: String, color: Color = AppColors.textPrimary) -> some View {
        VStack(spacing: 6) {
            Text(title.uppercased())
                .font(.inter(size: 9, weight: .black))
                .foregroundStyle(AppColors.textSecondary)
            Text(value)
                .font(.inter(.headline, weight: .bold))
                .foregroundStyle(color)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .padelSurfaceCard()
    }

    private var recentResultsSection: some View {
        VStack(alignment: .center, spacing: 12) {
            Text("FORM (SENASTE 5)")
                .font(.inter(.caption, weight: .black))
                .foregroundStyle(AppColors.textSecondary)

            if let summary = summary, !summary.recentResults.isEmpty {
                HStack(spacing: 10) {
                    ForEach(Array(summary.recentResults.enumerated()), id: \.offset) { _, res in
                        Text(res)
                            .font(.inter(.caption, weight: .black))
                            .foregroundStyle(.white)
                            .frame(width: 32, height: 32)
                            .background(res == "V" ? AppColors.success : AppColors.error)
                            .clipShape(Circle())
                    }
                }
            } else {
                Text("Inga matcher hittades.")
                    .font(.inter(.footnote))
                    .foregroundStyle(AppColors.textSecondary)
            }
        }
        .frame(maxWidth: .infinity)
        .padding()
        .padelSurfaceCard()
    }
}
