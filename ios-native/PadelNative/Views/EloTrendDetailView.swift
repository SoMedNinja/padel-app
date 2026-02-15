import SwiftUI
import Charts

struct EloTrendDetailView: View {
    @EnvironmentObject private var viewModel: AppViewModel

    let playerIds: [UUID]
    let filter: DashboardMatchFilter

    @State private var chartSelectionIndex: Int?
    @State private var timeRange: TrendChartTimeRange = .days90
    @State private var primaryMetric: TrendChartMetric = .elo
    @State private var secondaryMetric: TrendChartMetric = .winRate
    private let trendPalette: [Color] = [.blue, .green, .orange, .purple, .pink, .teal, .indigo, .brown]

    var body: some View {
        VStack(spacing: 0) {
            header

            let state = viewModel.comparisonChartDataset(playerIds: playerIds, filter: filter, timeRange: timeRange)

            switch state {
            case .loading:
                ProgressView("Laddar trenddata…")
                    .frame(maxHeight: .infinity)
            case .error(let message):
                contentState(icon: "exclamationmark.triangle", title: "Kunde inte ladda trend", message: message)
            case .empty(let message):
                contentState(icon: "chart.line.uptrend.xyaxis", title: "För lite data för analys", message: message)
            case .ready(let dataset):
                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        controls
                        stickyTooltip(dataset: dataset)
                        trendChart(dataset: dataset)
                        legendView(playerIds: dataset.playerIds)

                        if let selected = chartSelectionIndex,
                           let point = dataset.points.first(where: { $0.id == selected }) {
                            matchDetailAt(point: point)
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
            Text("Tips: välj tidsintervall och två mått för att jämföra utvecklingen.")
                .font(.inter(.caption2))
                .foregroundStyle(AppColors.textSecondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal)
        .padding(.top, 10)
    }

    // Note for non-coders:
    // You can choose a time window and two metrics so the same chart answers more questions at once.
    private var controls: some View {
        VStack(spacing: 10) {
            Picker("Tidsintervall", selection: $timeRange) {
                ForEach(TrendChartTimeRange.allCases) { range in
                    Text(range.title).tag(range)
                }
            }
            .pickerStyle(.segmented)

            HStack {
                Picker("Primär", selection: $primaryMetric) {
                    ForEach(TrendChartMetric.allCases) { metric in
                        Text(metric.title).tag(metric)
                    }
                }
                Picker("Sekundär", selection: $secondaryMetric) {
                    ForEach(TrendChartMetric.allCases) { metric in
                        Text(metric.title).tag(metric)
                    }
                }
            }
            .pickerStyle(.menu)
            .onChange(of: primaryMetric) { _, newValue in
                if secondaryMetric == newValue { secondaryMetric = newValue == .elo ? .winRate : .elo }
            }
            .onChange(of: secondaryMetric) { _, newValue in
                if primaryMetric == newValue { primaryMetric = newValue == .elo ? .winRate : .elo }
            }
        }
    }

    private func stickyTooltip(dataset: ComparisonChartDataset) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            if let selected = chartSelectionIndex,
               let point = dataset.points.first(where: { $0.id == selected }) {
                Text(point.date, format: .dateTime.day().month().year().hour().minute())
                    .font(.inter(.subheadline, weight: .bold))
                ForEach(Array(dataset.playerIds.enumerated()), id: \.element) { index, pid in
                    let label = viewModel.chartDisplayName(for: pid)
                    if let elo = point.elos[pid] {
                        Text("\(label): \(elo) ELO")
                            .font(.inter(.caption))
                            .foregroundStyle(colorForSeries(name: label, index: index))
                    }
                }
                if let currentId = viewModel.currentPlayer?.id, let rate = point.winRates[currentId] {
                    Text("Du: \(rate, format: .number.precision(.fractionLength(1)))% win rate")
                        .font(.inter(.caption))
                        .foregroundStyle(.mint)
                }
            } else {
                Text("Dra fingret över grafen. Tooltipen stannar kvar (sticky) tills du rensar markören.")
                    .font(.inter(.caption))
                    .foregroundStyle(AppColors.textSecondary)
            }
        }
        .padding()
        .background(AppColors.surface)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func trendChart(dataset: ComparisonChartDataset) -> some View {
        let eloDomain = viewModel.eloDomain(for: dataset.points, players: dataset.playerIds)

        return VStack(alignment: .leading, spacing: 8) {
            Chart {
            if primaryMetric == .elo || secondaryMetric == .elo {
                ForEach(dataset.playerIds, id: \.self) { pid in
                    let label = viewModel.chartDisplayName(for: pid)
                    let color = colorForSeries(name: label, index: dataset.playerIds.firstIndex(of: pid) ?? 0)
                    ForEach(dataset.points) { point in
                        if let elo = point.elos[pid] {
                            LineMark(x: .value("Match", point.id), y: .value("ELO", elo), series: .value("Spelare", label))
                                .interpolationMethod(.catmullRom)
                                .foregroundStyle(color)
                                .lineStyle(.init(lineWidth: 3, lineCap: .round, lineJoin: .round))
                        }
                    }
                }
            }

            if primaryMetric == .winRate || secondaryMetric == .winRate,
               let currentId = viewModel.currentPlayer?.id {
                ForEach(dataset.points) { point in
                    if let rate = point.winRates[currentId] {
                        LineMark(x: .value("Match", point.id), y: .value("Win rate", scaledWinRate(rate, domain: eloDomain)))
                            .foregroundStyle(.mint)
                            .lineStyle(.init(lineWidth: 2, dash: [6, 4]))
                    }
                }
            }

            if let selected = chartSelectionIndex {
                RuleMark(x: .value("Vald", selected))
                    .foregroundStyle(AppColors.textSecondary.opacity(0.3))
                    .lineStyle(StrokeStyle(lineWidth: 1, dash: [5, 5]))
            }
            }
            .frame(height: 350)
            .chartYScale(domain: eloDomain)
            .chartXSelection(value: $chartSelectionIndex)
            .chartXAxis {
                AxisMarks(values: .stride(by: 1)) { value in
                    if let index = value.as(Int.self),
                       let point = dataset.points.first(where: { $0.id == index }),
                       index % max(1, dataset.points.count / 6) == 0 {
                        AxisGridLine()
                        AxisValueLabel {
                            Text(point.date, format: .dateTime.month().day())
                        }
                    }
                }
            }
            .padding(.vertical)

            Button("Rensa markör") { chartSelectionIndex = nil }
                .font(.caption)
        }
    }

    private func legendView(playerIds: [UUID]) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                ForEach(Array(playerIds.enumerated()), id: \.element) { index, pid in
                    let label = viewModel.chartDisplayName(for: pid)
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

                if primaryMetric == .winRate || secondaryMetric == .winRate {
                    Label("Win rate", systemImage: "circle.dashed")
                        .font(.inter(.caption, weight: .bold))
                        .foregroundStyle(.mint)
                }
            }
        }
    }

    private func contentState(icon: String, title: String, message: String) -> some View {
        VStack(spacing: 14) {
            Image(systemName: icon)
                .font(.system(size: 52))
                .foregroundStyle(AppColors.textSecondary.opacity(0.35))
            Text(title)
                .font(.inter(.headline))
            Text(message)
                .font(.inter(.subheadline))
                .foregroundStyle(AppColors.textSecondary)
                .multilineTextAlignment(.center)
        }
        .padding(40)
        .frame(maxHeight: .infinity)
    }

    @ViewBuilder
    private func matchDetailAt(point: ComparisonMetricTimelinePoint) -> some View {
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
        }
    }

    private func scaledWinRate(_ rate: Double, domain: ClosedRange<Double>) -> Double {
        domain.lowerBound + ((rate / 100) * (domain.upperBound - domain.lowerBound))
    }

    private func colorForSeries(name: String, index: Int) -> Color {
        if name == "Du" { return AppColors.brandPrimary }
        return trendPalette[index % trendPalette.count]
    }
}
