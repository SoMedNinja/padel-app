import SwiftUI

struct SingleGameView: View {
    @EnvironmentObject private var viewModel: AppViewModel

    @State private var teamAName = ""
    @State private var teamBName = ""
    @State private var teamAScore = 6
    @State private var teamBScore = 4
    @State private var scoreType = "sets"
    @State private var scoreTargetText = ""
    @State private var sourceTournamentIdText = ""
    @State private var sourceTournamentType = "standalone"
    @State private var teamAServesFirst = true
    @State private var isSubmitting = false

    var body: some View {
        NavigationStack {
            Form {
                Section("Teams") {
                    TextField("Team A", text: $teamAName)
                    TextField("Team B", text: $teamBName)
                }

                Section("Score") {
                    Stepper("Team A: \(teamAScore)", value: $teamAScore, in: 0...99)
                    Stepper("Team B: \(teamBScore)", value: $teamBScore, in: 0...99)
                }

                Section("Match metadata") {
                    Picker("Score type", selection: $scoreType) {
                        Text("Sets").tag("sets")
                        Text("Points").tag("points")
                    }

                    if scoreType == "points" {
                        TextField("Score target (optional)", text: $scoreTargetText)
                            .keyboardType(.numberPad)
                    }

                    TextField("Source tournament ID (optional UUID)", text: $sourceTournamentIdText)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()

                    TextField("Source tournament type", text: $sourceTournamentType)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()

                    Toggle("Team A serves first", isOn: $teamAServesFirst)
                }

                Section {
                    Button {
                        Task {
                            isSubmitting = true
                            defer { isSubmitting = false }
                            await viewModel.submitSingleGame(
                                teamAName: teamAName,
                                teamBName: teamBName,
                                teamAScore: teamAScore,
                                teamBScore: teamBScore,
                                scoreType: scoreType,
                                scoreTarget: Int(scoreTargetText),
                                sourceTournamentId: UUID(uuidString: sourceTournamentIdText.trimmingCharacters(in: .whitespacesAndNewlines)),
                                sourceTournamentType: sourceTournamentType,
                                teamAServesFirst: teamAServesFirst
                            )
                        }
                    } label: {
                        if isSubmitting {
                            ProgressView()
                                .frame(maxWidth: .infinity)
                        } else {
                            Text("Save Match")
                                .frame(maxWidth: .infinity)
                        }
                    }
                    .disabled(isSubmitting)
                }

                if let status = viewModel.statusMessage {
                    Section("Status") {
                        Text(status)
                            .foregroundStyle(.secondary)
                    }
                }

                Section("What this does") {
                    Text("Note for non-coders: this is the native equivalent of the web app's single-game form. It now also sends match metadata (like score mode, tournament source, and who serves first) so web history and stats stay accurate.")
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Single Game")
            .padelLiquidGlassChrome()
        }
    }
}
