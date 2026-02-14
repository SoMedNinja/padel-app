import SwiftUI

struct MatchEditSheetView: View {
    let match: Match
    @EnvironmentObject private var viewModel: AppViewModel
    @Environment(\.dismiss) private var dismiss

    @State private var teamAScore: Int
    @State private var teamBScore: Int
    @State private var playedAt: Date
    @State private var teamAPlayer1Id: String?
    @State private var teamAPlayer2Id: String?
    @State private var teamBPlayer1Id: String?
    @State private var teamBPlayer2Id: String?

    init(match: Match) {
        self.match = match
        _teamAScore = State(initialValue: match.teamAScore)
        _teamBScore = State(initialValue: match.teamBScore)
        _playedAt = State(initialValue: match.playedAt)
        _teamAPlayer1Id = State(initialValue: match.teamAPlayerIds.indices.contains(0) ? match.teamAPlayerIds[0] : nil)
        _teamAPlayer2Id = State(initialValue: match.teamAPlayerIds.indices.contains(1) ? match.teamAPlayerIds[1] : nil)
        _teamBPlayer1Id = State(initialValue: match.teamBPlayerIds.indices.contains(0) ? match.teamBPlayerIds[0] : nil)
        _teamBPlayer2Id = State(initialValue: match.teamBPlayerIds.indices.contains(1) ? match.teamBPlayerIds[1] : nil)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Resultat") {
                    Stepper("Lag A: \(teamAScore)", value: $teamAScore, in: 0...99)
                    Stepper("Lag B: \(teamBScore)", value: $teamBScore, in: 0...99)
                    DatePicker("Spelad", selection: $playedAt)
                }

                Section("Spelare") {
                    playerPicker(title: "Lag A – spelare 1", selection: $teamAPlayer1Id)
                    playerPicker(title: "Lag A – spelare 2", selection: $teamAPlayer2Id)
                    playerPicker(title: "Lag B – spelare 1", selection: $teamBPlayer1Id)
                    playerPicker(title: "Lag B – spelare 2", selection: $teamBPlayer2Id)
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
                                teamAPlayerIds: [teamAPlayer1Id, teamAPlayer2Id],
                                teamBPlayerIds: [teamBPlayer1Id, teamBPlayer2Id]
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

    private func playerPicker(title: String, selection: Binding<String?>) -> some View {
        Picker(title, selection: selection) {
            Text("Ingen").tag(Optional<String>.none)
            Text("Gäst").tag(Optional("guest"))
            ForEach(viewModel.players) { player in
                Text(player.profileName).tag(Optional(player.id.uuidString))
            }
        }
    }
}
