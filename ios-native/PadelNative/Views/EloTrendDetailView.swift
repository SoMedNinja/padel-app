import SwiftUI
import Charts

struct EloTrendDetailView: View {
    @EnvironmentObject private var viewModel: AppViewModel
    @Environment(\.dismiss) private var dismiss

    let playerIds: [UUID]
    let filter: DashboardMatchFilter

    @State private var chartSelectionIndex: Int?
    private let trendPalette: [Color] = [.blue, .green, .orange, .purple, .pink, .teal, .indigo, .brown]

    var body: some View {
        VStack(spacing: 0) {
            header

            let timeline = viewModel.buildComparisonTimeline(playerIds: playerIds, filter: filter)

            if timeline.count <= 1 {
                emptyState
            } else {
                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                        if #available(iOS 17.0, *) {
                            scrubbingInfo(timeline: timeline)
                            chartView(timeline: timeline)
                        } else {
                            chartView(timeline: timeline)
                        }

                        legendView

                        if let index = chartSelectionIndex, index < timeline.count {
                            matchDetailAt(point: timeline[index])
                        }
                    }
                    .padding()
                }
            }
        }
        .background(AppColors.background)
        .navigationTitle("ELO Analys")
        .navigationBarTitleDisplayMode(.inline)
        .padelLiquidGlassChrome()
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("Detaljerad trend")
                .font(.inter(.caption, weight: .black))
                .foregroundStyle(AppColors.textSecondary)
                .padding(.horizontal)
                .padding(.top, 10)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var emptyState: some View {
        VStack(spacing: 20) {
            Image(systemName: "chart.line.uptrend.xyaxis")
                .font(.system(size: 60))
                .foregroundStyle(AppColors.textSecondary.opacity(0.3))
            Text("För lite data för analys")
                .font(.inter(.headline))
            Text("Spela fler matcher för att låsa upp den interaktiva trendgrafen.")
                .font(.inter(.subheadline))
                .foregroundStyle(AppColors.textSecondary)
                .multilineTextAlignment(.center)
        }
        .padding(40)
        .frame(maxHeight: .infinity)
    }

    @available(iOS 17.0, *)
    private func scrubbingInfo(timeline: [ComparisonTimelinePoint]) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            if let index = chartSelectionIndex, index < timeline.count {
                let point = timeline[index]
                Text(point.date, format: .dateTime.day().month().year().hour().minute())
                    .font(.inter(.subheadline, weight: .bold))

                ForEach(Array(playerIds.enumerated()), id: \.element) { index, pid in
                    let label = pid == viewModel.currentPlayer?.id ? "Du" : (viewModel.players.first(where: { $0.id == pid })?.profileName ?? "Annan")
                    if let elo = point.elos[pid] {
                        HStack(spacing: 8) {
                            Circle()
                                .fill(colorForSeries(name: label, index: index))
                                .frame(width: 8, height: 8)
                            Text("\(label):")
                                .font(.inter(.caption))
                            Text("\(elo) ELO")
                                .font(.inter(.caption, weight: .bold))
                                .foregroundStyle(colorForSeries(name: label, index: index))
                        }
                    }
                }
            } else {
                Text("Dra fingret över grafen")
                    .font(.inter(.subheadline, weight: .semibold))
                    .foregroundStyle(AppColors.textSecondary)
                Text("Se exakt ELO-förändring vid varje matchtillfälle.")
                    .font(.inter(.caption))
                    .foregroundStyle(AppColors.textSecondary)
            }
        }
        .padding()
        .background(AppColors.surface)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func chartView(timeline: [ComparisonTimelinePoint]) -> some View {
        let domain = chartYDomain(timeline: timeline)

        return Chart {
            ForEach(playerIds, id: \.self) { pid in
                let name = pid == viewModel.currentPlayer?.id ? "Du" : (viewModel.players.first(where: { $0.id == pid })?.profileName ?? "Annan")
                let color = colorForSeries(name: name, index: playerIds.firstIndex(of: pid) ?? 0)

                ForEach(timeline) { point in
                    if let elo = point.elos[pid] {
                        LineMark(
                            x: .value("Match", point.id),
                            y: .value("ELO", elo),
                            series: .value("Spelare", name)
                        )
                        .interpolationMethod(.catmullRom)
                        .foregroundStyle(color)
                        .lineStyle(StrokeStyle(lineWidth: 3, lineCap: .round, lineJoin: .round))

                        PointMark(
                            x: .value("Match", point.id),
                            y: .value("ELO", elo)
                        )
                        .foregroundStyle(color)
                        .symbolSize(indexIsSelected(point.id) ? 100 : 40)
                    }
                }
            }

            if #available(iOS 17.0, *), let index = chartSelectionIndex {
                RuleMark(x: .value("Vald", index))
                    .foregroundStyle(AppColors.textSecondary.opacity(0.3))
                    .lineStyle(StrokeStyle(lineWidth: 1, dash: [5, 5]))
            }
        }
        .frame(height: 350)
        .chartYScale(domain: domain)
        .chartXSelection(value: $chartSelectionIndex)
        .chartXAxis {
            AxisMarks(values: .stride(by: 1)) { value in
                if let index = value.as(Int.self), index < timeline.count {
                    if index % max(1, timeline.count / 6) == 0 {
                        AxisGridLine()
                        AxisValueLabel {
                            Text(timeline[index].date, format: .dateTime.month().day())
                        }
                    }
                }
            }
        }
        .padding(.vertical)
    }

    private var legendView: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                ForEach(Array(playerIds.enumerated()), id: \.element) { index, pid in
                    let label = pid == viewModel.currentPlayer?.id ? "Du" : (viewModel.players.first(where: { $0.id == pid })?.profileName ?? "Annan")
                    HStack(spacing: 6) {
                        Circle()
                            .fill(colorForSeries(name: label, index: index))
                            .frame(width: 10, height: 10)
                        Text(label)
                            .font(.inter(.caption, weight: .bold))
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(AppColors.surface)
                    .clipShape(Capsule())
                    .padelSurfaceCard()
                }
            }
        }
    }

    @ViewBuilder
    private func matchDetailAt(point: ComparisonTimelinePoint) -> some View {
        if let match = viewModel.allMatches.first(where: { $0.id == point.matchId }) {
            VStack(alignment: .leading, spacing: 12) {
                Text("MATCH VID DETTA TILLFÄLLE")
                    .font(.inter(.caption2, weight: .black))
                    .foregroundStyle(AppColors.textSecondary)

                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text(match.teamAName)
                            .font(.inter(.subheadline, weight: .bold))
                        Spacer()
                        Text("\(match.teamAScore) – \(match.teamBScore)")
                            .font(.inter(.headline, weight: .black))
                            .foregroundStyle(AppColors.brandPrimary)
                        Spacer()
                        Text(match.teamBName)
                            .font(.inter(.subheadline, weight: .bold))
                            .multilineTextAlignment(.trailing)
                    }

                    Text(match.playedAt, style: .date)
                        .font(.inter(.caption))
                        .foregroundStyle(AppColors.textSecondary)
                }
                .padding()
                .background(AppColors.surface)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .padelSurfaceCard()
            }
            .padding(.top)
            .transition(.move(edge: .bottom).combined(with: .opacity))
        }
    }

    private func chartYDomain(timeline: [ComparisonTimelinePoint]) -> ClosedRange<Double> {
        let values = timeline.flatMap { $0.elos.values.map { Double($0) } }
        guard let minValue = values.min(), let maxValue = values.max() else {
            return 900...1100
        }
        let padding = max(10, (maxValue - minValue) * 0.15)
        return (minValue - padding)...(maxValue + padding)
    }

    private func colorForSeries(name: String, index: Int) -> Color {
        if name == "Du" { return AppColors.brandPrimary }
        return trendPalette[index % trendPalette.count]
    }

    private func indexIsSelected(_ id: Int) -> Bool {
        chartSelectionIndex == id
    }
}
