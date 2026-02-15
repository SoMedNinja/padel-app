import SwiftUI

private enum TournamentPanel: String, CaseIterable, Identifiable {
    case setup = "Inställningar"
    case run = "Matcher"
    case results = "Tabell"
    case history = "Historik"

    var id: String { rawValue }
}

struct TournamentView: View {
    @EnvironmentObject private var viewModel: AppViewModel

    @State private var newTournamentName = ""
    @State private var newTournamentLocation = ""
    @State private var newTournamentType = "americano"
    @State private var newTournamentScoreTarget = 24
    @State private var newTournamentDate = Date()
    @State private var includeScheduledDate = true
    @State private var selectedPanel: TournamentPanel = .setup
    @State private var selectedParticipantIds: Set<UUID> = []

    @State private var showStartConfirmation = false
    @State private var showCancelConfirmation = false
    @State private var showAbandonConfirmation = false
    @State private var showDeleteConfirmation = false
    @State private var lastAutoPanelKey = ""
    @State private var pullProgress: CGFloat = 0
    @State private var selectedShareVariant: ShareCardService.Variant = .classic

    private let scoreTargetOptions = [16, 21, 24, 31]

    // Note for non-coders:
    // We share one formatter helper so all screens show dates the same way.
    private let dateFormattingService = DateFormattingService.shared

    var body: some View {
        NavigationStack {
            tournamentContent
        }
    }

    private var tournamentContent: some View {
        let baseContent = ScrollView {
            VStack(spacing: 20) {
                ScrollOffsetTracker()
                PadelRefreshHeader(isRefreshing: viewModel.isTournamentLoading && !viewModel.tournaments.isEmpty, pullProgress: pullProgress)
                tournamentPicker

                SectionCard(title: "Turnering") {
                    Picker("Panel", selection: $selectedPanel) {
                        ForEach(TournamentPanel.allCases) { panel in
                            Text(panel.rawValue).tag(panel)
                        }
                    }
                    .pickerStyle(.segmented)
                }

                switch selectedPanel {
                case .setup:
                    createTournamentCard
                    activeTournamentOverview
                case .run:
                    runHelperCard
                    activeRoundEditor
                case .results:
                    bracketOverview
                    liveStandings
                    shareCard
                case .history:
                    historicalResults
                }
            }
            .padding()
        }
        .background(AppColors.background)
        .navigationTitle("Turnering")
        .navigationBarTitleDisplayMode(.inline)
        .coordinateSpace(name: "padelScroll")
        .onPreferenceChange(ScrollOffsetPreferenceKey.self) { offset in
            let threshold: CGFloat = 80
            pullProgress = max(0, min(1.0, offset / threshold))
        }

        // Note for non-coders:
        // This second step attaches behaviors (refreshing, dialogs, auto-sync) separately
        // so the compiler can process a smaller chunk at a time.
        return attachTournamentBehaviors(to: baseContent)
    }

    private func attachTournamentBehaviors<Content: View>(to content: Content) -> some View {
        let withDataLoading = attachDataLoadingBehaviors(to: content)
        let withStateSync = attachStateSyncBehaviors(to: withDataLoading)
        let withDialogs = attachTournamentDialogs(to: withStateSync)
        return withDialogs.padelLiquidGlassChrome()
    }

    // Note for non-coders:
    // Each helper below is one "small Lego block". Smaller blocks are easier for Swift
    // to compile and easier for us humans to maintain.
    private func attachDataLoadingBehaviors<Content: View>(to content: Content) -> some View {
        content
            .refreshable {
                await viewModel.loadTournamentData()
            }
            .task {
                if viewModel.tournaments.isEmpty {
                    await viewModel.loadTournamentData()
                }
                if selectedParticipantIds.isEmpty {
                    selectedParticipantIds = Set(viewModel.players.filter { $0.isRegular }.map { $0.id })
                }
            }
    }

    private func attachStateSyncBehaviors<Content: View>(to content: Content) -> some View {
        content
            .onChange(of: viewModel.selectedTournamentId) { _, _ in
                syncParticipantSelectionFromTournament()
                autoSelectPanelForTournamentState()
            }
            .onChange(of: viewModel.activeTournament?.status) { _, _ in
                autoSelectPanelForTournamentState()
            }
            .onChange(of: viewModel.tournamentParticipants) { _, _ in
                syncParticipantSelectionFromTournament()
            }
    }

    private func attachTournamentDialogs<Content: View>(to content: Content) -> some View {
        content
            .confirmationDialog("Starta turnering?", isPresented: $showStartConfirmation, titleVisibility: .visible) {
                Button("Starta", role: .none) {
                    Task { await viewModel.saveRosterAndStartSelectedTournament(participantIds: Array(selectedParticipantIds)) }
                }
                Button("Avbryt", role: .cancel) { }
            } message: {
                Text("Steg 2 av 4: roster sparas först och turneringen startas därefter, precis som i PWA.")
            }
            .confirmationDialog("Avbryt turnering?", isPresented: $showCancelConfirmation, titleVisibility: .visible) {
                Button("Avbryt turnering", role: .destructive) {
                    Task { await viewModel.cancelSelectedTournament() }
                }
                Button("Stäng", role: .cancel) { }
            }
            .confirmationDialog("Markera som avbruten?", isPresented: $showAbandonConfirmation, titleVisibility: .visible) {
                Button("Markera avbruten", role: .destructive) {
                    Task { await viewModel.abandonSelectedTournament() }
                }
                Button("Stäng", role: .cancel) { }
            }
            .confirmationDialog("Radera turnering?", isPresented: $showDeleteConfirmation, titleVisibility: .visible) {
                Button("Radera permanent", role: .destructive) {
                    Task { await viewModel.deleteSelectedTournament() }
                }
                Button("Stäng", role: .cancel) { }
            } message: {
                Text("Detta tar bort turnering, deltagare, rundor och resultat permanent.")
            }
    }

    private var tournamentPicker: some View {
        SectionCard(title: "Turneringslista / Historik") {
            if viewModel.isTournamentLoading && viewModel.tournaments.isEmpty {
                ProgressView("Laddar turneringar…")
            } else {
                VStack(alignment: .leading, spacing: 10) {
                    Picker("Vald turnering", selection: Binding<UUID?>(
                        get: { viewModel.selectedTournamentId },
                        set: { newValue in
                            Task { await viewModel.selectTournament(id: newValue) }
                        }
                    )) {
                        Text("Inget val").tag(Optional<UUID>.none)
                        ForEach(viewModel.tournaments) { tournament in
                            Text("\(tournament.name) • \(readableStatus(tournament.status))")
                                .tag(Optional(tournament.id))
                        }
                    }
                    .pickerStyle(.menu)
                    .font(.inter(.body))
                }
            }
        }
    }

    private var createTournamentCard: some View {
        SectionCard(title: "Skapa turnering") {
            VStack(alignment: .leading, spacing: 12) {
                TextField("Namn", text: $newTournamentName)
                    .textFieldStyle(.roundedBorder)
                    .textInputAutocapitalization(.words)
                    .disabled(viewModel.isTournamentActionRunning || !viewModel.canMutateTournament)
                    .font(.inter(.body))

                TextField("Plats (valfritt)", text: $newTournamentLocation)
                    .textFieldStyle(.roundedBorder)
                    .disabled(viewModel.isTournamentActionRunning || !viewModel.canMutateTournament)
                    .font(.inter(.body))

                Picker("Typ", selection: $newTournamentType) {
                    Text("Americano").tag("americano")
                    Text("Mexicano").tag("mexicano")
                }
                .pickerStyle(.segmented)

                Text(newTournamentType == "mexicano"
                     ? "Mexicano betyder att spelare roterar position efter poäng, så tabellen blir extra viktig mellan rundor."
                     : "Americano skapar balanserade matcher per runda med tydlig poängsummering.")
                .font(.inter(.caption))
                .foregroundStyle(AppColors.textSecondary)

                Picker("Poängmål", selection: $newTournamentScoreTarget) {
                    ForEach(scoreTargetOptions, id: \.self) { value in
                        Text("\(value)").tag(value)
                    }
                }
                .pickerStyle(.segmented)

                Text("Steg 1 av 4: skapa ett utkast med turneringsinställningar. I nästa steg väljer du roster innan start.")
                    .font(.inter(.caption))
                    .foregroundStyle(AppColors.textSecondary)

                Toggle("Ange datum", isOn: $includeScheduledDate)
                    .font(.inter(.body))
                if includeScheduledDate {
                    DatePicker("Datum", selection: $newTournamentDate)
                        .font(.inter(.body))
                }

                Button {
                    Task {
                        let didCreateTournament = await viewModel.createTournament(
                            name: newTournamentName,
                            location: newTournamentLocation,
                            scheduledAt: includeScheduledDate ? newTournamentDate : nil,
                            scoreTarget: newTournamentScoreTarget,
                            tournamentType: newTournamentType
                        )
                        // Note for non-coders:
                        // We only clear the form after a successful save.
                        // If something fails, leaving the typed values helps users retry quickly.
                        if didCreateTournament {
                            newTournamentName = ""
                            newTournamentLocation = ""
                        }
                    }
                } label: {
                    if viewModel.isTournamentActionRunning {
                        ProgressView().frame(maxWidth: .infinity)
                    } else {
                        Text("Skapa utkast").frame(maxWidth: .infinity)
                    }
                }
                .buttonStyle(PrimaryButtonStyle())
                .disabled(viewModel.isTournamentActionRunning || !viewModel.canMutateTournament)

                if let message = viewModel.tournamentStatusMessage {
                    Text(message)
                        .font(.inter(.footnote))
                        .foregroundStyle(AppColors.textSecondary)
                }

                if let errorMessage = viewModel.tournamentActionErrorMessage {
                    // Note for non-coders:
                    // Showing errors right under the "Skapa utkast" button makes failed saves visible,
                    // so it no longer feels like the button does nothing.
                    Text(errorMessage)
                        .font(.inter(.footnote))
                        .foregroundStyle(AppColors.error)
                }
            }
        }
    }

    private var activeTournamentOverview: some View {
        SectionCard(title: "Vald turnering") {
            if let tournament = viewModel.activeTournament {
                VStack(alignment: .leading, spacing: 16) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(tournament.name)
                            .font(.inter(.title3, weight: .bold))
                            .foregroundStyle(AppColors.textPrimary)
                        Text("Status: \(readableStatus(tournament.status))")
                            .font(.inter(.subheadline))
                        Text("Typ: \(tournament.tournamentType.capitalized)")
                            .font(.inter(.subheadline))
                        if let location = tournament.location, !location.isEmpty {
                            Text("Plats: \(location)")
                                .font(.inter(.subheadline))
                        }
                        if let scheduledAt = tournament.scheduledAt {
                            Text("Planerad: \(dateFormattingService.fullScheduleTimestamp(scheduledAt))")
                                .font(.inter(.subheadline))
                        }
                    }
                    .foregroundStyle(AppColors.textSecondary)

                    if tournament.status == "draft" {
                        Divider()
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Steg 2 av 4 • Deltagarlista (\(selectedParticipantIds.count))")
                                .font(.inter(.subheadline, weight: .bold))

                            ForEach(viewModel.players) { player in
                                Button {
                                    if selectedParticipantIds.contains(player.id) {
                                        selectedParticipantIds.remove(player.id)
                                    } else {
                                        selectedParticipantIds.insert(player.id)
                                    }
                                } label: {
                                    HStack {
                                        Image(systemName: selectedParticipantIds.contains(player.id) ? "checkmark.circle.fill" : "circle")
                                            .foregroundStyle(selectedParticipantIds.contains(player.id) ? AppColors.success : AppColors.textSecondary)
                                        Text(player.profileName)
                                            .font(.inter(.body))
                                            .foregroundStyle(AppColors.textPrimary)
                                        Spacer()
                                        Text("ELO \(viewModel.playerBadgeStats[player.id]?.currentElo ?? player.elo)")
                                            .font(.inter(.caption2))
                                            .foregroundStyle(AppColors.textSecondary)
                                    }
                                }
                                .buttonStyle(.plain)
                            }

                            Button("Spara roster") {
                                Task {
                                    await viewModel.replaceTournamentParticipants(
                                        tournamentId: tournament.id,
                                        participantIds: Array(selectedParticipantIds)
                                    )
                                }
                            }
                            .buttonStyle(.bordered)
                            .disabled(viewModel.isTournamentActionRunning || !viewModel.canMutateTournament)
                        }
                    }

                    if let message = viewModel.tournamentStatusMessage {
                        Text(message).font(.inter(.footnote)).foregroundStyle(AppColors.textSecondary)
                    }

                    if let errorMessage = viewModel.tournamentActionErrorMessage {
                        Text(errorMessage).font(.inter(.footnote)).foregroundStyle(AppColors.error)
                    }

                    actionButtons(for: tournament)
                }
            } else {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Ingen turnering vald.")
                        .font(.inter(.body))
                    Text("Tips: välj en från listan ovan eller skapa ett nytt utkast.")
                        .font(.inter(.footnote))
                        .foregroundStyle(AppColors.textSecondary)
                }
            }
        }
    }

    private var runHelperCard: some View {
        SectionCard(title: "Hjälpmedel") {
            if let suggestion = nextRoundSuggestion {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Nästa runda: #\(suggestion.round.roundNumber)")
                        .font(.inter(.headline, weight: .bold))
                    Text("\(suggestion.team1) vs \(suggestion.team2)")
                        .font(.inter(.body))
                    if !suggestion.resting.isEmpty {
                        Text("Vilar: \(suggestion.resting)")
                            .font(.inter(.caption))
                            .foregroundStyle(AppColors.textSecondary)
                    }
                }
            } else {
                Text("Alla rundor har redan score, eller så finns inga rundor än.")
                    .font(.inter(.body))
                    .foregroundStyle(AppColors.textSecondary)
            }
        }
    }

    @ViewBuilder
    private func actionButtons(for tournament: Tournament) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            if tournament.status == "draft" {
                Button("Spara roster och starta") { showStartConfirmation = true }
                    .buttonStyle(PrimaryButtonStyle())
                    .disabled(viewModel.isTournamentActionRunning || !viewModel.canMutateTournament)
            }

            if tournament.status == "in_progress" {
                Button("Spara och avsluta turnering") {
                    Task { await viewModel.completeActiveTournament() }
                }
                .buttonStyle(PrimaryButtonStyle())
                .disabled(viewModel.isTournamentActionRunning || !viewModel.canMutateTournament)

                Button("Markera som avbruten") { showAbandonConfirmation = true }
                    .buttonStyle(.bordered)
                    .disabled(viewModel.isTournamentActionRunning || !viewModel.canMutateTournament)
            }

            if tournament.status == "draft" || tournament.status == "in_progress" {
                Button("Avbryt turnering") { showCancelConfirmation = true }
                    .buttonStyle(.bordered)
                    .disabled(viewModel.isTournamentActionRunning || !viewModel.canMutateTournament)
            }

            Button("Radera turnering permanent") { showDeleteConfirmation = true }
                .buttonStyle(.bordered)
                .tint(AppColors.error)
                .disabled(viewModel.isTournamentActionRunning || !viewModel.canMutateTournament)
        }
        .font(.inter(.subheadline, weight: .bold))
    }

    private var activeRoundEditor: some View {
        SectionCard(title: "Resultatregistrering") {
            if viewModel.tournamentRounds.isEmpty {
                Text("Inga rundor hittades.")
                    .font(.inter(.body))
                    .foregroundStyle(AppColors.textSecondary)
            } else {
                VStack(alignment: .leading, spacing: 16) {
                    Text("Steg 3 av 4: fyll i resultat. Skriv poäng för ett lag så räknas motståndaren ut automatiskt enligt poängmålet.")
                        .font(.inter(.caption))
                        .foregroundStyle(AppColors.textSecondary)

                    ForEach(viewModel.tournamentRounds) { round in
                        RoundEditorRow(
                            round: round,
                            scoreTarget: viewModel.activeTournament?.scoreTarget ?? 24,
                            canEdit: viewModel.canMutateTournament
                        ) { team1Score, team2Score in
                            await viewModel.saveTournamentRound(round: round, team1Score: team1Score, team2Score: team2Score)
                        }
                        if round.id != viewModel.tournamentRounds.last?.id {
                            Divider()
                                .background(AppColors.borderSubtle)
                        }
                    }
                }
            }
        }
    }

    private var bracketOverview: some View {
        Group {
            if let tournament = viewModel.activeTournament,
               (tournament.status == "in_progress" || tournament.status == "completed") {
                SectionCard(title: "Bracket-vy") {
                    TournamentBracketView(rounds: viewModel.tournamentRounds) { id in
                        viewModel.tournamentPlayerName(for: id)
                    }
                    .padding(.vertical, 8)
                }
            }
        }
    }

    private var liveStandings: some View {
        SectionCard(title: "Tabell") {
            if viewModel.tournamentStandings.isEmpty {
                Text("Tabellen dyker upp när resultat finns.")
                    .font(.inter(.body))
                    .foregroundStyle(AppColors.textSecondary)
            } else {
                VStack(spacing: 0) {
                    ForEach(viewModel.tournamentStandings) { standing in
                        HStack(spacing: 8) {
                            Text("#\(standing.rank)")
                                .font(.inter(.subheadline, weight: .bold))
                                .frame(width: 36, alignment: .leading)
                            Text(standing.playerName)
                                .font(.inter(.body))
                                .frame(maxWidth: .infinity, alignment: .leading)
                            Text("\(standing.pointsFor) pts")
                                .font(.inter(.caption))
                                .foregroundStyle(AppColors.brandPrimary)
                            Text("W\(standing.wins)-L\(standing.losses)")
                                .font(.inter(.caption))
                                .foregroundStyle(AppColors.textSecondary)
                        }
                        .padding(.vertical, 10)

                        if standing.rank != viewModel.tournamentStandings.last?.rank {
                            Divider()
                                .background(AppColors.borderSubtle)
                        }
                    }
                }
            }
        }
    }

    private var shareCard: some View {
        SectionCard(title: "Dela / Exportera") {
            if let exportText = viewModel.exportTextForSelectedCompletedTournament() {
                VStack(spacing: 12) {
                    shareVariantPicker

                    if let cardURL = tournamentShareImageURL(text: exportText) {
                        ShareLink(item: cardURL) {
                            Label("Dela som bild", systemImage: "photo.on.rectangle")
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.bordered)
                    } else {
                        Text("Kunde inte skapa turneringsbilden just nu.")
                            .font(.inter(.caption))
                            .foregroundStyle(AppColors.textSecondary)
                    }
                }
                .font(.inter(.subheadline, weight: .bold))

            } else {
                Text("Slutför turneringen för att kunna exportera sammanfattning.")
                    .font(.inter(.footnote))
                    .foregroundStyle(AppColors.textSecondary)
            }
        }
    }


    private func tournamentShareImageURL(text: String) -> URL? {
        let lines = text
            .split(separator: "\n")
            .map(String.init)
            .prefix(16)
        return try? ShareCardService.createShareImageFile(
            title: "Tournament Summary",
            bodyLines: Array(lines),
            fileNamePrefix: "tournament-summary",
            variant: selectedShareVariant
        )
    }

    private var shareVariantPicker: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Note for non-coders: this mirrors web sharing where people can cycle through 5 template variations.
            Text("Välj bildstil")
                .font(.inter(.caption, weight: .bold))
                .foregroundStyle(AppColors.textSecondary)

            Picker("Välj bildstil", selection: $selectedShareVariant) {
                ForEach(ShareCardService.Variant.allCases) { variant in
                    Text(variant.title).tag(variant)
                }
            }
            .pickerStyle(.segmented)

            Text("Mall \(selectedShareVariant.rawValue + 1) av 5")
                .font(.inter(.caption2, weight: .semibold))
                .foregroundStyle(AppColors.textSecondary)
        }
    }

    private var historicalResults: some View {
        SectionCard(title: "Tidigare turneringar") {
            if viewModel.tournamentHistoryResults.isEmpty {
                Text("Ingen historik än.")
                    .font(.inter(.body))
                    .foregroundStyle(AppColors.textSecondary)
            } else {
                VStack(alignment: .leading, spacing: 10) {
                    ForEach(viewModel.tournamentHistoryResults.prefix(12)) { result in
                        VStack(alignment: .leading, spacing: 4) {
                            Text(viewModel.tournamentName(for: result.tournamentId))
                                .font(.inter(.subheadline, weight: .bold))
                                .foregroundStyle(AppColors.textPrimary)
                            Text("\(result.profileId.map { viewModel.tournamentPlayerName(for: $0) } ?? "Gästspelare") • Rank #\(result.rank) • W\(result.wins)-L\(result.losses) • PF \(result.pointsFor) / PA \(result.pointsAgainst)")
                                .font(.inter(.caption))
                                .foregroundStyle(AppColors.textSecondary)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(10)
                        .background(AppColors.background)
                        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                    }
                }
            }
        }
    }

    private var nextRoundSuggestion: (round: TournamentRound, team1: String, team2: String, resting: String)? {
        guard let firstPending = viewModel.tournamentRounds.first(where: { $0.team1Score == nil || $0.team2Score == nil }) else { return nil }

        let team1 = firstPending.team1Ids
            .map { id in viewModel.tournamentPlayerName(for: id) }
            .joined(separator: " & ")

        let team2 = firstPending.team2Ids
            .map { id in viewModel.tournamentPlayerName(for: id) }
            .joined(separator: " & ")

        let resting = firstPending.restingIds
            .map { id in viewModel.tournamentPlayerName(for: id) }
            .joined(separator: ", ")

        return (firstPending, team1, team2, resting)
    }

    private func readableStatus(_ status: String) -> String {
        switch status {
        case "draft": return "Utkast"
        case "in_progress": return "Pågår"
        case "completed": return "Slutförd"
        case "abandoned": return "Avbruten"
        case "cancelled": return "Inställd"
        default: return status.capitalized
        }
    }

    private func autoSelectPanelForTournamentState() {
        guard let tournament = viewModel.activeTournament,
              let tournamentId = viewModel.selectedTournamentId else {
            selectedPanel = .setup
            lastAutoPanelKey = ""
            return
        }

        // Note for non-coders:
        // We only auto-switch tabs when the selected tournament or its status changes.
        // That keeps iOS behavior aligned with web while still letting users stay on a
        // manually chosen tab during normal data refreshes.
        let redirectKey = "\(tournamentId.uuidString)-\(tournament.status)"
        guard redirectKey != lastAutoPanelKey else { return }

        switch tournament.status {
        case "in_progress":
            selectedPanel = .run
        case "completed":
            selectedPanel = .results
        default:
            selectedPanel = .setup
        }

        lastAutoPanelKey = redirectKey
    }

    private func syncParticipantSelectionFromTournament() {
        guard viewModel.activeTournament != nil else {
            if selectedParticipantIds.isEmpty {
                selectedParticipantIds = Set(viewModel.players.filter { $0.isRegular }.map { $0.id })
            }
            return
        }

        // Note for non-coders:
        // This keeps the iOS participant checklist in sync with the roster saved on the
        // tournament, so "save roster" starts from the true backend state like web does.
        let participantIds = Set(viewModel.tournamentParticipants.map(\.profileId))
        if !participantIds.isEmpty {
            selectedParticipantIds = participantIds
        }
    }
}

private struct RoundEditorRow: View {
    let round: TournamentRound
    let scoreTarget: Int
    let canEdit: Bool
    let onSave: (Int, Int) async -> Void

    @State private var team1ScoreText: String
    @State private var team2ScoreText: String
    @State private var isSaving = false

    init(round: TournamentRound, scoreTarget: Int, canEdit: Bool, onSave: @escaping (Int, Int) async -> Void) {
        self.round = round
        self.scoreTarget = scoreTarget
        self.canEdit = canEdit
        self.onSave = onSave
        _team1ScoreText = State(initialValue: round.team1Score.map(String.init) ?? "")
        _team2ScoreText = State(initialValue: round.team2Score.map(String.init) ?? "")
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("Runda \(round.roundNumber)")
                    .font(.inter(.subheadline, weight: .bold))
                Spacer()
                Text("\((round.mode ?? "okänd").capitalized)")
                    .font(.inter(.caption, weight: .bold))
                    .foregroundStyle(AppColors.textSecondary)
            }

            HStack(spacing: 20) {
                VStack(spacing: 4) {
                    Text("Lag 1").font(.inter(.caption2, weight: .bold))
                    TextField("0", text: $team1ScoreText)
                        .textFieldStyle(.roundedBorder)
                        .multilineTextAlignment(.center)
                        .font(.inter(.body, weight: .bold))
                        .keyboardType(.numberPad)
                        .onChange(of: team1ScoreText) { _, newValue in
                            team1ScoreText = numericOnly(newValue)
                            autoFillOpponentScore(changedTeam: .team1)
                        }
                }

                VStack(spacing: 4) {
                    Text("Lag 2").font(.inter(.caption2, weight: .bold))
                    TextField("0", text: $team2ScoreText)
                        .textFieldStyle(.roundedBorder)
                        .multilineTextAlignment(.center)
                        .font(.inter(.body, weight: .bold))
                        .keyboardType(.numberPad)
                        .onChange(of: team2ScoreText) { _, newValue in
                            team2ScoreText = numericOnly(newValue)
                            autoFillOpponentScore(changedTeam: .team2)
                        }
                }
            }

            Button {
                Task {
                    guard let team1Score = Int(team1ScoreText), let team2Score = Int(team2ScoreText) else {
                        return
                    }
                    isSaving = true
                    defer { isSaving = false }
                    await onSave(team1Score, team2Score)
                }
            } label: {
                if isSaving {
                    ProgressView().frame(maxWidth: .infinity)
                } else {
                    Text("Spara runda").frame(maxWidth: .infinity)
                }
            }
            .buttonStyle(.bordered)
            .font(.inter(.subheadline, weight: .bold))
            .disabled(!canEdit || isSaving || Int(team1ScoreText) == nil || Int(team2ScoreText) == nil)
        }
        .padding(.vertical, 4)
    }

    private enum ScoreTeam {
        case team1
        case team2
    }

    // Note for non-coders:
    // We keep only digits so the score box behaves like free text but still saves safe numbers.
    private func numericOnly(_ value: String) -> String {
        let digits = value.filter(\.isNumber)
        if digits.isEmpty { return "" }
        if let number = Int(digits) {
            return String(min(number, scoreTarget))
        }
        return ""
    }

    // Note for non-coders:
    // In point-based games, both teams should always add up to the selected target (for example 20 + 4 = 24).
    private func autoFillOpponentScore(changedTeam: ScoreTeam) {
        switch changedTeam {
        case .team1:
            guard let team1Score = Int(team1ScoreText), team1Score >= 0, team1Score <= scoreTarget else { return }
            team2ScoreText = String(scoreTarget - team1Score)
        case .team2:
            guard let team2Score = Int(team2ScoreText), team2Score >= 0, team2Score <= scoreTarget else { return }
            team1ScoreText = String(scoreTarget - team2Score)
        }
    }
}
