import SwiftUI

struct HeatmapSectionView: View {
    let combos: [HeatmapCombo]
    let title: String
    @Binding var sortKey: String
    @Binding var sortAscending: Bool
    var currentPlayerName: String?

    var sortedCombos: [HeatmapCombo] {
        combos.sorted { a, b in
            let result: Bool
            switch sortKey {
            case "games": result = a.games < b.games
            case "winPct": result = a.winPct < b.winPct
            case "avgElo": result = a.avgElo < b.avgElo
            default: result = a.games < b.games
            }
            return sortAscending ? result : !result
        }
    }

    var body: some View {
        SectionCard(title: title) {
            ScrollView(.horizontal, showsIndicators: false) {
                VStack(alignment: .leading, spacing: 0) {
                    HStack(spacing: 0) {
                        headerCell(title: "Lagkamrat", width: 130, alignment: .leading)
                        sortableHeader(title: "Matcher", key: "games", width: 70)
                        sortableHeader(title: "Vinst %", key: "winPct", width: 70)
                        headerCell(title: "S/M %", width: 80, help: "Vinstprocent vid Start-serve (S) respektive Mottagning (M).")
                        sortableHeader(title: "Snitt-ELO", key: "avgElo", width: 80)
                        headerCell(title: "Senaste 5", width: 110)
                    }
                    .padding(.vertical, 10)
                    .background(AppColors.background)

                    ForEach(sortedCombos) { combo in
                        let otherPlayers = combo.players.filter { $0 != (currentPlayerName ?? "") }
                        let otherNames = otherPlayers.joined(separator: " & ")

                        HStack(spacing: 0) {
                            Text(otherNames.isEmpty ? "Singles" : otherNames)
                                .font(.inter(.subheadline, weight: .semibold))
                                .frame(width: 130, alignment: .leading)
                                .lineLimit(1)

                            Text("\(combo.games)")
                                .font(.inter(.subheadline))
                                .frame(width: 70)

                            Text("\(combo.winPct)%")
                                .font(.inter(.subheadline, weight: .bold))
                                .foregroundStyle(combo.winPct >= 50 ? AppColors.success : AppColors.textPrimary)
                                .frame(width: 70)

                            Text("\(combo.serveFirstWinPct ?? 0)%/\(combo.serveSecondWinPct ?? 0)%")
                                .font(.inter(size: 10).monospacedDigit())
                                .foregroundStyle(AppColors.textSecondary)
                                .frame(width: 80)

                            Text("\(combo.avgElo)")
                                .font(.inter(.subheadline))
                                .frame(width: 80)

                            HStack(spacing: 4) {
                                ForEach(Array(combo.recentResults.enumerated()), id: \.offset) { _, res in
                                    Text(res)
                                        .font(.inter(size: 9, weight: .bold))
                                        .foregroundStyle(.white)
                                        .frame(width: 18, height: 18)
                                        .background(res == "V" ? AppColors.success : AppColors.error)
                                        .clipShape(Circle())
                                }
                            }
                            .frame(width: 110)
                        }
                        .padding(.vertical, 10)
                        Divider()
                            .background(AppColors.borderSubtle)
                    }
                }
            }
        }
    }

    private func sortableHeader(title: String, key: String, width: CGFloat) -> some View {
        Button {
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            if sortKey == key {
                sortAscending.toggle()
            } else {
                sortKey = key
                sortAscending = false
            }
        } label: {
            HStack(spacing: 2) {
                Text(title)
                    .font(.inter(.caption, weight: .bold))
                    .foregroundStyle(AppColors.textSecondary)
                if sortKey == key {
                    Image(systemName: sortAscending ? "chevron.up" : "chevron.down")
                        .font(.system(size: 8, weight: .bold))
                        .foregroundStyle(AppColors.brandPrimary)
                }
            }
        }
        .buttonStyle(.plain)
        .frame(width: width)
    }

    private func headerCell(title: String, width: CGFloat, alignment: Alignment = .center, help: String? = nil) -> some View {
        HStack(spacing: 2) {
            Text(title)
                .font(.inter(.caption, weight: .bold))
                .foregroundStyle(AppColors.textSecondary)
            if let help = help {
                Menu {
                    Text(help)
                } label: {
                    Image(systemName: "info.circle")
                        .font(.system(size: 8))
                        .foregroundStyle(AppColors.textSecondary)
                }
            }
        }
        .frame(width: width, alignment: alignment)
    }
}
