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
        formatter.locale = AppConfig.swedishLocale
        formatter.dateStyle = .full
        formatter.timeStyle = .short
        return formatter
    }()

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                SectionCard(title: "Lag") {
                    VStack(alignment: .leading, spacing: 8) {
                        detailRow(label: "Lag A", value: match.teamAName)
                        Divider().background(AppColors.borderSubtle)
                        detailRow(label: "Lag B", value: match.teamBName)
                    }
                }

                SectionCard(title: "Resultat") {
                    VStack(alignment: .leading, spacing: 8) {
                        detailRow(label: "Poäng", value: "\(match.teamAScore) – \(match.teamBScore)")
                        Divider().background(AppColors.borderSubtle)
                        detailRow(label: "Typ", value: match.scoreType == "points" ? "Poäng" : "Set")
                        if let target = match.scoreTarget {
                            Divider().background(AppColors.borderSubtle)
                            detailRow(label: "Mål", value: "\(target)")
                        }
                        Divider().background(AppColors.borderSubtle)
                        detailRow(label: "Spelad", value: formatter.string(from: match.playedAt))
                    }
                }

                SectionCard(title: "Matchmetadata") {
                    VStack(alignment: .leading, spacing: 8) {
                        detailRow(label: "Källa", value: match.sourceTournamentId == nil ? "Fristående match" : "Turneringsmatch")
                        if let sourceType = match.sourceTournamentType, !sourceType.isEmpty {
                            Divider().background(AppColors.borderSubtle)
                            detailRow(label: "Källtyp", value: sourceType)
                        }
                        if let sourceId = match.sourceTournamentId {
                            Divider().background(AppColors.borderSubtle)
                            detailRow(label: "Turnering", value: viewModel.tournamentName(for: sourceId))
                        }
                    }
                }

                SectionCard(title: "ELO-förändring (estimat)") {
                    let breakdown = viewModel.eloBreakdown(for: match)
                    if breakdown.isEmpty {
                        Text("Ingen ELO-detalj finns för den här äldre matchen ännu.")
                            .font(.inter(.body))
                            .foregroundStyle(AppColors.textSecondary)
                    } else {
                        VStack(spacing: 16) {
                            ForEach(breakdown) { row in
                                VStack(alignment: .leading, spacing: 8) {
                                    HStack {
                                        Text(row.playerName)
                                            .font(.inter(.subheadline, weight: .bold))
                                            .foregroundStyle(AppColors.textPrimary)
                                        Spacer()
                                        Text("\(row.delta >= 0 ? "+" : "")\(row.delta)")
                                            .font(.inter(.subheadline, weight: .black))
                                            .foregroundStyle(row.delta >= 0 ? AppColors.success : AppColors.error)
                                    }

                                    Text("ELO före: \(row.estimatedBefore) → efter: \(row.estimatedAfter)")
                                        .font(.inter(.caption2))
                                        .foregroundStyle(AppColors.textSecondary)

                                    if let explanation = row.explanation {
                                        VStack(alignment: .leading, spacing: 6) {
                                            Label("Analys", systemImage: "magnifyingglass")
                                                .font(.inter(size: 8, weight: .bold))
                                                .foregroundStyle(AppColors.brandPrimary)

                                            Text(explanation)
                                                .font(.system(size: 10, weight: .medium, design: .monospaced))
                                                .foregroundStyle(AppColors.textPrimary)
                                                .lineSpacing(2)
                                        }
                                        .padding(12)
                                        .frame(maxWidth: .infinity, alignment: .leading)
                                        .background(AppColors.brandPrimary.opacity(0.05))
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 10)
                                                .stroke(AppColors.brandPrimary.opacity(0.1), lineWidth: 1)
                                        )
                                        .clipShape(RoundedRectangle(cornerRadius: 10))
                                    }
                                }

                                if row.id != breakdown.last?.id {
                                    Divider().background(AppColors.borderSubtle)
                                }
                            }
                        }
                    }
                }

                if viewModel.canUseAdmin {
                    SectionCard(title: "Redigera match") {
                        VStack(alignment: .leading, spacing: 16) {
                            Group {
                                playerSelectorRow(title: "Lag A – spelare 1", selection: $editTeamAPlayer1Id)
                                playerSelectorRow(title: "Lag A – spelare 2 (valfri)", selection: $editTeamAPlayer2Id)
                                Divider().background(AppColors.borderSubtle)
                                playerSelectorRow(title: "Lag B – spelare 1", selection: $editTeamBPlayer1Id)
                                playerSelectorRow(title: "Lag B – spelare 2 (valfri)", selection: $editTeamBPlayer2Id)
                            }

                            Divider().background(AppColors.borderSubtle)

                            VStack(spacing: 12) {
                                Stepper("Lag A poäng: \(editTeamAScore)", value: $editTeamAScore, in: 0...99)
                                Stepper("Lag B poäng: \(editTeamBScore)", value: $editTeamBScore, in: 0...99)

                                Picker("Poängtyp", selection: $editScoreType) {
                                    Text("Set").tag("sets")
                                    Text("Poäng").tag("points")
                                }
                                .pickerStyle(.segmented)

                                if editScoreType == "points" {
                                    TextField("Poängmål (valfritt)", text: $editScoreTargetText)
                                        .textFieldStyle(.roundedBorder)
                                        .keyboardType(.numberPad)
                                }

                                DatePicker("Spelad", selection: $editPlayedAt)
                            }
                            .font(.inter(.subheadline))

                            Button("Spara ändringar") {
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
                            .buttonStyle(PrimaryButtonStyle())
                        }
                    }
                }

                if viewModel.canDeleteMatch(match) {
                    Button("Radera match permanent") {
                        showDeleteConfirm = true
                    }
                    .font(.inter(.subheadline, weight: .bold))
                    .foregroundStyle(AppColors.error)
                    .padding()
                }
            }
            .padding()
        }
        .background(AppColors.background)
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

    private func detailRow(label: String, value: String) -> some View {
        HStack {
            Text(label)
                .font(.inter(.subheadline))
                .foregroundStyle(AppColors.textSecondary)
            Spacer()
            Text(value)
                .font(.inter(.subheadline, weight: .bold))
                .foregroundStyle(AppColors.textPrimary)
        }
        .padding(.vertical, 4)
    }

    private func playerSelectorRow(title: String, selection: Binding<String?>) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.inter(.caption, weight: .bold))
                .foregroundStyle(AppColors.textSecondary)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    selectorChip(title: "Ingen", isSelected: selection.wrappedValue == nil) {
                        selection.wrappedValue = nil
                    }

                    selectorChip(title: "Gäst", isSelected: selection.wrappedValue == "guest") {
                        selection.wrappedValue = "guest"
                    }

                    ForEach(viewModel.players) { player in
                        selectorChip(title: player.profileName, isSelected: selection.wrappedValue == player.id.uuidString) {
                            selection.wrappedValue = player.id.uuidString
                        }
                    }
                }
            }
        }
    }

    private func selectorChip(title: String, isSelected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(.inter(.caption2, weight: .bold))
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
                .background(isSelected ? AppColors.brandPrimary : AppColors.textSecondary.opacity(0.1))
                .foregroundStyle(isSelected ? .white : AppColors.textPrimary)
                .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }
}
