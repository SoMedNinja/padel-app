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

    private let scoreTargetOptions = [16, 21, 24, 31]

    private let dateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = AppConfig.swedishLocale
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter
    }()

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
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
            .navigationTitle("Tournament")
            .refreshable {
                await viewModel.loadTournamentData()
            }
            .task {
                if viewModel.tournaments.isEmpty {
                    await viewModel.loadTournamentData()
                }
                if selectedParticipantIds.isEmpty {
                    // Note for non-coders:
                    // We preselect regular members as a smart default so setup is faster,
                    // but organizers can still adjust the list before creating the draft.
                    selectedParticipantIds = Set(viewModel.players.filter { $0.isRegular }.map { $0.id })
                }
            }
            .onChange(of: viewModel.selectedTournamentId) { _, newValue in
                // Note for non-coders: when switching tournaments, we sync the selection list
                // so organizers can edit the roster of an existing draft correctly.
                if let tournamentId = newValue,
                   let tournament = viewModel.tournaments.first(where: { $0.id == tournamentId }),
                   tournament.status == "draft" {
                    selectedParticipantIds = Set(viewModel.tournamentParticipants.map { $0.profileId })
                }
            }
            .onChange(of: viewModel.tournamentParticipants.count) { _, _ in
                // Note for non-coders: sync when participants finish loading from server
                if let tournament = viewModel.activeTournament, tournament.status == "draft" {
                     selectedParticipantIds = Set(viewModel.tournamentParticipants.map { $0.profileId })
                }
            }
            .confirmationDialog("Start this tournament?", isPresented: $showStartConfirmation) {
                Button("Start", role: .none) {
                    Task { await viewModel.startSelectedTournament() }
                }
                Button("Cancel", role: .cancel) { }
            } message: {
                Text("This moves a draft tournament into live play.")
            }
            .confirmationDialog("Cancel this tournament?", isPresented: $showCancelConfirmation) {
                Button("Cancel Tournament", role: .destructive) {
                    Task { await viewModel.cancelSelectedTournament() }
                }
                Button("Keep", role: .cancel) { }
            } message: {
                Text("Use this when the event should be marked as cancelled before completion.")
            }
            .confirmationDialog("Mark as abandoned?", isPresented: $showAbandonConfirmation) {
                Button("Mark Abandoned", role: .destructive) {
                    Task { await viewModel.abandonSelectedTournament() }
                }
                Button("Keep", role: .cancel) { }
            } message: {
                Text("Use this when the tournament started but could not be finished.")
            }
            .confirmationDialog("Delete this tournament permanently?", isPresented: $showDeleteConfirmation) {
                Button("Delete", role: .destructive) {
                    Task { await viewModel.deleteSelectedTournament() }
                }
                Button("Cancel", role: .cancel) { }
            } message: {
                Text("This removes the tournament and related rows from the database.")
            }
            .padelLiquidGlassChrome()
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

                }
            }
        }
    }

    private var createTournamentCard: some View {
        SectionCard(title: "Skapa turnering") {
            VStack(alignment: .leading, spacing: 12) {
                TextField("Namn", text: $newTournamentName)
                    .textInputAutocapitalization(.words)
                    .disabled(viewModel.isTournamentActionRunning || !viewModel.canMutateTournament)

                TextField("Plats (valfritt)", text: $newTournamentLocation)
                    .disabled(viewModel.isTournamentActionRunning || !viewModel.canMutateTournament)

                Picker("Typ", selection: $newTournamentType) {
                    Text("Americano").tag("americano")
                    Text("Mexicano").tag("mexicano")
                }

                Text(newTournamentType == "mexicano"
                     ? "Mexicano betyder att spelare roterar position efter poäng, så tabellen blir extra viktig mellan rundor."
                     : "Americano skapar balanserade matcher per runda med tydlig poängsummering.")
                .font(.caption)
                .foregroundStyle(.secondary)

                Picker("Poängmål", selection: $newTournamentScoreTarget) {
                    ForEach(scoreTargetOptions, id: \.self) { value in
                        Text("\(value)").tag(value)
                    }
                }

                VStack(alignment: .leading, spacing: 8) {
                    Text("Deltagare (\(selectedParticipantIds.count))")
                        .font(.subheadline.weight(.semibold))


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
                                    .foregroundStyle(selectedParticipantIds.contains(player.id) ? .green : .secondary)
                                Text(player.profileName)
                                Spacer()
                                Text("ELO \(player.elo)")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        .buttonStyle(.plain)
                    }
                }

                Toggle("Set scheduled date", isOn: $includeScheduledDate)
                if includeScheduledDate {
                    DatePicker("Scheduled at", selection: $newTournamentDate)
                }

                Button {
                    Task {
                        await viewModel.createTournament(
                            name: newTournamentName,
                            location: newTournamentLocation,
                            scheduledAt: includeScheduledDate ? newTournamentDate : nil,
                            scoreTarget: newTournamentScoreTarget,
                            tournamentType: newTournamentType,
                            participantIds: Array(selectedParticipantIds)
                        )
                        newTournamentName = ""
                        newTournamentLocation = ""
                    }
                } label: {
                    if viewModel.isTournamentActionRunning {
                        ProgressView().frame(maxWidth: .infinity)
                    } else {
                        Text("Create Draft Tournament").frame(maxWidth: .infinity)
                    }
                }
                .buttonStyle(.borderedProminent)
                .disabled(viewModel.isTournamentActionRunning || !viewModel.canMutateTournament || selectedParticipantIds.count < 4)
            }
        }
    }

    private var activeTournamentOverview: some View {
        SectionCard(title: "Vald turnering") {
            if let tournament = viewModel.activeTournament {
                VStack(alignment: .leading, spacing: 12) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(tournament.name)
                            .font(.title3.weight(.semibold))
                        Text("Status: \(readableStatus(tournament.status))")
                        Text("Typ: \(tournament.tournamentType.capitalized)")
                        if let location = tournament.location, !location.isEmpty {
                            Text("Plats: \(location)")
                        }
                        if let scheduledAt = tournament.scheduledAt {
                            Text("Planerad: \(dateFormatter.string(from: scheduledAt))")
                        }
                    }

                    if tournament.status == "draft" {
                        Divider()
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Deltagarlista (\(selectedParticipantIds.count))")
                                .font(.subheadline.weight(.bold))

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
                                            .foregroundStyle(selectedParticipantIds.contains(player.id) ? .green : .secondary)
                                        Text(player.profileName)
                                        Spacer()
                                        Text("ELO \(player.elo)")
                                            .font(.caption2)
                                            .foregroundStyle(.secondary)
                                    }
                                }
                                .buttonStyle(.plain)
                            }

                            Button("Spara deltagarlista") {
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
                        Text(message).font(.footnote).foregroundStyle(.secondary)
                    }

                    if let errorMessage = viewModel.tournamentActionErrorMessage {
                        Text(errorMessage).font(.footnote).foregroundStyle(.red)
                    }

                    actionButtons(for: tournament)
                }
            } else {
                Text("No tournament selected.")
                Text("Tip: choose one from the list above or create a new draft tournament.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private var runHelperCard: some View {
        SectionCard(title: "Hjälpmedel") {
            if let suggestion = nextRoundSuggestion {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Nästa runda: #\(suggestion.round.roundNumber)")
                        .font(.headline)
                    Text("\(suggestion.team1) vs \(suggestion.team2)")
                    if !suggestion.resting.isEmpty {
                        // NOTE (for non-coders): this line only appears when one or more players must rest this round.
                        Text("Vilar: \(suggestion.resting)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            } else {
                Text("Alla rundor har redan score, eller så finns inga rundor än.")
                    .foregroundStyle(.secondary)
            }
        }
    }

    @ViewBuilder
    private func actionButtons(for tournament: Tournament) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            if tournament.status == "draft" {
                Button("Start Tournament") { showStartConfirmation = true }
                    .buttonStyle(.borderedProminent)
                    .disabled(viewModel.isTournamentActionRunning || !viewModel.canMutateTournament)
            }

            if tournament.status == "in_progress" {
                Button("Complete Tournament") {
                    Task { await viewModel.completeActiveTournament() }
                }
                .buttonStyle(.borderedProminent)
                .disabled(viewModel.isTournamentActionRunning || !viewModel.canMutateTournament)

                Button("Mark Abandoned") { showAbandonConfirmation = true }
                    .buttonStyle(.bordered)
                    .disabled(viewModel.isTournamentActionRunning || !viewModel.canMutateTournament)
            }

            if tournament.status == "draft" || tournament.status == "in_progress" {
                Button("Cancel Tournament") { showCancelConfirmation = true }
                    .buttonStyle(.bordered)
                    .disabled(viewModel.isTournamentActionRunning || !viewModel.canMutateTournament)
            }

            Button("Delete Tournament") { showDeleteConfirmation = true }
                .buttonStyle(.bordered)
                .tint(.red)
                .disabled(viewModel.isTournamentActionRunning || !viewModel.canMutateTournament)
        }
    }

    private var activeRoundEditor: some View {
        SectionCard(title: "Resultatregistrering") {
            if viewModel.tournamentRounds.isEmpty {
                Text("Inga rundor hittades.")
                    .foregroundStyle(.secondary)
            } else {
                VStack(alignment: .leading, spacing: 12) {
                    ForEach(viewModel.tournamentRounds) { round in
                        RoundEditorRow(round: round, canEdit: viewModel.canMutateTournament) { team1Score, team2Score in
                            await viewModel.saveTournamentRound(round: round, team1Score: team1Score, team2Score: team2Score)
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
                SectionCard(title: "Live view") {
                    TournamentBracketView(rounds: viewModel.tournamentRounds) { id in
                        viewModel.tournamentPlayerName(for: id)
                    }
                }
            }
        }
    }

    private var liveStandings: some View {
        SectionCard(title: "Tabell") {
            if viewModel.tournamentStandings.isEmpty {
                Text("Tabellen dyker upp när resultat finns.")
                    .foregroundStyle(.secondary)
            } else {
                VStack(spacing: 8) {
                    ForEach(viewModel.tournamentStandings) { standing in
                        HStack(spacing: 8) {
                            Text("#\(standing.rank)")
                                .font(.subheadline.weight(.semibold))
                                .frame(width: 36, alignment: .leading)
                            Text(standing.playerName)
                                .frame(maxWidth: .infinity, alignment: .leading)
                            Text("\(standing.pointsFor) pts")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            Text("W\(standing.wins)-L\(standing.losses)")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
        }
    }

    private var shareCard: some View {
        SectionCard(title: "Dela / Exportera") {
            if let exportText = viewModel.exportTextForSelectedCompletedTournament() {
                if let cardURL = tournamentShareImageURL(text: exportText) {
                    ShareLink(item: cardURL) {
                        Label("Dela som bild", systemImage: "photo.on.rectangle")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                }

                ShareLink(item: exportText) {
                    Label("Dela som text", systemImage: "square.and.arrow.up")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)

            } else {
                Text("Complete tournament to enable rich summary export.")
                    .foregroundStyle(.secondary)
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
            fileNamePrefix: "tournament-summary"
        )
    }

    private var historicalResults: some View {
        SectionCard(title: "Resultathistorik") {
            if viewModel.tournamentHistoryResults.isEmpty {
                Text("Ingen historik än.")
                    .foregroundStyle(.secondary)
            } else {
                VStack(alignment: .leading, spacing: 10) {
                    ForEach(viewModel.tournamentHistoryResults.prefix(12)) { result in
                        VStack(alignment: .leading, spacing: 4) {
                            Text(viewModel.tournamentName(for: result.tournamentId))
                                .font(.subheadline.weight(.semibold))
                            Text("\(result.profileId.map { viewModel.tournamentPlayerName(for: $0) } ?? "Gästspelare") • Rank #\(result.rank) • W\(result.wins)-L\(result.losses) • PF \(result.pointsFor) / PA \(result.pointsAgainst)")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(8)
                        .background(Color(.tertiarySystemBackground))
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
}

private struct RoundEditorRow: View {
    let round: TournamentRound
    let canEdit: Bool
    let onSave: (Int, Int) async -> Void

    @State private var team1Score: Int
    @State private var team2Score: Int
    @State private var isSaving = false

    init(round: TournamentRound, canEdit: Bool, onSave: @escaping (Int, Int) async -> Void) {
        self.round = round
        self.canEdit = canEdit
        self.onSave = onSave
        _team1Score = State(initialValue: round.team1Score ?? 0)
        _team2Score = State(initialValue: round.team2Score ?? 0)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Runda \(round.roundNumber)")
                .font(.subheadline.weight(.semibold))
            Text("Typ: \((round.mode ?? "okänd").capitalized)")
                .font(.caption)
                .foregroundStyle(.secondary)

            HStack {
                Stepper("Lag 1: \(team1Score)", value: $team1Score, in: 0...99)
                Stepper("Lag 2: \(team2Score)", value: $team2Score, in: 0...99)
            }

            Button {
                Task {
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
            .disabled(!canEdit || isSaving)
        }
        .padding(.vertical, 8)
    }
}
