import SwiftUI

struct SingleGameView: View {
    @EnvironmentObject private var viewModel: AppViewModel

    @State private var isOneVsOne = false
    @State private var teamAPlayer1Id: UUID?
    @State private var teamAPlayer2Id: UUID?
    @State private var teamBPlayer1Id: UUID?
    @State private var teamBPlayer2Id: UUID?
    @State private var teamAScore = 6
    @State private var teamBScore = 4
    @State private var scoreType = "sets"
    @State private var scoreTargetText = ""
    @State private var sourceTournamentIdText = ""
    @State private var sourceTournamentType = ""
    @State private var teamAServesFirst = true
    @State private var isSubmitting = false

    var body: some View {
        NavigationStack {
            Form {
                Section("Matchtyp") {
                    Toggle("1 mot 1", isOn: $isOneVsOne)
                    Text("Note for non-coders: när du slår på 1 mot 1 döljer appen den andra spelaren i varje lag.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }

                Section("Lag") {
                    playerPicker(title: "Lag A – spelare 1", selection: $teamAPlayer1Id)
                    if !isOneVsOne {
                        playerPicker(title: "Lag A – spelare 2 (valfri)", selection: $teamAPlayer2Id)
                    }

                    playerPicker(title: "Lag B – spelare 1", selection: $teamBPlayer1Id)
                    if !isOneVsOne {
                        playerPicker(title: "Lag B – spelare 2 (valfri)", selection: $teamBPlayer2Id)
                    }
                }

                Section("Resultat") {
                    Stepper("Lag A: \(teamAScore)", value: $teamAScore, in: 0...99)
                    Stepper("Lag B: \(teamBScore)", value: $teamBScore, in: 0...99)
                }

                Section("Matchmetadata") {
                    Picker("Poängtyp", selection: $scoreType) {
                        Text("Set").tag("sets")
                        Text("Poäng").tag("points")
                    }

                    if scoreType == "points" {
                        TextField("Poängmål (valfritt)", text: $scoreTargetText)
                            .keyboardType(.numberPad)
                    }

                    TextField("Turnerings-ID (valfritt UUID)", text: $sourceTournamentIdText)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()

                    TextField("Turneringstyp (valfritt)", text: $sourceTournamentType)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()

                    Toggle("Lag A servar först", isOn: $teamAServesFirst)
                }

                Section {
                    Button {
                        Task {
                            isSubmitting = true
                            defer { isSubmitting = false }

                            let teamAIds: [UUID?] = [teamAPlayer1Id, isOneVsOne ? nil : teamAPlayer2Id]
                            let teamBIds: [UUID?] = [teamBPlayer1Id, isOneVsOne ? nil : teamBPlayer2Id]

                            await viewModel.submitSingleGame(
                                teamAPlayerIds: teamAIds,
                                teamBPlayerIds: teamBIds,
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
                            ProgressView().frame(maxWidth: .infinity)
                        } else {
                            Text("Spara match").frame(maxWidth: .infinity)
                        }
                    }
                    .disabled(isSubmitting)
                }

                if let status = viewModel.statusMessage {
                    Section("Status") {
                        Text(status).foregroundStyle(.secondary)
                    }
                }
            }
            .navigationTitle("Singelmatch")
            .padelLiquidGlassChrome()
        }
    }

    private func playerPicker(title: String, selection: Binding<UUID?>) -> some View {
        Picker(title, selection: selection) {
            Text("Välj spelare").tag(Optional<UUID>.none)
            ForEach(viewModel.players) { player in
                Text(player.profileName).tag(Optional(player.id))
            }
        }
    }
}
