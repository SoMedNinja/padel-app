import SwiftUI

struct MatchDetailView: View {
    let match: Match
    @EnvironmentObject private var viewModel: AppViewModel

    @State private var editTeamAScore = 0
    @State private var editTeamBScore = 0
    @State private var editScoreType = "sets"
    @State private var editScoreTargetText = ""
    @State private var editPlayedAt = Date()

    @State private var editTeamAPlayer1Id: String?
    @State private var editTeamAPlayer2Id: String?
    @State private var editTeamBPlayer1Id: String?
    @State private var editTeamBPlayer2Id: String?

    @State private var showDeleteConfirm = false

    @State private var playerSearchText = ""
    @State private var showGuestDialog = false
    @State private var newGuestName = ""
    @State private var activeSelectionBinding: Binding<String?>?

    private let formatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateStyle = .full
        formatter.timeStyle = .short
        return formatter
    }()

    var body: some View {
        List {
            Section("Lag") {
                LabeledContent("Lag A", value: match.teamAName)
                LabeledContent("Lag B", value: match.teamBName)
            }

            Section("Resultat") {
                LabeledContent("Poäng", value: "\(match.teamAScore) - \(match.teamBScore)")
                LabeledContent("Typ", value: match.scoreType == "points" ? "Poäng" : "Set")
                if let target = match.scoreTarget {
                    LabeledContent("Mål", value: "\(target)")
                }
                LabeledContent("Spelad", value: formatter.string(from: match.playedAt))
            }

            Section("Matchmetadata") {
                LabeledContent("Källa", value: match.sourceTournamentId == nil ? "Fristående match" : "Turneringsmatch")
                if let sourceType = match.sourceTournamentType, !sourceType.isEmpty {
                    LabeledContent("Källtyp", value: sourceType)
                }
                if let sourceId = match.sourceTournamentId {
                    LabeledContent("Turnering", value: viewModel.tournamentName(for: sourceId))
                    LabeledContent("Turnerings-ID", value: sourceId.uuidString)
                }
            }

            Section("ELO-förändring (estimat)") {
                let breakdown = viewModel.eloBreakdown(for: match)
                if breakdown.isEmpty {
                    Text("Ingen ELO-detalj finns för den här äldre matchen ännu.")
                        .foregroundStyle(.secondary)
                } else {
                    ForEach(breakdown) { row in
                        VStack(alignment: .leading, spacing: 2) {
                            HStack {
                                Text(row.playerName)
                                Spacer()
                                Text("\(row.delta >= 0 ? "+" : "")\(row.delta)")
                                    .foregroundStyle(row.delta >= 0 ? .green : .red)
                            }
                            Text("ELO före: \(row.estimatedBefore) → efter: \(row.estimatedAfter)")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
                Text("Note for non-coders: 'estimat' betyder att vi räknar ungefärlig ELO-förändring direkt i appen för att ge snabb förklaring även när äldre databasmatcher saknar komplett historik.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }

            if viewModel.canUseAdmin {
                Section("Adminverktyg - Redigera match") {
                    Group {
                        playerSelectorRow(title: "Lag A – spelare 1", selection: $editTeamAPlayer1Id)
                        playerSelectorRow(title: "Lag A – spelare 2 (valfri)", selection: $editTeamAPlayer2Id)
                        Divider()
                        playerSelectorRow(title: "Lag B – spelare 1", selection: $editTeamBPlayer1Id)
                        playerSelectorRow(title: "Lag B – spelare 2 (valfri)", selection: $editTeamBPlayer2Id)
                    }

                    Stepper("Lag A poäng: \(editTeamAScore)", value: $editTeamAScore, in: 0...99)
                    Stepper("Lag B poäng: \(editTeamBScore)", value: $editTeamBScore, in: 0...99)

                    Picker("Poängtyp", selection: $editScoreType) {
                        Text("Set").tag("sets")
                        Text("Poäng").tag("points")
                    }

                    if editScoreType == "points" {
                        TextField("Poängmål (valfritt)", text: $editScoreTargetText)
                            .keyboardType(.numberPad)
                    }

                    DatePicker("Spelad", selection: $editPlayedAt)

                    Button("Spara ändring") {
                        Task {
                            await viewModel.updateMatch(
                                match,
                                playedAt: editPlayedAt,
                                teamAScore: editTeamAScore,
                                teamBScore: editTeamBScore,
                                scoreType: editScoreType,
                                scoreTarget: Int(editScoreTargetText),
                                teamAPlayerIds: [editTeamAPlayer1Id, editTeamAPlayer2Id],
                                teamBPlayerIds: [editTeamBPlayer1Id, editTeamBPlayer2Id]
                            )
                        }
                    }
                    .buttonStyle(.borderedProminent)
                }
            }

            if viewModel.canDeleteMatch(match) {
                Section("Ta bort match") {
                    Button("Radera match", role: .destructive) {
                        showDeleteConfirm = true
                    }
                    Text("Note for non-coders: precis som i webbappen kan skaparen ta bort sin egen match, medan admin kan ta bort alla.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }

            Section("Vad detta gör") {
                Text("Note for non-coders: admins kan ändra poäng, och både skapare/admin kan radera — samma behörighetslogik som i webbappen.")
                    .foregroundStyle(.secondary)
            }
        }
        .onAppear {
            editTeamAScore = match.teamAScore
            editTeamBScore = match.teamBScore
            editScoreType = match.scoreType ?? "sets"
            editScoreTargetText = match.scoreTarget.map(String.init) ?? ""
            editPlayedAt = match.playedAt

            editTeamAPlayer1Id = match.teamAPlayerIds.indices.contains(0) ? match.teamAPlayerIds[0] : nil
            editTeamAPlayer2Id = match.teamAPlayerIds.indices.contains(1) ? match.teamAPlayerIds[1] : nil
            editTeamBPlayer1Id = match.teamBPlayerIds.indices.contains(0) ? match.teamBPlayerIds[0] : nil
            editTeamBPlayer2Id = match.teamBPlayerIds.indices.contains(1) ? match.teamBPlayerIds[1] : nil
        }
        .alert("Radera match?", isPresented: $showDeleteConfirm) {
            Button("Radera", role: .destructive) {
                Task { await viewModel.deleteMatch(match) }
            }
            Button("Avbryt", role: .cancel) { }
        } message: {
            Text("Det här tar bort matchen permanent från databasen.")
        }
        .navigationTitle("Matchdetaljer")
        .padelLiquidGlassChrome()
    }

    private func playerSelectorRow(title: String, selection: Binding<String?>) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.caption.bold())
                .foregroundStyle(.secondary)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    Button {
                        selection.wrappedValue = nil
                    } label: {
                        Text("Ingen")
                            .font(.caption2)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(selection.wrappedValue == nil ? Color.accentColor : Color(.systemGray5))
                            .foregroundStyle(selection.wrappedValue == nil ? .white : .primary)
                            .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)

                    Button {
                        selection.wrappedValue = "guest"
                    } label: {
                        Text("Gäst")
                            .font(.caption2)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(selection.wrappedValue == "guest" ? Color.accentColor : Color(.systemGray5))
                            .foregroundStyle(selection.wrappedValue == "guest" ? .white : .primary)
                            .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)

                    ForEach(viewModel.players) { player in
                        Button {
                            selection.wrappedValue = player.id.uuidString
                        } label: {
                            Text(player.profileName)
                                .font(.caption2)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(selection.wrappedValue == player.id.uuidString ? Color.accentColor : Color(.systemGray5))
                                .foregroundStyle(selection.wrappedValue == player.id.uuidString ? .white : .primary)
                                .clipShape(Capsule())
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
        .padding(.vertical, 4)
    }
}
