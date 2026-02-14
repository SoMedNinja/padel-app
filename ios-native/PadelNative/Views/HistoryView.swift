import SwiftUI
import UIKit

struct HistoryView: View {
    @EnvironmentObject private var viewModel: AppViewModel

    @State private var showAdvancedFilters = false
    @State private var editingMatch: Match?
    @State private var matchToDelete: Match?
    @State private var pullProgress: CGFloat = 0

    private let formatter: DateFormatter = {
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
                    ScrollOffsetTracker()
                    PadelRefreshHeader(isRefreshing: viewModel.isHistoryLoading && !viewModel.historyMatches.isEmpty, pullProgress: pullProgress)
                    filterSection
                    matchesSection
                }
                .padding(.horizontal)
                .padding(.top, 4)
                .padding(.bottom, 40)
            }
            .background(AppColors.background)
            .navigationTitle("Historik")
            .navigationBarTitleDisplayMode(.inline)
            .padelLiquidGlassChrome()
            .coordinateSpace(name: "padelScroll")
            .onPreferenceChange(ScrollOffsetPreferenceKey.self) { offset in
                let threshold: CGFloat = 80
                pullProgress = max(0, min(1.0, offset / threshold))
            }
            .refreshable {
                await viewModel.reloadHistoryMatches()
            }
            .task {
                if viewModel.historyMatches.isEmpty {
                    await viewModel.reloadHistoryMatches()
                }
            }
            .onChange(of: viewModel.historyFilters.datePreset) { _, _ in
                Task { await viewModel.reloadHistoryMatches() }
            }
            .onChange(of: viewModel.historyFilters.customStartDate) { _, _ in
                if viewModel.historyFilters.datePreset == .custom {
                    Task { await viewModel.reloadHistoryMatches() }
                }
            }
            .onChange(of: viewModel.historyFilters.customEndDate) { _, _ in
                if viewModel.historyFilters.datePreset == .custom {
                    Task { await viewModel.reloadHistoryMatches() }
                }
            }
            .onChange(of: viewModel.historyFilters.scoreType) { _, _ in
                Task { await viewModel.reloadHistoryMatches() }
            }
            .onChange(of: viewModel.historyFilters.tournamentOnly) { _, _ in
                Task { await viewModel.reloadHistoryMatches() }
            }
            .sheet(item: $editingMatch) { match in
                MatchEditSheetView(match: match)
                    .environmentObject(viewModel)
            }
            .confirmationDialog("Radera match?", isPresented: Binding(
                get: { matchToDelete != nil },
                set: { if !$0 { matchToDelete = nil } }
            ), titleVisibility: .visible) {
                Button("Radera permanent", role: .destructive) {
                    if let match = matchToDelete {
                        Task { await viewModel.deleteMatch(match) }
                    }
                }
                Button("Avbryt", role: .cancel) { }
            } message: {
                if let match = matchToDelete {
                    Text("Är du säker på att du vill radera matchen mellan \(match.teamAName) och \(match.teamBName)? Detta kan inte ångras.")
                }
            }
        }
    }

    private var filterSection: some View {
        SectionCard(title: "Filter") {
            VStack(alignment: .leading, spacing: 12) {
                Picker("Tidsperiod", selection: $viewModel.historyFilters.datePreset) {
                    ForEach(HistoryDatePreset.allCases) { preset in
                        Text(preset.title).tag(preset)
                    }
                }
                .pickerStyle(.segmented)

                Toggle("Visa avancerade filter", isOn: $showAdvancedFilters)
                    .font(.inter(.subheadline))

                if showAdvancedFilters {
                    VStack(alignment: .leading, spacing: 10) {
                        if viewModel.historyFilters.datePreset == .custom {
                            DatePicker("Startdatum", selection: $viewModel.historyFilters.customStartDate, displayedComponents: [.date])
                                .font(.inter(.subheadline))
                            DatePicker("Slutdatum", selection: $viewModel.historyFilters.customEndDate, displayedComponents: [.date])
                                .font(.inter(.subheadline))
                        }

                        Picker("Poängtyp", selection: $viewModel.historyFilters.scoreType) {
                            Text("Alla").tag("all")
                            Text("Set").tag("sets")
                            Text("Poäng").tag("points")
                        }
                        .pickerStyle(.segmented)

                        Toggle("Bara turneringsmatcher", isOn: $viewModel.historyFilters.tournamentOnly)
                            .font(.inter(.subheadline))
                    }
                    .padding(.top, 4)
                }
            }
        }
    }

    private var matchesSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Matcher")
                .font(.inter(.headline, weight: .bold))
                .foregroundStyle(AppColors.textPrimary)
                .padding(.horizontal, 4)

            if viewModel.isHistoryLoading && viewModel.historyMatches.isEmpty {
                HStack {
                    Spacer()
                    ProgressView("Laddar historik…")
                        .font(.inter(.body))
                    Spacer()
                }
                .padding(.vertical, 20)
            } else if !viewModel.isHistoryLoading && viewModel.historyFilteredMatches.isEmpty {
                SectionCard(title: "") {
                    VStack(spacing: 16) {
                        Text("Inga matcher hittades för valt filter.")
                            .font(.inter(.body))
                            .foregroundStyle(AppColors.textSecondary)

                        Button("Rensa filter") {
                            viewModel.historyFilters = HistoryFilterState()
                            Task { await viewModel.reloadHistoryMatches() }
                        }
                        .buttonStyle(.bordered)
                        .font(.inter(.subheadline, weight: .bold))
                    }
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.vertical, 20)
                }
            } else {
                ForEach(viewModel.historyFilteredMatches) { match in
                    matchCard(match)
                        .onAppear {
                            Task { await viewModel.loadMoreHistoryMatchesIfNeeded(currentMatch: match) }
                        }
                }

                if viewModel.isHistoryLoadingMore {
                    HStack {
                        Spacer()
                        ProgressView()
                        Spacer()
                    }
                    .padding(.top, 10)
                }
            }
        }
    }

    private func matchCard(_ match: Match) -> some View {
        NavigationLink {
            MatchDetailView(match: match)
        } label: {
            VStack(alignment: .leading, spacing: 16) {
                HStack {
                    typeLabelChip(for: match)
                    Text(formatter.string(from: match.playedAt))
                        .font(.inter(.caption))
                        .foregroundStyle(AppColors.textSecondary)
                    Spacer()

                    Menu {
                        Button {
                            editingMatch = match
                        } label: {
                            Label("Redigera", systemImage: "pencil")
                        }

                        if viewModel.canDeleteMatch(match) {
                            Button(role: .destructive) {
                                matchToDelete = match
                            } label: {
                                Label("Radera", systemImage: "trash")
                            }
                        }

                        Button {
                            shareMatch(match)
                        } label: {
                            Label("Dela", systemImage: "square.and.arrow.up")
                        }
                    } label: {
                        Image(systemName: "ellipsis")
                            .font(.subheadline.bold())
                            .foregroundStyle(AppColors.textSecondary)
                            .padding(4)
                    }
                }

                HStack(alignment: .top, spacing: 12) {
                    VStack(alignment: .center, spacing: 4) {
                        Text(scoreLabel(match))
                            .font(.inter(.title3, weight: .black))
                            .foregroundStyle(AppColors.textPrimary)
                        Text(match.scoreType == "points" ? "poäng" : "set")
                            .font(.inter(.caption2, weight: .bold))
                            .foregroundStyle(AppColors.textSecondary)
                            .textCase(.uppercase)
                    }
                    .frame(width: 80)

                    Rectangle()
                        .fill(AppColors.borderSubtle)
                        .frame(width: 1)
                        .frame(maxHeight: .infinity)

                    VStack(alignment: .leading, spacing: 12) {
                        teamDisplay(names: match.teamANames, ids: match.teamAPlayerIds, match: match, isTeamA: true)
                        Divider().background(AppColors.borderSubtle.opacity(0.5))
                        teamDisplay(names: match.teamBNames, ids: match.teamBPlayerIds, match: match, isTeamA: false)
                    }
                }
            }
            .padding()
            .padelSurfaceCard()
        }
        .buttonStyle(.plain)
    }

    private func teamDisplay(names: [String], ids: [String?], match: Match, isTeamA: Bool) -> some View {
        let isWinner = isTeamA ? match.teamAScore > match.teamBScore : match.teamBScore > match.teamAScore
        let breakdown = viewModel.eloBreakdown(for: match)
        let slotCount = max(names.count, ids.count)

        // Note for non-coders:
        // We hide empty placeholder slots so a 1v1 match only shows one player per team.
        let visibleRows = (0..<slotCount).compactMap { idx -> (name: String, id: String?)? in
            let idString = ids.indices.contains(idx) ? ids[idx] : nil
            let name = names.indices.contains(idx) ? names[idx].trimmingCharacters(in: .whitespacesAndNewlines) : ""
            let isPlaceholder = name.isEmpty || name == "Gästspelare" || name == "Spelare"
            guard idString != nil || !isPlaceholder else { return nil }
            return (name.isEmpty ? "Spelare" : name, idString)
        }

        return VStack(alignment: .leading, spacing: 4) {
            ForEach(Array(visibleRows.enumerated()), id: \.offset) { _, row in
                HStack(spacing: 8) {
                    if isWinner {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 10))
                            .foregroundStyle(AppColors.success)
                    }

                    Text(row.name)
                        .font(.inter(.subheadline, weight: isWinner ? .bold : .medium))
                        .foregroundStyle(isWinner ? AppColors.textPrimary : AppColors.textSecondary)
                        .lineLimit(1)

                    Spacer()

                    if let deltaRow = breakdown.first(where: { $0.playerName == row.name || ($0.id.uuidString.lowercased() == row.id?.lowercased()) }) {
                        Text("\(deltaRow.delta >= 0 ? "+" : "")\(deltaRow.delta)")
                            .font(.inter(.caption2, weight: .bold))
                            .foregroundStyle(deltaRow.delta >= 0 ? AppColors.success : AppColors.error)
                    }
                }
            }
        }
    }

    private func scoreLabel(_ match: Match) -> String {
        "\(match.teamAScore) – \(match.teamBScore)"
    }

    private func shareMatch(_ match: Match) {
        let score = scoreLabel(match)
        let lines = [
            "Matchresultat",
            "",
            "\(match.teamAName) vs \(match.teamBName)",
            score,
            "",
            "Spelad: \(formatter.string(from: match.playedAt))"
        ]

        let fileURL = try? ShareCardService.createShareImageFile(
            title: "Padel Match",
            bodyLines: lines,
            fileNamePrefix: "match-history"
        )

        let text = """
        🎾 Matchresultat:
        \(match.teamAName) vs \(match.teamBName)
        \(score)
        """

        var items: [Any] = [text]
        if let fileURL = fileURL {
            items.insert(fileURL, at: 0)
        }

        let av = UIActivityViewController(activityItems: items, applicationActivities: nil)
        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let rootVC = windowScene.windows.first?.rootViewController {
            rootVC.present(av, animated: true)
        }
    }

    private func typeLabelChip(for match: Match) -> some View {
        let type = match.sourceTournamentType ?? "standalone"
        let label: String

        if type == "standalone" {
            let is1v1 = match.teamAPlayerIds.compactMap { $0 }.count == 1 && match.teamBPlayerIds.compactMap { $0 }.count == 1
            label = is1v1 ? "1v1" : "2v2"
        } else if type == "standalone_1v1" {
            label = "1v1"
        } else {
            label = type.capitalized
        }

        return Text(label)
            .font(.inter(size: 8, weight: .bold))
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(AppColors.brandPrimary.opacity(0.1), in: Capsule())
            .foregroundStyle(AppColors.brandPrimary)
    }
}
