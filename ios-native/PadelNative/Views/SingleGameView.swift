import SwiftUI

private enum SingleGameWizardStep: Int, CaseIterable {
    case teamSetup
    case opponentSetup
    case score
    case review
    case matchmaker

    var title: String {
        switch self {
        case .teamSetup: return "Steg 1: Ditt lag"
        case .opponentSetup: return "Steg 2: Motståndare"
        case .score: return "Steg 3: Resultat"
        case .review: return "Steg 4: Granska"
        case .matchmaker: return "Matchmaker"
        }
    }
}

struct SingleGameView: View {
    @EnvironmentObject private var viewModel: AppViewModel

    @State private var isOneVsOne = false
    @State private var teamAPlayer1Id: String?
    @State private var teamAPlayer2Id: String?
    @State private var teamBPlayer1Id: String?
    @State private var teamBPlayer2Id: String?
    @State private var teamAScore = 6
    @State private var teamBScore = 4
    @State private var showExtraScores = false
    @State private var scoreType = "sets"
    @State private var scoreTargetText = ""
    @State private var selectedSourceTournamentId: UUID?
    @State private var sourceTournamentType = ""
    @State private var teamAServesFirst = true
    @State private var playedAt = Date()
    @State private var isSubmitting = false
    @State private var wizardStep: SingleGameWizardStep = .teamSetup
    @State private var generatedRecap: SingleGameRecap?
    @State private var fairnessLabel: String?
    @State private var showSuccessState = false
    @State private var matchmakerPool: Set<UUID> = []

    @State private var playerSearchText = ""
    @State private var showGuestDialog = false
    @State private var newGuestName = ""
    @State private var activeSelectionBinding: Binding<String?>?

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
                case .matchmaker:
                    matchmakerSection
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

                if showSuccessState, let recap = generatedRecap {
                    Section("Klart 🎉") {
                        MatchSuccessCeremonyView(recap: recap, players: viewModel.players)
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
            .onChange(of: selectedSourceTournamentId) { _, newValue in
                guard let newValue,
                      let selectedTournament = viewModel.tournaments.first(where: { $0.id == newValue }) else { return }
                sourceTournamentType = selectedTournament.tournamentType
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
            playerSelectorRow(title: "Lag A – spelare 1", selection: $teamAPlayer1Id)
            if !isOneVsOne {
                playerSelectorRow(title: "Lag A – spelare 2 (valfri)", selection: $teamAPlayer2Id)
            }

            DatePicker("Datum & tid", selection: $playedAt)
                .font(.subheadline)

            HStack {
                Button("Föreslå match") {
                    applySuggestedMatchup()
                }
                Spacer()
                Button("Matchmaker") {
                    wizardStep = .matchmaker
                }
                .buttonStyle(.bordered)
            }
        }
    }

    private var opponentSetupSection: some View {
        Section("Motståndare") {
            playerSelectorRow(title: "Lag B – spelare 1", selection: $teamBPlayer1Id)
            if !isOneVsOne {
                playerSelectorRow(title: "Lag B – spelare 2 (valfri)", selection: $teamBPlayer2Id)
            }
            if let fairnessLabel {
                Text(fairnessLabel.replacingOccurrences(of: "Fairness", with: "Rättvisa"))
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private var scoreSection: some View {
        Section("Resultat") {
            VStack(alignment: .leading, spacing: 20) {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Lag A").font(.caption.bold()).foregroundStyle(.secondary)
                    scoreButtonGrid(selection: $teamAScore)
                }

                Divider()

                VStack(alignment: .trailing, spacing: 8) {
                    Text("Lag B").font(.caption.bold()).foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity, alignment: .trailing)
                    scoreButtonGrid(selection: $teamBScore)
                }

                if let (fairness, prob) = currentMatchFairnessAndProb {
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Rättvisa: \(fairness)%")
                            ProgressView(value: Double(fairness), total: 100)
                                .tint(fairness > 70 ? .green : (fairness > 40 ? .orange : .red))
                        }
                        Spacer()
                        VStack(alignment: .trailing, spacing: 2) {
                            Text("Vinstchans Lag A: \(Int(round(prob * 100)))%")
                            ProgressView(value: prob, total: 1.0)
                        }
                    }
                    .font(.caption2.bold())
                    .padding(10)
                    .background(Color.accentColor.opacity(0.05))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }
            }

            Picker("Poängtyp", selection: $scoreType) {
                Text("Set").tag("sets")
                Text("Poäng").tag("points")
            }

            if scoreType == "points" {
                TextField("Poängmål (valfritt)", text: $scoreTargetText)
                    .keyboardType(.numberPad)
            }

            Picker("Turnering (valfritt)", selection: $selectedSourceTournamentId) {
                Text("Ingen turnering").tag(Optional<UUID>.none)
                ForEach(viewModel.tournaments) { tournament in
                    Text(tournament.name).tag(Optional(tournament.id))
                }
            }

            TextField("Turneringstyp (t.ex. mexicano)", text: $sourceTournamentType)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()

            Text("Note for non-coders: turneringsväljaren hämtar riktiga turneringar från databasen så matchen länkas korrekt utan att skriva UUID manuellt.")
                .font(.footnote)
                .foregroundStyle(.secondary)

            Toggle("Lag A servar först", isOn: $teamAServesFirst)
        }
    }

    private var reviewSection: some View {
        Section("Granska match") {
            Text("Lag A: \(teamText(primary: teamAPlayer1Id, secondary: isOneVsOne ? nil : teamAPlayer2Id))")
            Text("Lag B: \(teamText(primary: teamBPlayer1Id, secondary: isOneVsOne ? nil : teamBPlayer2Id))")
            Text("Resultat: \(teamAScore)-\(teamBScore)")
            Text("Poängtyp: \(scoreType == "points" ? "Poäng" : "Set")")
            Text("Detta är en sista kontroll innan matchen sparas i databasen.")
                .font(.footnote)
                .foregroundStyle(.secondary)
        }
    }

    private var matchmakerSection: some View {
        Group {
            Section("Välj spelare (4–8)") {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 10) {
                        ForEach(viewModel.players) { player in
                            Button {
                                if matchmakerPool.contains(player.id) {
                                    matchmakerPool.remove(player.id)
                                } else if matchmakerPool.count < 8 {
                                    matchmakerPool.insert(player.id)
                                }
                            } label: {
                                VStack(spacing: 6) {
                                    playerAvatar(player)
                                    Text(player.profileName)
                                        .font(.caption)
                                }
                                .frame(width: 84, height: 92)
                                .background(tileBackground(isSelected: matchmakerPool.contains(player.id)))
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }

                HStack(spacing: 12) {
                    Button("Balansera lag") {
                        viewModel.generateBalancedMatch(poolIds: Array(matchmakerPool))
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(matchmakerPool.count != 4)

                    Button("Skapa rotation") {
                        viewModel.generateRotation(poolIds: Array(matchmakerPool))
                    }
                    .buttonStyle(.bordered)
                    .disabled(matchmakerPool.count < 4)
                }
            }

            if let rotation = viewModel.currentRotation {
                ForEach(rotation.rounds) { round in
                    Section {
                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                Text("Lag A: \(rotationTeamText(ids: round.teamA))")
                                Spacer()
                                Text("VS")
                                    .font(.caption.bold())
                                    .foregroundStyle(.secondary)
                                Spacer()
                                Text("Lag B: \(rotationTeamText(ids: round.teamB))")
                            }
                            .font(.subheadline)

                            if !round.rest.isEmpty {
                                Text("Vilar: \(rotationTeamText(ids: round.rest))")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }

                            Button("Starta denna match") {
                                startRotationMatch(round: round)
                            }
                            .buttonStyle(.bordered)
                        }
                    } header: {
                        HStack {
                            Text("Runda \(round.roundNumber)")
                            Spacer()
                            Text("Rättvisa: \(round.fairness)%")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
        }
    }

    private func rotationTeamText(ids: [UUID]) -> String {
        ids.compactMap { id in viewModel.players.first(where: { $0.id == id })?.profileName }.joined(separator: " & ")
    }

    private func startRotationMatch(round: RotationRound) {
        // Note for non-coders: player ids are stored as text in this screen,
        // so we convert each UUID value to a string before saving it.
        teamAPlayer1Id = round.teamA.first?.uuidString
        teamAPlayer2Id = round.teamA.dropFirst().first?.uuidString
        teamBPlayer1Id = round.teamB.first?.uuidString
        teamBPlayer2Id = round.teamB.dropFirst().first?.uuidString
        wizardStep = .score
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

    private var currentMatchFairnessAndProb: (fairness: Int, prob: Double)? {
        let aIds = [teamAPlayer1Id, teamAPlayer2Id].compactMap { $0.flatMap { UUID(uuidString: $0) } }
        let bIds = [teamBPlayer1Id, teamBPlayer2Id].compactMap { $0.flatMap { UUID(uuidString: $0) } }
        guard !aIds.isEmpty, !bIds.isEmpty else { return nil }

        let aElo = aIds.reduce(0.0) { $0 + Double(viewModel.playerBadgeStats[$1]?.currentElo ?? 1000) } / Double(aIds.count)
        let bElo = bIds.reduce(0.0) { $0 + Double(viewModel.playerBadgeStats[$1]?.currentElo ?? 1000) } / Double(bIds.count)

        let prob = EloService.getWinProbability(rating: aElo, opponentRating: bElo)
        let fairness = Int(round((1 - abs(0.5 - prob) * 2) * 100))
        return (fairness, prob)
    }

    private func applySuggestedMatchup() {
        guard let suggestion = viewModel.suggestSingleGameMatchup(isOneVsOne: isOneVsOne) else { return }
        teamAPlayer1Id = suggestion.teamAPlayerIds.first??.uuidString
        teamAPlayer2Id = suggestion.teamAPlayerIds.dropFirst().first??.uuidString
        teamBPlayer1Id = suggestion.teamBPlayerIds.first??.uuidString
        teamBPlayer2Id = suggestion.teamBPlayerIds.dropFirst().first??.uuidString
        fairnessLabel = "Fairness \(suggestion.fairness)% • Vinstchans Lag A \(Int(round(suggestion.winProbability * 100)))%. \(suggestion.explanation)"
    }

    private func submitMatch() {
        Task {
            isSubmitting = true
            defer { isSubmitting = false }

            let teamAIds: [String?] = [teamAPlayer1Id, isOneVsOne ? nil : teamAPlayer2Id]
            let teamBIds: [String?] = [teamBPlayer1Id, isOneVsOne ? nil : teamBPlayer2Id]

            let recap = await viewModel.submitSingleGame(
                teamAPlayerIds: teamAIds,
                teamBPlayerIds: teamBIds,
                teamAScore: teamAScore,
                teamBScore: teamBScore,
                scoreType: scoreType,
                scoreTarget: Int(scoreTargetText),
                sourceTournamentId: selectedSourceTournamentId,
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
        playedAt = Date()
        scoreType = "sets"
        scoreTargetText = ""
        selectedSourceTournamentId = nil
        sourceTournamentType = ""
        teamAServesFirst = true
        fairnessLabel = nil
        wizardStep = .teamSetup
        if keepMatchType {
            isOneVsOne = preserveOneVsOne
        }
    }

    private func teamText(primary: String?, secondary: String?) -> String {
        let ids = [primary, secondary].compactMap { $0 }
        guard ids.isEmpty == false else { return "Ej valt" }
        let names = ids.map { id in
            if let uuid = UUID(uuidString: id), let p = viewModel.players.first(where: { $0.id == uuid }) {
                return p.profileName
            }
            if id.hasPrefix("name:") { return String(id.dropFirst(5)) }
            if id == "guest" { return "Gäst" }
            return "Okänd"
        }
        return names.joined(separator: " & ")
    }

    private func playerSelectorRow(title: String, selection: Binding<String?>) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.subheadline.weight(.semibold))

            TextField("Sök spelare...", text: $playerSearchText)
                .textFieldStyle(.roundedBorder)
                .controlSize(.small)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 10) {
                    Button {
                        selection.wrappedValue = nil
                    } label: {
                        VStack(spacing: 6) {
                            Image(systemName: "person.crop.circle.badge.xmark")
                                .font(.title2)
                            Text("Ingen")
                                .font(.caption)
                        }
                        .frame(width: 76, height: 84)
                        .background(tileBackground(isSelected: selection.wrappedValue == nil))
                    }
                    .buttonStyle(.plain)

                    Button {
                        selection.wrappedValue = "guest"
                    } label: {
                        VStack(spacing: 6) {
                            Image(systemName: "person.badge.plus")
                                .font(.title2)
                            Text("Gäst")
                                .font(.caption)
                        }
                        .frame(width: 76, height: 84)
                        .background(tileBackground(isSelected: selection.wrappedValue == "guest"))
                    }
                    .buttonStyle(.plain)

                    Button {
                        activeSelectionBinding = selection
                        newGuestName = ""
                        showGuestDialog = true
                    } label: {
                        VStack(spacing: 6) {
                            Image(systemName: "character.cursor.ibeam")
                                .font(.title2)
                            Text("Namngiven")
                                .font(.caption)
                        }
                        .frame(width: 76, height: 84)
                        .background(tileBackground(isSelected: selection.wrappedValue?.hasPrefix("name:") == true))
                    }
                    .buttonStyle(.plain)

                    let filteredPlayers = viewModel.players.filter {
                        playerSearchText.isEmpty || $0.profileName.localizedCaseInsensitiveContains(playerSearchText) || $0.fullName.localizedCaseInsensitiveContains(playerSearchText)
                    }

                    ForEach(filteredPlayers) { player in
                        Button {
                            selection.wrappedValue = player.id.uuidString
                        } label: {
                            VStack(spacing: 6) {
                                playerAvatar(player)
                                Text(player.profileName)
                                    .font(.caption)
                                    .lineLimit(2)
                                    .multilineTextAlignment(.center)
                            }
                            .frame(width: 84, height: 92)
                            .background(tileBackground(isSelected: selection.wrappedValue == player.id.uuidString))
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
        .alert("Namngiven gäst", isPresented: $showGuestDialog) {
            TextField("Namn", text: $newGuestName)
            Button("Avbryt", role: .cancel) { }
            Button("Lägg till") {
                if !newGuestName.isEmpty {
                    activeSelectionBinding?.wrappedValue = "name:\(newGuestName)"
                }
            }
        } message: {
            Text("Ange namn på gästspelaren.")
        }
    }

    private func playerAvatar(_ player: Player) -> some View {
        Group {
            if let avatarURL = player.avatarURL,
               let url = URL(string: avatarURL),
               url.scheme?.hasPrefix("http") == true {
                AsyncImage(url: url) { image in
                    image.resizable().scaledToFill()
                } placeholder: {
                    Image(systemName: "person.crop.circle")
                        .font(.title2)
                        .foregroundStyle(.secondary)
                }
            } else {
                Image(systemName: "person.crop.circle.fill")
                    .font(.title2)
                    .foregroundStyle(Color.accentColor)
            }
        }
        .frame(width: 42, height: 42)
        .clipShape(Circle())
    }

    private func tileBackground(isSelected: Bool) -> some View {
        RoundedRectangle(cornerRadius: 12, style: .continuous)
            .fill(isSelected ? Color.accentColor.opacity(0.2) : Color(.secondarySystemBackground))
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .stroke(isSelected ? Color.accentColor : Color.clear, lineWidth: 1)
            )
    }

    @ViewBuilder
    private func scoreButtonGrid(selection: Binding<Int>) -> some View {
        let scores = [0, 1, 2, 3, 4, 5, 6, 7]
        let extras = [8, 9, 10, 11, 12]

        VStack(spacing: 8) {
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 44))], spacing: 8) {
                ForEach(scores, id: \.self) { score in
                    Button {
                        selection.wrappedValue = score
                    } label: {
                        Text("\(score)")
                            .font(.headline)
                            .frame(width: 44, height: 44)
                            .background(selection.wrappedValue == score ? Color.accentColor : Color(.systemGray6))
                            .foregroundStyle(selection.wrappedValue == score ? .white : .primary)
                            .clipShape(Circle())
                    }
                    .buttonStyle(.plain)
                }

                if showExtraScores {
                    ForEach(extras, id: \.self) { score in
                        Button {
                            selection.wrappedValue = score
                        } label: {
                            Text("\(score)")
                                .font(.headline)
                                .frame(width: 44, height: 44)
                                .background(selection.wrappedValue == score ? Color.accentColor : Color(.systemGray6))
                                .foregroundStyle(selection.wrappedValue == score ? .white : .primary)
                                .clipShape(Circle())
                        }
                        .buttonStyle(.plain)
                    }
                }

                Button {
                    showExtraScores.toggle()
                } label: {
                    Text(showExtraScores ? "Göm" : "Mer…")
                        .font(.caption)
                        .frame(width: 44, height: 44)
                        .background(Color(.systemGray5))
                        .clipShape(Circle())
                }
                .buttonStyle(.plain)
            }
        }
    }
}
