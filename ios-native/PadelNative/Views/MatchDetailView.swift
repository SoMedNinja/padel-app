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

            Section("Matchmetadata") {
                LabeledContent("Källa", value: match.sourceTournamentId == nil ? "Fristående match" : "Turneringsmatch")
                if let sourceType = match.sourceTournamentType, !sourceType.isEmpty {
                    LabeledContent("Källtyp", value: sourceType)
                }
                if let sourceId = match.sourceTournamentId {
                    LabeledContent("Turnering", value: viewModel.tournamentName(for: sourceId))
                    LabeledContent("Turnerings-ID", value: sourceId.uuidString)
                }
            }

            Section("ELO-förändring (estimat)") {
                let breakdown = viewModel.eloBreakdown(for: match)
                if breakdown.isEmpty {
                    Text("Ingen ELO-detalj finns för den här äldre matchen ännu.")
                        .foregroundStyle(.secondary)
                } else {
                    ForEach(breakdown) { row in
                        VStack(alignment: .leading, spacing: 2) {
                            HStack {
                                Text(row.playerName)
                                Spacer()
                                Text("\(row.delta >= 0 ? "+" : "")\(row.delta)")
                                    .foregroundStyle(row.delta >= 0 ? .green : .red)
                            }
                            Text("ELO före: \(row.estimatedBefore) → efter: \(row.estimatedAfter)")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
                Text("Note for non-coders: 'estimat' betyder att vi räknar ungefärlig ELO-förändring direkt i appen för att ge snabb förklaring även när äldre databasmatcher saknar komplett historik.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }

            if viewModel.canUseAdmin {
                Section("Adminverktyg") {
                    Stepper("Lag A: \(editTeamAScore)", value: $editTeamAScore, in: 0...99)
                    Stepper("Lag B: \(editTeamBScore)", value: $editTeamBScore, in: 0...99)

                    Button("Spara ändring") {
                        Task { await viewModel.updateMatchScores(match, teamAScore: editTeamAScore, teamBScore: editTeamBScore) }
                    }
                    .buttonStyle(.borderedProminent)
                }
            }

            if viewModel.canDeleteMatch(match) {
                Section("Ta bort match") {
                    Button("Radera match", role: .destructive) {
                        showDeleteConfirm = true
                    }
                    Text("Note for non-coders: precis som i webbappen kan skaparen ta bort sin egen match, medan admin kan ta bort alla.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }

            Section("Vad detta gör") {
                Text("Note for non-coders: admins kan ändra poäng, och både skapare/admin kan radera — samma behörighetslogik som i webbappen.")
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
