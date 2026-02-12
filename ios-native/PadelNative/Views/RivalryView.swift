import SwiftUI

struct RivalryView: View {
    @EnvironmentObject private var viewModel: AppViewModel
    let opponentId: UUID

    @State private var mode: String = "against"

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
            VStack(spacing: 20) {
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
        .navigationTitle("Head-to-head")
        .padelLiquidGlassChrome()
    }

    private var headerSection: some View {
        HStack {
            playerCard(player: viewModel.currentPlayer, label: "Du")
            Text(mode == "against" ? "VS" : "&")
                .font(.largeTitle.bold())
                .foregroundStyle(.secondary)
            playerCard(player: opponent, label: mode == "against" ? "Motstånd" : "Partner")
        }
    }

    private func playerCard(player: Player?, label: String) -> some View {
        VStack(spacing: 8) {
            AsyncImage(url: URL(string: player?.avatarURL ?? "")) { image in
                image.resizable().scaledToFill()
            } placeholder: {
                Image(systemName: "person.crop.circle.fill")
                    .font(.system(size: 40))
                    .foregroundStyle(Color.accentColor)
            }
            .frame(width: 64, height: 64)
            .clipShape(Circle())
            .overlay(Circle().stroke(Color.accentColor.opacity(0.2), lineWidth: 1))

            Text(player?.profileName ?? "Okänd")
                .font(.subheadline.weight(.bold))
            Text("\(label) • ELO \(player?.elo ?? 1000)")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private var statsGrid: some View {
        VStack(spacing: 12) {
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                statCard(title: "Matcher", value: "\(summary?.matchesPlayed ?? 0)")
                statCard(title: "Vinst/förlust", value: "\(summary?.wins ?? 0) - \(summary?.losses ?? 0)")
                statCard(title: "Vinst %", value: "\(Int((summary?.winRate ?? 0) * 100))%")
                statCard(title: "Totala set", value: "\(summary?.totalSetsFor ?? 0) - \(summary?.totalSetsAgainst ?? 0)")

                statCard(title: "Vinst (start-serve)", value: "\(summary?.serveFirstWins ?? 0) - \(summary?.serveFirstLosses ?? 0)")
                statCard(title: "Vinst (mottagning)", value: "\(summary?.serveSecondWins ?? 0) - \(summary?.serveSecondLosses ?? 0)")

                statCard(title: "Högsta ELO", value: "\(summary?.highestElo ?? 1000)")

                if mode == "against" {
                    statCard(title: "Vinstchans", value: "\(Int(round((summary?.winProbability ?? 0.5) * 100)))%")
                    statCard(title: "ELO-utbyte", value: "\(summary?.eloDelta ?? 0 >= 0 ? "+" : "")\(summary?.eloDelta ?? 0)", color: (summary?.eloDelta ?? 0) >= 0 ? .green : .red)
                }
            }

            if let last = summary?.lastMatchDate {
                VStack(spacing: 4) {
                    Text("SENASTE MÖTET")
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(.secondary)
                    Text("\(last, style: .date): \(summary?.lastMatchResult == "V" ? "Vinst" : "Förlust")")
                        .font(.subheadline.weight(.semibold))
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color(.secondarySystemBackground))
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }
    }

    private var detailedComparisonSection: some View {
        Group {
            if let summary = summary {
                VStack(spacing: 12) {
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
        VStack(alignment: .leading, spacing: 10) {
            Text(title.uppercased())
                .font(.caption2.weight(.bold))
                .foregroundStyle(.secondary)

            HStack {
                VStack(alignment: .leading) {
                    Text(myLabel)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                    Text(myValue)
                        .font(.headline.weight(.bold))
                }
                Spacer()
                VStack(alignment: .trailing) {
                    Text(oppLabel ?? (opponent?.profileName ?? "Motståndare"))
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                    Text(oppValue)
                        .font(.headline.weight(.bold))
                }
            }
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func statCard(title: String, value: String, color: Color = .primary) -> some View {
        VStack(spacing: 4) {
            Text(title.uppercased())
                .font(.caption2.weight(.bold))
                .foregroundStyle(.secondary)
            Text(value)
                .font(.headline.weight(.bold))
                .foregroundStyle(color)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private var recentResultsSection: some View {
        VStack(alignment: .center, spacing: 10) {
            Text("FORM (SENASTE 5)")
                .font(.caption.weight(.bold))
                .foregroundStyle(.secondary)

            if let summary = summary, !summary.recentResults.isEmpty {
                HStack(spacing: 8) {
                    ForEach(Array(summary.recentResults.enumerated()), id: \.offset) { _, res in
                        Text(res)
                            .font(.caption.weight(.bold))
                            .foregroundStyle(.white)
                            .frame(width: 28, height: 28)
                            .background(res == "V" ? Color.green : Color.red)
                            .clipShape(Circle())
                    }
                }
            } else {
                Text("Inga matcher hittades.")
                    .foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}
