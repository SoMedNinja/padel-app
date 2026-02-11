import SwiftUI

struct MatchDetailView: View {
    let match: Match
    @EnvironmentObject private var viewModel: AppViewModel

    @State private var editTeamAScore = 0
    @State private var editTeamBScore = 0
    @State private var showDeleteConfirm = false

    private let formatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateStyle = .full
        formatter.timeStyle = .short
        return formatter
    }()

    var body: some View {
        List {
            Section("Lag") {
                LabeledContent("Lag A", value: match.teamAName)
                LabeledContent("Lag B", value: match.teamBName)
            }

            Section("Resultat") {
                LabeledContent("Poäng", value: "\(match.teamAScore) - \(match.teamBScore)")
                LabeledContent("Typ", value: match.scoreType == "points" ? "Poäng" : "Set")
                if let target = match.scoreTarget {
                    LabeledContent("Mål", value: "\(target)")
                }
                LabeledContent("Spelad", value: formatter.string(from: match.playedAt))
            }

            if viewModel.canUseAdmin {
                Section("Adminverktyg") {
                    Stepper("Lag A: \(editTeamAScore)", value: $editTeamAScore, in: 0...99)
                    Stepper("Lag B: \(editTeamBScore)", value: $editTeamBScore, in: 0...99)

                    Button("Spara ändring") {
                        Task { await viewModel.updateMatchScores(match, teamAScore: editTeamAScore, teamBScore: editTeamBScore) }
                    }
                    .buttonStyle(.borderedProminent)

                    Button("Radera match", role: .destructive) {
                        showDeleteConfirm = true
                    }
                }
            }

            Section("Vad detta gör") {
                Text("Note for non-coders: admins kan ändra/radera direkt här så iOS-flödet matchar webbens historikverktyg.")
                    .foregroundStyle(.secondary)
            }
        }
        .onAppear {
            editTeamAScore = match.teamAScore
            editTeamBScore = match.teamBScore
        }
        .alert("Radera match?", isPresented: $showDeleteConfirm) {
            Button("Radera", role: .destructive) {
                Task { await viewModel.deleteMatch(match) }
            }
            Button("Avbryt", role: .cancel) { }
        } message: {
            Text("Det här tar bort matchen permanent från databasen.")
        }
        .navigationTitle("Matchdetaljer")
        .padelLiquidGlassChrome()
    }
}
