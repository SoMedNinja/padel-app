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

    var shortTitle: String {
        title.replacingOccurrences(of: "Steg \(rawValue + 1): ", with: "")
    }
}

struct SingleGameView: View {
    @EnvironmentObject private var viewModel: AppViewModel

    @State private var isOneVsOne = false
    @State private var teamAPlayer1Id: String?
    @State private var teamAPlayer2Id: String?
    @State private var teamBPlayer1Id: String?
    @State private var teamBPlayer2Id: String?
    @State private var teamAScore: Int?
    @State private var teamBScore: Int?
    @State private var showExtraScores = false
    @State private var playedAt = Date()
    @State private var isSubmitting = false
    @State private var wizardStep: SingleGameWizardStep = .teamSetup
    @State private var generatedRecap: SingleGameRecap?
    @State private var navigateToRecap = false
    @State private var fairnessLabel: String?
    @State private var showSuccessState = false
    @State private var matchmakerPool: Set<UUID> = []

    @State private var playerSearchText = ""

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Stepper Header (PWA Style)
                if wizardStep != .matchmaker && !showSuccessState {
                    HStack(spacing: 0) {
                        ForEach(SingleGameWizardStep.allCases.filter { $0 != .matchmaker }, id: \.self) { step in
                            VStack(spacing: 8) {
                                Circle()
                                    .fill(wizardStep.rawValue >= step.rawValue ? AppColors.brandPrimary : AppColors.textSecondary.opacity(0.3))
                                    .frame(width: 24, height: 24)
                                    .overlay(
                                        Text("\(step.rawValue + 1)")
                                            .font(.inter(size: 10, weight: .bold))
                                            .foregroundStyle(.white)
                                    )

                                Text(step.shortTitle)
                                    .font(.inter(size: 10, weight: wizardStep == step ? .bold : .medium))
                                    .foregroundStyle(wizardStep == step ? AppColors.textPrimary : AppColors.textSecondary)
                                    .lineLimit(2)
                                    .multilineTextAlignment(.center)
                                    .frame(height: 24, alignment: .top)
                            }
                            .frame(maxWidth: .infinity)
                            .contentShape(Rectangle())
                            .onTapGesture {
                                if step.rawValue < wizardStep.rawValue {
                                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                                    wizardStep = step
                                }
                            }
                            .accessibilityElement(children: .combine)
                            .accessibilityLabel(step.title)
                            .accessibilityAddTraits(.isButton)
                            .accessibilityValue(wizardStep == step ? "Aktivt" : (wizardStep.rawValue > step.rawValue ? "Slutfört" : "Kommande"))
                            .accessibilityHint(step.rawValue < wizardStep.rawValue ? "Gå tillbaka till detta steg" : "")

                            if step != .review {
                                Rectangle()
                                    .fill(wizardStep.rawValue > step.rawValue ? AppColors.brandPrimary : AppColors.textSecondary.opacity(0.3))
                                    .frame(height: 2)
                                    .frame(maxWidth: .infinity)
                                    .padding(.bottom, 20)
                            }
                        }
                    }
                    .padding(.top, 10)
                    .padding(.horizontal)
                    .background(AppColors.surface)
                }

                ScrollView {
                    VStack(spacing: 16) {
                        if wizardStep == .teamSetup || wizardStep == .opponentSetup {
                            SectionCard(title: "Matchtyp") {
                                Picker("Matchtyp", selection: $isOneVsOne) {
                                    Text("2 mot 2").tag(false)
                                    Text("1 mot 1").tag(true)
                                }
                                .pickerStyle(.segmented)
                            }
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

                        if !showSuccessState {
                            HStack(spacing: 16) {
                                if wizardStep != .teamSetup && wizardStep != .matchmaker {
                                    Button("Tillbaka") {
                                        UIImpactFeedbackGenerator(style: .light).impactOccurred()
                                        previousStep()
                                    }
                                    .buttonStyle(.bordered)
                                    .font(.inter(.subheadline, weight: .bold))
                                    .disabled(isSubmitting)
                                }

                                if wizardStep != .matchmaker {
                                    Button {
                                        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                                        if wizardStep == .review {
                                            submitMatch()
                                        } else {
                                            nextStep()
                                        }
                                    } label: {
                                        HStack(spacing: 8) {
                                            if isSubmitting && wizardStep == .review {
                                                ProgressView()
                                                    .tint(.white)
                                                Text("Sparar...")
                                            } else {
                                                Text(wizardStep == .review ? "Spara match" : "Nästa")
                                            }
                                        }
                                    }
                                    .buttonStyle(PrimaryButtonStyle())
                                    .disabled(isSubmitting || !isStepValid)
                                }
                            }
                            .padding(.top, 10)
                        }

                    if showSuccessState, let recap = generatedRecap {
                        SectionCard(title: "Klart 🎉") {
                            MatchSuccessCeremonyView(recap: recap, players: viewModel.players)
                        }
                    }

                    if let recap = generatedRecap {
                        SectionCard(title: "Sammanfattning") {
                            VStack(alignment: .leading, spacing: 12) {
                                Text(recap.matchSummary)
                                    .font(.inter(.subheadline, weight: .bold))
                                Text(recap.eveningSummary)
                                    .font(.inter(.subheadline))
                                    .foregroundStyle(AppColors.textSecondary)

                                HStack(spacing: 12) {
                                    if let shareImageURL = recapShareImageURL(for: recap) {
                                        ShareLink(item: shareImageURL) {
                                            Label("Dela bild", systemImage: "photo.on.rectangle")
                                        }
                                    }

                                    ShareLink(item: recap.sharePayload) {
                                        Label("Dela text", systemImage: "square.and.arrow.up")
                                    }
                                }
                                .font(.inter(.caption, weight: .bold))
                                .padding(.top, 4)
                            }
                        }

                        Button("Registrera en till match") {
                            // Note for non-coders:
                            // This clears the previous result and restarts the wizard from step 1.
                            generatedRecap = nil
                            showSuccessState = false
                            navigateToRecap = false
                            resetFormForNextEntry(keepMatchType: true)
                        }
                        .buttonStyle(PrimaryButtonStyle())
                    }

                    if let status = viewModel.statusMessage {
                        SectionCard(title: "Status") {
                            Text(status)
                                .font(.inter(.footnote))
                                .foregroundStyle(AppColors.textSecondary)
                        }
                    }
                }
                .padding()
            }
            }
            .background(AppColors.background)
            .toolbar(.hidden, for: .navigationBar)
            .onAppear {
                applyDeepLinkModeIfAvailable()
            }
            .navigationDestination(isPresented: $navigateToRecap) {
                if let recap = generatedRecap {
                    SingleGameRecapView(recap: recap, players: viewModel.players)
                }
            }
            .padelLiquidGlassChrome()
        }
    }

    // Note for non-coders: this helper builds a shareable image file URL from the recap text.

    private func recapShareImageURL(for recap: SingleGameRecap) -> URL? {
        let lines = [recap.matchSummary, "", recap.eveningSummary]
        return try? ShareCardService.createShareImageFile(
            title: "Padel recap",
            bodyLines: lines,
            fileNamePrefix: "single-game-recap"
        )
    }

    private var isStepValid: Bool {
        switch wizardStep {
        case .teamSetup:
            if isOneVsOne { return teamAPlayer1Id != nil }
            return teamAPlayer1Id != nil && teamAPlayer2Id != nil
        case .opponentSetup:
            if isOneVsOne { return teamBPlayer1Id != nil }
            return teamBPlayer1Id != nil && teamBPlayer2Id != nil
        case .score:
            return teamAScore != nil && teamBScore != nil
        case .review:
            return true
        case .matchmaker:
            return true
        }
    }

    private var teamSetupSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            SectionCard(title: isOneVsOne ? "Välj Spelare A" : "Välj Lag A") {
                VStack(alignment: .leading, spacing: 16) {
                    HStack(spacing: 12) {
                        selectionChip(id: $teamAPlayer1Id, placeholder: "Spelare 1")
                        if !isOneVsOne {
                            selectionChip(id: $teamAPlayer2Id, placeholder: "Spelare 2")
                        }
                    }

                    playerGrid(selection: Binding(
                        get: { "" },
                        set: { id in
                            if teamAPlayer1Id == nil {
                                teamAPlayer1Id = id
                            } else if !isOneVsOne && teamAPlayer2Id == nil && id != teamAPlayer1Id {
                                teamAPlayer2Id = id
                            }

                            // Auto-advance if team is full
                            if isOneVsOne && teamAPlayer1Id != nil {
                                wizardStep = .opponentSetup
                            } else if !isOneVsOne && teamAPlayer1Id != nil && teamAPlayer2Id != nil {
                                wizardStep = .opponentSetup
                            }
                        }
                    ), excluded: [])
                }
            }

            SectionCard(title: "Matchdetaljer") {
                VStack(alignment: .leading, spacing: 12) {
                    DatePicker("Datum & tid", selection: $playedAt)
                        .font(.inter(.subheadline))

                    HStack {
                        Button("Föreslå match") {
                            UIImpactFeedbackGenerator(style: .light).impactOccurred()
                            applySuggestedMatchup()
                        }
                        .font(.inter(.caption, weight: .bold))

                        Spacer()

                        Button("Matchmaker") {
                            UIImpactFeedbackGenerator(style: .light).impactOccurred()
                            wizardStep = .matchmaker
                        }
                        .buttonStyle(.bordered)
                        .font(.inter(.caption, weight: .bold))
                    }
                }
            }
        }
    }

    private var opponentSetupSection: some View {
        SectionCard(title: isOneVsOne ? "Välj Spelare B" : "Välj Lag B") {
            VStack(alignment: .leading, spacing: 16) {
                HStack(spacing: 12) {
                    selectionChip(id: $teamBPlayer1Id, placeholder: "Spelare 1")
                    if !isOneVsOne {
                        selectionChip(id: $teamBPlayer2Id, placeholder: "Spelare 2")
                    }
                }

                playerGrid(selection: Binding(
                    get: { "" },
                    set: { id in
                        if teamBPlayer1Id == nil {
                            teamBPlayer1Id = id
                        } else if !isOneVsOne && teamBPlayer2Id == nil && id != teamBPlayer1Id {
                            teamBPlayer2Id = id
                        }

                        // Auto-advance if team is full
                        if isOneVsOne && teamBPlayer1Id != nil {
                            wizardStep = .score
                        } else if !isOneVsOne && teamBPlayer1Id != nil && teamBPlayer2Id != nil {
                            wizardStep = .score
                        }
                    }
                ), excluded: [teamAPlayer1Id, teamAPlayer2Id].compactMap { $0 })

                if let fairnessLabel {
                    Text(fairnessLabel.replacingOccurrences(of: "Fairness", with: "Rättvisa"))
                        .font(.inter(.footnote))
                        .foregroundStyle(AppColors.textSecondary)
                }
            }
        }
    }

    private func selectionChip(id: Binding<String?>, placeholder: String) -> some View {
        HStack {
            if let selectedId = id.wrappedValue {
                Text(resolveName(selectedId))
                    .font(.inter(.subheadline, weight: .bold))
                Spacer()
                Button {
                    id.wrappedValue = nil
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(AppColors.textSecondary)
                }
                .accessibilityLabel("Ta bort spelare")
            } else {
                Text(placeholder)
                    .font(.inter(.subheadline))
                    .foregroundStyle(AppColors.textSecondary)
                Spacer()
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(id.wrappedValue != nil ? AppColors.brandPrimary.opacity(0.1) : AppColors.textSecondary.opacity(0.05))
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .overlay(
            RoundedRectangle(cornerRadius: 10)
                .stroke(id.wrappedValue != nil ? AppColors.brandPrimary : Color.clear, lineWidth: 1)
        )
        .frame(maxWidth: .infinity)
    }

    private func resolveName(_ id: String) -> String {
        if id == "guest" { return "Gäst" }
        if let uuid = UUID(uuidString: id), let p = viewModel.players.first(where: { $0.id == uuid }) {
            return p.profileName
        }
        return "Okänd"
    }

    private func playerGrid(selection: Binding<String>, excluded: [String]) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            TextField("Sök spelare...", text: $playerSearchText)
                .textFieldStyle(.roundedBorder)
                .font(.inter(.body))

            let filteredPlayers = viewModel.players.filter {
                (playerSearchText.isEmpty || $0.profileName.localizedCaseInsensitiveContains(playerSearchText) || $0.fullName.localizedCaseInsensitiveContains(playerSearchText))
                && !excluded.contains($0.id.uuidString)
            }

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                // Guest tile
                if !excluded.contains("guest") {
                    playerTileButton(id: "guest", name: "Gäst", icon: "person.badge.plus", selection: selection)
                }

                ForEach(filteredPlayers) { player in
                    playerTileButton(id: player.id.uuidString, name: player.profileName, avatarURL: player.avatarURL, selection: selection)
                }
            }
        }
    }

    private func playerTileButton(id: String, name: String, icon: String? = nil, avatarURL: String? = nil, selection: Binding<String>) -> some View {
        Button {
            selection.wrappedValue = id
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
        } label: {
            VStack(spacing: 8) {
                if let icon = icon {
                    Image(systemName: icon)
                        .font(.title2)
                        .foregroundStyle(AppColors.brandPrimary)
                        .frame(width: 44, height: 44)
                        .background(AppColors.brandPrimary.opacity(0.1), in: Circle())
                } else {
                    PlayerAvatarView(urlString: avatarURL, size: 44)
                }

                Text(name)
                    .font(.inter(.caption2, weight: .bold))
                    .lineLimit(2)
                    .multilineTextAlignment(.center)
                    .frame(height: 30)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .background(AppColors.surface)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .padelSurfaceCard()
        }
        .buttonStyle(.plain)
    }

    private var scoreSection: some View {
        SectionCard(title: "Resultat") {
            VStack(alignment: .leading, spacing: 20) {
                VStack(alignment: .leading, spacing: 10) {
                    Text(scoreTeamLabel(base: "Lag A", primary: teamAPlayer1Id, secondary: isOneVsOne ? nil : teamAPlayer2Id))
                        .font(.inter(.caption, weight: .black))
                        .foregroundStyle(AppColors.textSecondary)
                    scoreButtonGrid(selection: $teamAScore)
                }

                Divider().background(AppColors.borderSubtle)

                VStack(alignment: .trailing, spacing: 10) {
                    Text(scoreTeamLabel(base: "Lag B", primary: teamBPlayer1Id, secondary: isOneVsOne ? nil : teamBPlayer2Id))
                        .font(.inter(.caption, weight: .black))
                        .foregroundStyle(AppColors.textSecondary)
                        .frame(maxWidth: .infinity, alignment: .trailing)
                    scoreButtonGrid(selection: $teamBScore)
                }

                if let (fairness, prob) = currentMatchFairnessAndProb {
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Rättvisa: \(fairness)%")
                            ProgressView(value: Double(fairness), total: 100)
                                .tint(fairness > 70 ? AppColors.success : (fairness > 40 ? AppColors.warning : AppColors.error))
                        }
                        Spacer()
                        VStack(alignment: .trailing, spacing: 4) {
                            Text("Vinstchans Lag A: \(Int(round(prob * 100)))%")
                            ProgressView(value: prob, total: 1.0)
                        }
                    }
                    .font(.inter(.caption2, weight: .bold))
                    .padding(12)
                    .background(AppColors.brandPrimary.opacity(0.05))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }

                // Note for non-coders: single match now always saves as a standard set match.
            }
        }
    }

    private var reviewSection: some View {
        SectionCard(title: "Granska match") {
            VStack(alignment: .leading, spacing: 12) {
                reviewRow(label: "Lag A", value: teamText(primary: teamAPlayer1Id, secondary: isOneVsOne ? nil : teamAPlayer2Id))
                reviewRow(label: "Lag B", value: teamText(primary: teamBPlayer1Id, secondary: isOneVsOne ? nil : teamBPlayer2Id))
                reviewRow(label: "Resultat", value: "\(teamAScore.map(String.init) ?? "–")–\(teamBScore.map(String.init) ?? "–")")

                Text("Detta är en sista kontroll innan matchen sparas.")
                    .font(.inter(.footnote))
                    .foregroundStyle(AppColors.textSecondary)
                    .padding(.top, 4)
            }
        }
    }

    private func reviewRow(label: String, value: String) -> some View {
        HStack(alignment: .top) {
            Text("\(label):")
                .font(.inter(.subheadline, weight: .bold))
                .foregroundStyle(AppColors.textSecondary)
                .frame(width: 80, alignment: .leading)
            Text(value)
                .font(.inter(.subheadline, weight: .bold))
                .foregroundStyle(AppColors.textPrimary)
        }
    }

    private var matchmakerSection: some View {
        VStack(spacing: 20) {
            SectionCard(title: "Välj spelare (4–8)") {
                VStack(alignment: .leading, spacing: 16) {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 12) {
                            ForEach(viewModel.players) { player in
                                Button {
                                    if matchmakerPool.contains(player.id) {
                                        matchmakerPool.remove(player.id)
                                    } else if matchmakerPool.count < 8 {
                                        matchmakerPool.insert(player.id)
                                    }
                                } label: {
                                    VStack(spacing: 8) {
                                        PlayerAvatarView(urlString: player.avatarURL, size: 44)
                                        Text(player.profileName)
                                            .font(.inter(.caption2, weight: .bold))
                                            .lineLimit(1)
                                    }
                                    .frame(width: 80, height: 90)
                                    .background(matchmakerPool.contains(player.id) ? AppColors.brandPrimary.opacity(0.1) : AppColors.textSecondary.opacity(0.05))
                                    .clipShape(RoundedRectangle(cornerRadius: 12))
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 12)
                                            .stroke(matchmakerPool.contains(player.id) ? AppColors.brandPrimary : Color.clear, lineWidth: 2)
                                    )
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }

                    HStack(spacing: 12) {
                        Button("Balansera lag") {
                            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                            viewModel.generateBalancedMatch(poolIds: Array(matchmakerPool))
                        }
                        .buttonStyle(.borderedProminent)
                        .font(.inter(.caption, weight: .bold))
                        .disabled(matchmakerPool.count != 4)

                        Button("Skapa rotation") {
                            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                            viewModel.generateRotation(poolIds: Array(matchmakerPool))
                        }
                        .buttonStyle(.bordered)
                        .font(.inter(.caption, weight: .bold))
                        .disabled(matchmakerPool.count < 4)
                    }
                }
            }

            if let rotation = viewModel.currentRotation {
                VStack(spacing: 16) {
                    ForEach(rotation.rounds) { round in
                        SectionCard(title: "Runda \(round.roundNumber)") {
                            VStack(alignment: .leading, spacing: 12) {
                                HStack {
                                    Text(rotationTeamText(ids: round.teamA))
                                    Spacer()
                                    Text("VS")
                                        .font(.inter(.caption, weight: .black))
                                        .foregroundStyle(AppColors.textSecondary)
                                    Spacer()
                                    Text(rotationTeamText(ids: round.teamB))
                                }
                                .font(.inter(.subheadline, weight: .bold))
                                .multilineTextAlignment(.center)

                                if !round.rest.isEmpty {
                                    Text("Vilar: \(rotationTeamText(ids: round.rest))")
                                        .font(.inter(.caption))
                                        .foregroundStyle(AppColors.textSecondary)
                                }

                                HStack {
                                    Text("Rättvisa: \(round.fairness)%")
                                        .font(.inter(.caption, weight: .bold))
                                        .foregroundStyle(AppColors.textSecondary)
                                    Spacer()
                                    Button("Starta match") {
                                        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                                        startRotationMatch(round: round)
                                    }
                                    .buttonStyle(.bordered)
                                    .font(.inter(.caption, weight: .bold))
                                }
                            }
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

            guard let teamAScore, let teamBScore else {
                viewModel.statusMessage = "Välj resultat för båda lagen innan du sparar."
                return
            }

            let recap = await viewModel.submitSingleGame(
                teamAPlayerIds: teamAIds,
                teamBPlayerIds: teamBIds,
                teamAScore: teamAScore,
                teamBScore: teamBScore,
                scoreType: "sets",
                scoreTarget: nil,
                sourceTournamentId: nil,
                sourceTournamentType: "",
                teamAServesFirst: true
            )

            guard let recap else { return }
            generatedRecap = recap
            withAnimation(.spring) {
                showSuccessState = true
            }
            try? await Task.sleep(nanoseconds: 900_000_000)
            navigateToRecap = true
        }
    }

    private func resetFormForNextEntry(keepMatchType: Bool) {
        let preserveOneVsOne = isOneVsOne
        teamAPlayer1Id = nil
        teamAPlayer2Id = nil
        teamBPlayer1Id = nil
        teamBPlayer2Id = nil
        teamAScore = nil
        teamBScore = nil
        playedAt = Date()
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

    // Note for non-coders: this adds player names directly in score step headers
    // so you can confirm who belongs to each team before saving points.
    private func scoreTeamLabel(base: String, primary: String?, secondary: String?) -> String {
        let names = teamText(primary: primary, secondary: secondary)
        guard names != "Ej valt" else { return base }
        return "\(base) · \(names)"
    }


    @ViewBuilder
    private func scoreButtonGrid(selection: Binding<Int?>) -> some View {
        let scores = [0, 1, 2, 3, 4, 5, 6, 7]
        let extras = [8, 9, 10, 11, 12]

        VStack(spacing: 12) {
            LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 4), spacing: 12) {
                ForEach(scores, id: \.self) { score in
                    scoreButton(score: score, selection: selection)
                }

                if showExtraScores {
                    ForEach(extras, id: \.self) { score in
                        scoreButton(score: score, selection: selection)
                    }
                }

                Button {
                    showExtraScores.toggle()
                } label: {
                    Text(showExtraScores ? "Göm" : "Mer…")
                        .font(.inter(.caption, weight: .bold))
                        .frame(maxWidth: .infinity)
                        .frame(height: 44)
                        .background(AppColors.textSecondary.opacity(0.1))
                        .foregroundStyle(AppColors.textPrimary)
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                }
                .buttonStyle(.plain)
                .accessibilityLabel(showExtraScores ? "Göm extra resultat" : "Visa fler resultat")
            }
        }
    }

    private func scoreButton(score: Int, selection: Binding<Int?>) -> some View {
        Button {
            selection.wrappedValue = score
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
        } label: {
            Text("\(score)")
                .font(.inter(.headline, weight: .bold))
                .frame(maxWidth: .infinity)
                .frame(height: 44)
                .background(selection.wrappedValue == score ? AppColors.brandPrimary : AppColors.textSecondary.opacity(0.1))
                .foregroundStyle(selection.wrappedValue == score ? .white : AppColors.textPrimary)
                .clipShape(RoundedRectangle(cornerRadius: 10))
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Resultat \(score)")
        .accessibilityAddTraits(selection.wrappedValue == score ? .isSelected : [])
    }
}
