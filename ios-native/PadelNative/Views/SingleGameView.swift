import SwiftUI

private enum SingleGameWizardStep: Int, CaseIterable {
    case teamSetup
    case opponentSetup
    case score
    case review

    var title: String {
        switch self {
        case .teamSetup: return "Steg 1: Ditt lag"
        case .opponentSetup: return "Steg 2: Motståndare"
        case .score: return "Steg 3: Resultat"
        case .review: return "Steg 4: Granska"
        }
    }
}

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
    @State private var wizardStep: SingleGameWizardStep = .teamSetup
    @State private var generatedRecap: SingleGameRecap?
    @State private var fairnessLabel: String?
    @State private var showSuccessState = false

    var body: some View {
        NavigationStack {
            Form {
                Section("Matchtyp") {
                    Toggle("1 mot 1", isOn: $isOneVsOne)
                    Text("Note for non-coders: guiden ändrar steg automatiskt, men djup-länkar med mode=1v1 eller mode=2v2 fungerar fortfarande och väljer rätt matchtyp direkt.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }

                Section("Wizard") {
                    Text(wizardStep.title)
                        .font(.headline)
                    ProgressView(value: Double(wizardStep.rawValue + 1), total: Double(SingleGameWizardStep.allCases.count))
                }

                switch wizardStep {
                case .teamSetup:
                    teamSetupSection
                case .opponentSetup:
                    opponentSetupSection
                case .score:
                    scoreSection
                case .review:
                    reviewSection
                }

                Section {
                    HStack {
                        Button("Tillbaka") {
                            previousStep()
                        }
                        .disabled(wizardStep == .teamSetup || isSubmitting)

                        Spacer()

                        Button(wizardStep == .review ? "Spara match" : "Nästa") {
                            if wizardStep == .review {
                                submitMatch()
                            } else {
                                nextStep()
                            }
                        }
                        .disabled(isSubmitting)
                    }
                }

                if showSuccessState {
                    Section("Klart 🎉") {
                        VStack(alignment: .leading, spacing: 8) {
                            Label("Match sparad", systemImage: "checkmark.seal.fill")
                                .foregroundStyle(.green)
                                .symbolEffect(.bounce, value: showSuccessState)
                            Text("Note for non-coders: den här lilla celebration-rutan visar att allt gick bra innan formuläret nollställs för nästa match.")
                                .font(.footnote)
                                .foregroundStyle(.secondary)
                        }
                    }
                }

                if let recap = generatedRecap {
                    Section("Recap") {
                        Text(recap.matchSummary)
                            .font(.subheadline)
                        Text(recap.eveningSummary)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)

                        if let shareImageURL = recapShareImageURL(for: recap) {
                            ShareLink(item: shareImageURL) {
                                Label("Dela recap som bild", systemImage: "photo.on.rectangle")
                            }
                        }

                        ShareLink(item: recap.sharePayload) {
                            Label("Dela recap som text", systemImage: "square.and.arrow.up")
                        }
                        Text("Note for non-coders: bilddelning känns mer native i iOS, medan textdelen är fallback om någon app bara tar emot text.")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                }

                if let status = viewModel.statusMessage {
                    Section("Status") {
                        Text(status).foregroundStyle(.secondary)
                    }
                }
            }
            .navigationTitle("Singelmatch")
            .onAppear {
                applyDeepLinkModeIfAvailable()
            }
            .padelLiquidGlassChrome()
        }
    }

    private func recapShareImageURL(for recap: SingleGameRecap) -> URL? {
        let lines = [recap.matchSummary, "", recap.eveningSummary]
        return try? ShareCardService.createShareImageFile(
            title: "Padel recap",
            bodyLines: lines,
            fileNamePrefix: "single-game-recap"
        )
    }

    private var teamSetupSection: some View {
        Section("Ditt lag") {
            playerPicker(title: "Lag A – spelare 1", selection: $teamAPlayer1Id)
            if !isOneVsOne {
                playerPicker(title: "Lag A – spelare 2 (valfri)", selection: $teamAPlayer2Id)
            }
            suggestionButtonSection
        }
    }

    private var opponentSetupSection: some View {
        Section("Motståndare") {
            playerPicker(title: "Lag B – spelare 1", selection: $teamBPlayer1Id)
            if !isOneVsOne {
                playerPicker(title: "Lag B – spelare 2 (valfri)", selection: $teamBPlayer2Id)
            }
            if let fairnessLabel {
                Text(fairnessLabel)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private var scoreSection: some View {
        Section("Resultat") {
            Stepper("Lag A: \(teamAScore)", value: $teamAScore, in: 0...99)
            Stepper("Lag B: \(teamBScore)", value: $teamBScore, in: 0...99)

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
    }

    private var reviewSection: some View {
        Section("Granska match") {
            Text("Lag A: \(teamText(primary: teamAPlayer1Id, secondary: isOneVsOne ? nil : teamAPlayer2Id))")
            Text("Lag B: \(teamText(primary: teamBPlayer1Id, secondary: isOneVsOne ? nil : teamBPlayer2Id))")
            Text("Resultat: \(teamAScore)-\(teamBScore)")
            Text("Poängtyp: \(scoreType == "points" ? "Poäng" : "Set")")
            Text("Note for non-coders: review-steget är bara en sista kontroll innan sparning, så du kan undvika felklick.")
                .font(.footnote)
                .foregroundStyle(.secondary)
        }
    }

    private var suggestionButtonSection: some View {
        Group {
            Button("Föreslå matchup") {
                applySuggestedMatchup()
            }
            Text("Note for non-coders: förslaget försöker hitta jämna lag och samtidigt rotera vilka som spelar med/ mot varandra, ungefär som web-appens fairness-logik.")
                .font(.footnote)
                .foregroundStyle(.secondary)
        }
    }

    private func nextStep() {
        guard let next = SingleGameWizardStep(rawValue: wizardStep.rawValue + 1) else { return }
        wizardStep = next
    }

    private func previousStep() {
        guard let previous = SingleGameWizardStep(rawValue: wizardStep.rawValue - 1) else { return }
        wizardStep = previous
    }

    private func applyDeepLinkModeIfAvailable() {
        if let mode = viewModel.consumeSingleGameMode() {
            isOneVsOne = mode == "1v1"
        }
    }

    private func applySuggestedMatchup() {
        guard let suggestion = viewModel.suggestSingleGameMatchup(isOneVsOne: isOneVsOne) else { return }
        teamAPlayer1Id = suggestion.teamAPlayerIds.first ?? nil
        teamAPlayer2Id = suggestion.teamAPlayerIds.dropFirst().first ?? nil
        teamBPlayer1Id = suggestion.teamBPlayerIds.first ?? nil
        teamBPlayer2Id = suggestion.teamBPlayerIds.dropFirst().first ?? nil
        fairnessLabel = "Fairness \(suggestion.fairness)% • Vinstchans Lag A \(Int(round(suggestion.winProbability * 100)))%. \(suggestion.explanation)"
    }

    private func submitMatch() {
        Task {
            isSubmitting = true
            defer { isSubmitting = false }

            let teamAIds: [UUID?] = [teamAPlayer1Id, isOneVsOne ? nil : teamAPlayer2Id]
            let teamBIds: [UUID?] = [teamBPlayer1Id, isOneVsOne ? nil : teamBPlayer2Id]

            let recap = await viewModel.submitSingleGame(
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

            guard let recap else { return }
            generatedRecap = recap
            withAnimation(.spring) {
                showSuccessState = true
            }

            try? await Task.sleep(nanoseconds: 1_400_000_000)
            withAnimation(.easeInOut) {
                showSuccessState = false
            }
            resetFormForNextEntry(keepMatchType: true)
        }
    }

    private func resetFormForNextEntry(keepMatchType: Bool) {
        let preserveOneVsOne = isOneVsOne
        teamAPlayer1Id = nil
        teamAPlayer2Id = nil
        teamBPlayer1Id = nil
        teamBPlayer2Id = nil
        teamAScore = 6
        teamBScore = 4
        scoreType = "sets"
        scoreTargetText = ""
        sourceTournamentIdText = ""
        sourceTournamentType = ""
        teamAServesFirst = true
        fairnessLabel = nil
        wizardStep = .teamSetup
        if keepMatchType {
            isOneVsOne = preserveOneVsOne
        }
    }

    private func teamText(primary: UUID?, secondary: UUID?) -> String {
        let ids = [primary, secondary].compactMap { $0 }
        guard ids.isEmpty == false else { return "Ej valt" }
        let names = ids.compactMap { id in
            viewModel.players.first(where: { $0.id == id })?.profileName
        }
        return names.joined(separator: " & ")
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
