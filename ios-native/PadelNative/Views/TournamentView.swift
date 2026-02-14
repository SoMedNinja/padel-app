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
                VStack(spacing: 20) {
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
            .navigationTitle("Tournament")
            .navigationBarTitleDisplayMode(.inline)
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
            .confirmationDialog("Starta turnering?", isPresented: $showStartConfirmation, titleVisibility: .visible) {
                Button("Starta", role: .none) {
                    Task { await viewModel.startSelectedTournament() }
                }
                Button("Avbryt", role: .cancel) { }
            } message: {
                Text("Detta byter status från utkast till pågående och följer samma flöde som PWA.")
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

                VStack(alignment: .leading, spacing: 8) {
                    Text("Deltagare (\(selectedParticipantIds.count))")
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
                                    .font(.inter(.caption))
                                    .foregroundStyle(AppColors.textSecondary)
                            }
                        }
                        .buttonStyle(.plain)
                        .padding(.vertical, 2)
                    }
                }

                Toggle("Ange datum", isOn: $includeScheduledDate)
                    .font(.inter(.body))
                if includeScheduledDate {
                    DatePicker("Datum", selection: $newTournamentDate)
                        .font(.inter(.body))
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
                        Text("Skapa utkast").frame(maxWidth: .infinity)
                    }
                }
                .buttonStyle(PrimaryButtonStyle())
                .disabled(viewModel.isTournamentActionRunning || !viewModel.canMutateTournament || selectedParticipantIds.count < 4)
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
                            Text("Planerad: \(dateFormatter.string(from: scheduledAt))")
                                .font(.inter(.subheadline))
                        }
                    }
                    .foregroundStyle(AppColors.textSecondary)

                    if tournament.status == "draft" {
                        Divider()
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Deltagarlista (\(selectedParticipantIds.count))")
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
                Button("Starta turnering") { showStartConfirmation = true }
                    .buttonStyle(PrimaryButtonStyle())
                    .disabled(viewModel.isTournamentActionRunning || !viewModel.canMutateTournament)
            }

            if tournament.status == "in_progress" {
                Button("Slutför turnering") {
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
                    ForEach(viewModel.tournamentRounds) { round in
                        RoundEditorRow(round: round, canEdit: viewModel.canMutateTournament) { team1Score, team2Score in
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
            fileNamePrefix: "tournament-summary"
        )
    }

    private var historicalResults: some View {
        SectionCard(title: "Resultathistorik") {
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
                    Stepper("\(team1Score)", value: $team1Score, in: 0...99)
                        .font(.inter(.body, weight: .bold))
                }

                VStack(spacing: 4) {
                    Text("Lag 2").font(.inter(.caption2, weight: .bold))
                    Stepper("\(team2Score)", value: $team2Score, in: 0...99)
                        .font(.inter(.body, weight: .bold))
                }
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
            .font(.inter(.subheadline, weight: .bold))
            .disabled(!canEdit || isSaving)
        }
        .padding(.vertical, 4)
    }
}
