import SwiftUI

struct RivalryView: View {
    @EnvironmentObject private var viewModel: AppViewModel
    let opponentId: UUID

    @State private var mode: String = "against"

    private var summary: RivalrySummary? {
        viewModel.currentRivalryStats.first(where: { $0.id == opponentId })
    }

    private var opponent: Player? {
        viewModel.players.first(where: { $0.id == opponentId })
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                headerSection
                statsGrid
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
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
            statCard(title: "Matcher", value: "\(summary?.matchesPlayed ?? 0)")
            statCard(title: "Vinst/förlust", value: "\(summary?.wins ?? 0) - \(summary?.losses ?? 0)")
            statCard(title: "Vinst %", value: "\(Int((summary?.winRate ?? 0) * 100))%")
            if mode == "against" {
                statCard(title: "ELO-utbyte", value: "\(summary?.eloDelta ?? 0 >= 0 ? "+" : "")\(summary?.eloDelta ?? 0)", color: (summary?.eloDelta ?? 0) >= 0 ? .green : .red)
            }
        }
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
        VStack(alignment: .leading, spacing: 10) {
            Text("SENASTE MATCHER")
                .font(.caption.weight(.bold))
                .foregroundStyle(.secondary)

            if let summary = summary {
                HStack {
                    Text(summary.lastMatchDate, style: .date)
                        .font(.subheadline)
                    Spacer()
                    Text(summary.lastMatchResult)
                        .font(.subheadline.weight(.bold))
                        .foregroundStyle(summary.lastMatchResult == "W" ? .green : .red)
                }
                .padding()
                .background(Color(.secondarySystemBackground))
                .clipShape(RoundedRectangle(cornerRadius: 10))
            } else {
                Text("Inga matcher hittades.")
                    .foregroundStyle(.secondary)
            }
        }
    }
}
