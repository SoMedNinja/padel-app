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
            List(viewModel.matches) { match in
                NavigationLink {
                    MatchDetailView(match: match)
                } label: {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("\(match.teamAName) vs \(match.teamBName)")
                            .font(.headline)
                        Text("Score: \(match.teamAScore) - \(match.teamBScore)")
                        Text(formatter.string(from: match.playedAt))
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    .padding(.vertical, 4)
                }
            }
            .navigationTitle("History")
            .refreshable {
                await viewModel.bootstrap()
            }
        }
    }
}
