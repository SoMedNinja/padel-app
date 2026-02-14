import SwiftUI

struct MatchEditSheetView: View {
    let match: Match
    @EnvironmentObject private var viewModel: AppViewModel
    @Environment(\.dismiss) private var dismiss

    @State private var teamAScore: Int
    @State private var teamBScore: Int
    @State private var playedAt: Date

    init(match: Match) {
        self.match = match
        _teamAScore = State(initialValue: match.teamAScore)
        _teamBScore = State(initialValue: match.teamBScore)
        _playedAt = State(initialValue: match.playedAt)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Resultat") {
                    Stepper("Lag A: \(teamAScore)", value: $teamAScore, in: 0...99)
                    Stepper("Lag B: \(teamBScore)", value: $teamBScore, in: 0...99)
                    DatePicker("Spelad", selection: $playedAt)
                }

                Section {
                    // Note for non-coders: this keeps edit simple in iOS and matches the quick-edit pattern from the web app.
                    Button("Spara ändringar") {
                        Task {
                            await viewModel.updateMatch(
                                match,
                                playedAt: playedAt,
                                teamAScore: teamAScore,
                                teamBScore: teamBScore,
                                scoreType: match.scoreType ?? "sets",
                                scoreTarget: match.scoreTarget,
                                teamAPlayerIds: match.teamAPlayerIds,
                                teamBPlayerIds: match.teamBPlayerIds
                            )
                            dismiss()
                        }
                    }
                    .frame(maxWidth: .infinity)
                }
            }
            .navigationTitle("Redigera match")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Stäng") { dismiss() }
                }
            }
        }
    }
}
