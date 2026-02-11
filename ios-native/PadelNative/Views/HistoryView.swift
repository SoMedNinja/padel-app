import SwiftUI

struct HistoryView: View {
    @EnvironmentObject private var viewModel: AppViewModel

    private let formatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter
    }()

    var body: some View {
        NavigationStack {
            List {
                Section("Filter") {
                    Picker("Matchfilter", selection: $viewModel.selectedHistoryFilter) {
                        ForEach(DashboardMatchFilter.allCases) { filter in
                            Text(filter.title).tag(filter)
                        }
                    }
                    .pickerStyle(.segmented)
                    Text("Note for non-coders: filtret ändrar vilka matcher du ser, precis som i webbappen.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }

                ForEach(filteredMatches) { match in
                    NavigationLink {
                        MatchDetailView(match: match)
                    } label: {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("\(match.teamAName) vs \(match.teamBName)")
                                .font(.headline)
                            Text(scoreLabel(match))
                            Text(formatter.string(from: match.playedAt))
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        .padding(.vertical, 4)
                    }
                }
            }
            .navigationTitle("Historik")
            .padelLiquidGlassChrome()
            .refreshable {
                await viewModel.bootstrap()
            }
        }
    }

    private var filteredMatches: [Match] {
        switch viewModel.selectedHistoryFilter {
        case .all: return viewModel.matches
        case .short: return viewModel.matches.filter { ($0.scoreType ?? "sets") == "sets" && max($0.teamAScore, $0.teamBScore) <= 3 }
        case .long: return viewModel.matches.filter { ($0.scoreType ?? "sets") == "sets" && max($0.teamAScore, $0.teamBScore) >= 6 }
        case .tournaments: return viewModel.matches.filter { $0.sourceTournamentId != nil }
        case .last7:
            guard let cutoff = Calendar.current.date(byAdding: .day, value: -7, to: .now) else { return viewModel.matches }
            return viewModel.matches.filter { $0.playedAt >= cutoff }
        case .last30:
            guard let cutoff = Calendar.current.date(byAdding: .day, value: -30, to: .now) else { return viewModel.matches }
            return viewModel.matches.filter { $0.playedAt >= cutoff }
        }
    }

    private func scoreLabel(_ match: Match) -> String {
        let scoreType = match.scoreType ?? "sets"
        if scoreType == "points" {
            let target = match.scoreTarget.map { " (till \($0))" } ?? ""
            return "Poäng: \(match.teamAScore)-\(match.teamBScore)\(target)"
        }
        return "Set: \(match.teamAScore)-\(match.teamBScore)"
    }
}
