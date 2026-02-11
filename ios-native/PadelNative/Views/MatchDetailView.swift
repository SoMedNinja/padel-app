import SwiftUI

struct MatchDetailView: View {
    let match: Match

    private let formatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateStyle = .full
        formatter.timeStyle = .short
        return formatter
    }()

    var body: some View {
        List {
            Section("Teams") {
                LabeledContent("Team A", value: match.teamAName)
                LabeledContent("Team B", value: match.teamBName)
            }

            Section("Result") {
                LabeledContent("Score", value: "\(match.teamAScore) - \(match.teamBScore)")
                LabeledContent("Played", value: formatter.string(from: match.playedAt))
            }

            Section("What this does") {
                Text("Note for non-coders: this screen matches the web app's single match detail route so users can inspect one game at a time.")
                    .foregroundStyle(.secondary)
            }
        }
        .navigationTitle("Match Details")
        .padelLiquidGlassChrome()
    }
}
