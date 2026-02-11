import SwiftUI

struct TournamentView: View {
    @EnvironmentObject private var viewModel: AppViewModel

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
                    activeTournamentOverview
                    activeRoundEditor
                    liveStandings
                    historicalResults
                }
                .padding()
            }
            .navigationTitle("Tournament")
            .refreshable {
                await viewModel.loadTournamentData()
            }
            .task {
                if viewModel.activeTournament == nil && viewModel.tournamentRounds.isEmpty {
                    await viewModel.loadTournamentData()
                }
            }
            .padelLiquidGlassChrome()
        }
    }

    private var activeTournamentOverview: some View {
        SectionCard(title: "Active Tournament") {
            if viewModel.isTournamentLoading && viewModel.activeTournament == nil {
                ProgressView("Loading tournament…")
            } else if let tournament = viewModel.activeTournament {
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
                    Text("Note for non-coders: this card mirrors the web app's active tournament summary and updates whenever data is refreshed from the backend.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)

                    if let message = viewModel.tournamentStatusMessage {
                        Text(message)
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }

                    if tournament.status != "completed" {
                        Button("Complete Tournament") {
                            Task {
                                await viewModel.completeActiveTournament()
                            }
                        }
                        .buttonStyle(.borderedProminent)
                        .disabled(!viewModel.canMutateTournament)
                    }

                    if !viewModel.canMutateTournament {
                        Text("Guest mode: viewing is allowed, but only signed-in users can update rounds or complete a tournament.")
                            .font(.footnote)
                            .foregroundStyle(.orange)
                    }
                }
            } else {
                Text("No active tournament right now.")
                Text("Note for non-coders: when there is no active tournament in the database, this section stays visible and explains why the rest of the page is empty.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private var activeRoundEditor: some View {
        SectionCard(title: "Round Entry / Update") {
            if viewModel.tournamentRounds.isEmpty {
                Text("No rounds found for the active tournament.")
                    .foregroundStyle(.secondary)
            } else {
                VStack(alignment: .leading, spacing: 12) {
                    ForEach(viewModel.tournamentRounds) { round in
                        RoundEditorRow(round: round, canEdit: viewModel.canMutateTournament) {
                            team1Score, team2Score in
                            await viewModel.saveTournamentRound(round: round, team1Score: team1Score, team2Score: team2Score)
                        }
                    }
                }
            }

            Text("Note for non-coders: each row writes scores to the backend and then forces a reload so standings and history stay in sync.")
                .font(.footnote)
                .foregroundStyle(.secondary)
        }
    }

    private var liveStandings: some View {
        SectionCard(title: "Live Standings") {
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

    private var historicalResults: some View {
        SectionCard(title: "Historical Results") {
            if viewModel.tournamentHistoryResults.isEmpty {
                Text("No historical tournament results yet.")
                    .foregroundStyle(.secondary)
            } else {
                VStack(alignment: .leading, spacing: 10) {
                    ForEach(viewModel.tournamentHistoryResults.prefix(12)) { result in
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Tournament: \(result.tournamentId.uuidString.prefix(8))…")
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

    private func readableStatus(_ status: String) -> String {
        switch status {
        case "draft": return "Draft"
        case "in_progress": return "In Progress"
        case "completed": return "Completed"
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
                    ProgressView()
                        .frame(maxWidth: .infinity)
                } else {
                    Text("Save Round")
                        .frame(maxWidth: .infinity)
                }
            }
            .buttonStyle(.bordered)
            .disabled(!canEdit || isSaving)

            if !canEdit {
                Text("Sign in to edit round scores.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 8)
    }
}
