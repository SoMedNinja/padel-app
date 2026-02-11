import SwiftUI

private enum TournamentPanel: String, CaseIterable, Identifiable {
    case setup = "Setup"
    case run = "Run"
    case results = "Results"
    case history = "History"

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
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter
    }()

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    tournamentPicker

                    SectionCard(title: "Tournament workspace") {
                        Picker("Panel", selection: $selectedPanel) {
                            ForEach(TournamentPanel.allCases) { panel in
                                Text(panel.rawValue).tag(panel)
                            }
                        }
                        .pickerStyle(.segmented)

                        Text("Note for non-coders: delarna Setup/Run/Results/History följer samma mentala steg som webbens turneringsflöde.")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }

                    switch selectedPanel {
                    case .setup:
                        createTournamentCard
                        activeTournamentOverview
                    case .run:
                        runHelperCard
                        activeRoundEditor
                    case .results:
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
        SectionCard(title: "Tournament List / History") {
            if viewModel.isTournamentLoading && viewModel.tournaments.isEmpty {
                ProgressView("Loading tournaments…")
            } else {
                VStack(alignment: .leading, spacing: 10) {
                    Picker("Selected Tournament", selection: Binding<UUID?>(
                        get: { viewModel.selectedTournamentId },
                        set: { newValue in
                            Task { await viewModel.selectTournament(id: newValue) }
                        }
                    )) {
                        Text("No selection").tag(Optional<UUID>.none)
                        ForEach(viewModel.tournaments) { tournament in
                            Text("\(tournament.name) • \(readableStatus(tournament.status))")
                                .tag(Optional(tournament.id))
                        }
                    }

                    Text("Note for non-coders: listan blandar pågående och historiska turneringar så arrangören snabbt kan växla kontext.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
        }
    }

    private var createTournamentCard: some View {
        SectionCard(title: "Create Tournament") {
            VStack(alignment: .leading, spacing: 12) {
                TextField("Tournament name", text: $newTournamentName)
                    .textInputAutocapitalization(.words)
                    .disabled(viewModel.isTournamentActionRunning || !viewModel.canMutateTournament)

                TextField("Location (optional)", text: $newTournamentLocation)
                    .disabled(viewModel.isTournamentActionRunning || !viewModel.canMutateTournament)

                Picker("Tournament type", selection: $newTournamentType) {
                    Text("Americano").tag("americano")
                    Text("Mexicano").tag("mexicano")
                }

                Text(newTournamentType == "mexicano"
                     ? "Note for non-coders: Mexicano betyder att spelare roterar position efter poäng, så tabellen blir extra viktig mellan rundor."
                     : "Note for non-coders: Americano skapar balanserade matcher per runda med tydlig poängsummering.")
                .font(.caption)
                .foregroundStyle(.secondary)

                Picker("Score target", selection: $newTournamentScoreTarget) {
                    ForEach(scoreTargetOptions, id: \.self) { value in
                        Text("\(value)").tag(value)
                    }
                }

                VStack(alignment: .leading, spacing: 8) {
                    Text("Participants (\(selectedParticipantIds.count))")
                        .font(.subheadline.weight(.semibold))

                    Text("Note for non-coders: välj vilka spelare som faktiskt deltar så turneringens rundor och tabell blir korrekta direkt från start.")
                        .font(.caption)
                        .foregroundStyle(.secondary)

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
        SectionCard(title: "Selected Tournament") {
            if let tournament = viewModel.activeTournament {
                VStack(alignment: .leading, spacing: 8) {
                    Text(tournament.name)
                        .font(.title3.weight(.semibold))
                    Text("Status: \(readableStatus(tournament.status))")
                    Text("Mode: \(tournament.tournamentType.capitalized)")
                    if let location = tournament.location, !location.isEmpty {
                        Text("Location: \(location)")
                    }
                    if let scheduledAt = tournament.scheduledAt {
                        Text("Scheduled: \(dateFormatter.string(from: scheduledAt))")
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
        SectionCard(title: "Run Helper") {
            if let suggestion = nextRoundSuggestion {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Next suggested round: #\(suggestion.round.roundNumber)")
                        .font(.headline)
                    Text("\(suggestion.team1) vs \(suggestion.team2)")
                    if !suggestion.resting.isEmpty {
                        Text("Resting: \(suggestion.resting)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    Text("Note for non-coders: hjälpkortet pekar på nästa runda som saknar resultat så arrangören kan hålla tempo mellan matcher.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
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
        SectionCard(title: "Round Entry / Update") {
            if viewModel.tournamentRounds.isEmpty {
                Text("No rounds found for this tournament.")
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

    private var liveStandings: some View {
        SectionCard(title: "Standings") {
            if viewModel.tournamentStandings.isEmpty {
                Text("Standings will appear when scores are available.")
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
        SectionCard(title: "Share / Export") {
            if let exportText = viewModel.exportTextForSelectedCompletedTournament() {
                ShareLink(item: exportText) {
                    Label("Share Tournament Summary", systemImage: "square.and.arrow.up")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
            } else {
                Text("Complete tournament to enable rich summary export.")
                    .foregroundStyle(.secondary)
            }
        }
    }

    private var historicalResults: some View {
        SectionCard(title: "Result History") {
            if viewModel.tournamentHistoryResults.isEmpty {
                Text("No historical tournament results yet.")
                    .foregroundStyle(.secondary)
            } else {
                VStack(alignment: .leading, spacing: 10) {
                    ForEach(viewModel.tournamentHistoryResults.prefix(12)) { result in
                        VStack(alignment: .leading, spacing: 4) {
                            Text(viewModel.tournamentName(for: result.tournamentId))
                                .font(.subheadline.weight(.semibold))
                            Text("Rank #\(result.rank) • W\(result.wins)-L\(result.losses) • PF \(result.pointsFor) / PA \(result.pointsAgainst)")
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
            .map { id in viewModel.players.first(where: { $0.id == id })?.profileName ?? "Unknown" }
            .joined(separator: " & ")

        let team2 = firstPending.team2Ids
            .map { id in viewModel.players.first(where: { $0.id == id })?.profileName ?? "Unknown" }
            .joined(separator: " & ")

        let resting = firstPending.restingIds
            .map { id in viewModel.players.first(where: { $0.id == id })?.profileName ?? "Unknown" }
            .joined(separator: ", ")

        return (firstPending, team1, team2, resting)
    }

    private func readableStatus(_ status: String) -> String {
        switch status {
        case "draft": return "Draft"
        case "in_progress": return "In Progress"
        case "completed": return "Completed"
        case "abandoned": return "Abandoned"
        case "cancelled": return "Cancelled"
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
            Text("Round \(round.roundNumber)")
                .font(.subheadline.weight(.semibold))
            Text("Round mode: \((round.mode ?? "unknown").capitalized)")
                .font(.caption)
                .foregroundStyle(.secondary)

            HStack {
                Stepper("Team 1: \(team1Score)", value: $team1Score, in: 0...99)
                Stepper("Team 2: \(team2Score)", value: $team2Score, in: 0...99)
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
                    Text("Save Round").frame(maxWidth: .infinity)
                }
            }
            .buttonStyle(.bordered)
            .disabled(!canEdit || isSaving)
        }
        .padding(.vertical, 8)
    }
}
