import SwiftUI
import UIKit

struct HistoryView: View {
    @EnvironmentObject private var viewModel: AppViewModel
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    @State private var showAdvancedFilters = false
    @State private var editingMatch: Match?
    @State private var matchToDelete: Match?
    @State private var pullProgress: CGFloat = 0
    @State private var isPullRefreshing = false
    @State private var pullOffsetBaseline: CGFloat?

    // Note for non-coders:
    // We share one formatter helper so all screens show dates the same way.
    private let dateFormattingService = DateFormattingService.shared

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    ScrollOffsetTracker()
                    PadelRefreshHeader(isRefreshing: isPullRefreshing, pullProgress: pullProgress)
                    filterSection
                    if let conflictResolutionMessage = viewModel.conflictResolutionMessage {
                        SectionCard(title: "Konfliktstatus") {
                            Text(conflictResolutionMessage)
                                .font(.inter(.footnote))
                                .foregroundStyle(AppColors.textSecondary)
                        }
                    }
                    matchesSection
                }
                .padding(.horizontal)
                .padding(.top, 4)
                .padding(.bottom, 40)
            }
            .background(AppColors.background)
            .navigationTitle(LocalizedStringKey("history.title"))
            .navigationBarTitleDisplayMode(.inline)
            .padelLiquidGlassChrome()
            .coordinateSpace(name: "padelScroll")
            .onPreferenceChange(ScrollOffsetPreferenceKey.self) { offset in
                if !isPullRefreshing,
                   pullOffsetBaseline == nil || offset < (pullOffsetBaseline ?? offset) {
                    pullOffsetBaseline = offset
                }

                let normalizedOffset = PullToRefreshBehavior.normalizedOffset(offset, baseline: pullOffsetBaseline)
                pullProgress = PullToRefreshBehavior.progress(for: normalizedOffset)
            }
            .refreshable {
                await PullToRefreshBehavior.performRefresh(isPullRefreshing: $isPullRefreshing) {
                    await viewModel.reloadHistoryMatches()
                }
            }
            .task {
                if viewModel.historyMatches.isEmpty {
                    await viewModel.reloadHistoryMatches()
                }
            }
            .onChange(of: viewModel.globalFilter) { _, _ in
                Task { await viewModel.reloadHistoryMatches() }
            }
            .onChange(of: viewModel.globalCustomStartDate) { _, _ in
                if viewModel.globalFilter == .custom {
                    Task { await viewModel.reloadHistoryMatches() }
                }
            }
            .onChange(of: viewModel.globalCustomEndDate) { _, _ in
                if viewModel.globalFilter == .custom {
                    Task { await viewModel.reloadHistoryMatches() }
                }
            }
            .sheet(item: $editingMatch) { match in
                MatchEditSheetView(match: match)
                    .environmentObject(viewModel)
            }
            .sheet(item: Binding(
                get: { viewModel.pendingMatchConflict },
                set: { viewModel.pendingMatchConflict = $0 }
            )) { conflict in
                MatchConflictResolutionSheet(
                    context: conflict,
                    onOverwrite: { Task { await viewModel.resolvePendingMatchConflict(with: .overwritten) } },
                    onDiscard: { Task { await viewModel.resolvePendingMatchConflict(with: .discarded) } },
                    onMerge: conflict.canMerge ? { Task { await viewModel.resolvePendingMatchConflict(with: .merged) } } : nil
                )
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
        SectionCard(title: "Globalt Filter") {
            VStack(alignment: .leading, spacing: 12) {
                // Note for non-coders:
                // This compact menu + reset button matches the slimmer web filter pattern.
                HStack(spacing: 8) {
                    Picker("Period", selection: $viewModel.globalFilter) {
                        ForEach(DashboardMatchFilter.allCases) { filter in
                            Text(filter.title).tag(filter)
                        }
                    }
                    .pickerStyle(.menu)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(Color(.secondarySystemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .sensoryFeedback(.selection, trigger: viewModel.globalFilter)

                    if viewModel.globalFilter != .all {
                        Button("Återställ") {
                            viewModel.globalFilter = .all
                        }
                        .buttonStyle(.bordered)
                        .controlSize(.small)
                    }
                }

                if viewModel.globalFilter == .custom {
                    DatePicker("Från", selection: $viewModel.globalCustomStartDate, displayedComponents: [.date])
                        .datePickerStyle(.compact)
                    DatePicker("Till", selection: $viewModel.globalCustomEndDate, displayedComponents: [.date])
                        .datePickerStyle(.compact)
                }

                Text("Aktivt filter: \(viewModel.globalActiveFilterLabel)")
                    .font(.inter(.caption))
                    .foregroundStyle(AppColors.textSecondary)
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
                // Note for non-coders:
                // These placeholders copy the final match card structure while the first page loads.
                VStack(spacing: 12) {
                    ForEach(0..<3, id: \.self) { _ in
                        SkeletonCardView {
                            VStack(alignment: .leading, spacing: 14) {
                                HStack {
                                    SkeletonBlock(height: 16, width: 74)
                                    Spacer()
                                    SkeletonBlock(height: 12, width: 120)
                                }

                                HStack(alignment: .top, spacing: 12) {
                                    SkeletonBlock(height: 54, width: 70)
                                    SkeletonBlock(height: 84)
                                }
                            }
                        }
                    }
                }
            } else if !viewModel.isHistoryLoading && viewModel.historyMatches.isEmpty {
                SectionCard(title: "Matchhistorik") {
                    VStack(spacing: 16) {
                        // Note for non-coders:
                        // We explain whether the filter removed results or if no matches
                        // have been saved yet, so the next action is obvious.
                        Text(historyEmptyReason)
                            .font(.inter(.body))
                            .foregroundStyle(AppColors.textSecondary)

                        Button {
                            viewModel.selectedMainTab = viewModel.canUseSingleGame ? 1 : 0
                        } label: {
                            Label(viewModel.canUseSingleGame ? "Registrera match" : "Gå till översikt", systemImage: viewModel.canUseSingleGame ? "plus.square.on.square" : "house")
                        }
                        .buttonStyle(.borderedProminent)
                        .font(.inter(.subheadline, weight: .bold))

                        if isHistoryFilterCausedEmpty {
                            Button("Återställ filter") {
                                viewModel.globalFilter = .all
                                Task { await viewModel.reloadHistoryMatches() }
                            }
                            .buttonStyle(.bordered)
                        }
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

    private var isHistoryFilterCausedEmpty: Bool {
        viewModel.globalFilter != .all
    }

    private var historyEmptyReason: String {
        isHistoryFilterCausedEmpty ? "Inga matcher i vald period." : "Inga matcher sparade ännu."
    }

    private func matchCard(_ match: Match) -> some View {
        NavigationLink {
            MatchDetailView(match: match)
        } label: {
            VStack(alignment: .leading, spacing: 16) {
                HStack {
                    typeLabelChip(for: match)
                    Text(dateFormattingService.historyDateLabel(match.playedAt))
                        .font(.inter(.caption))
                        .foregroundStyle(AppColors.textSecondary)
                    Spacer()

                    Menu {
                        Button {
                            editingMatch = match
                        } label: {
                            Label(LocalizedStringKey("history.edit"), systemImage: "pencil")
                        }

                        if viewModel.canDeleteMatch(match) {
                            Button(role: .destructive) {
                                matchToDelete = match
                            } label: {
                                Label(LocalizedStringKey("history.delete"), systemImage: "trash")
                            }
                        }

                        Button {
                            shareMatch(match)
                        } label: {
                            Label(LocalizedStringKey("history.share"), systemImage: "square.and.arrow.up")
                        }
                    } label: {
                        Image(systemName: "ellipsis")
                            .font(.subheadline.bold())
                            .foregroundStyle(AppColors.textSecondary)
                            .padding(4)
                    }
                }

                if dynamicTypeSize.isAccessibilitySize {
                    // Note for non-coders:
                    // Large accessibility text needs vertical flow, so we place score above teams
                    // instead of squeezing all content into one horizontal row.
                    VStack(alignment: .leading, spacing: 12) {
                        scoreSummary(match)
                        Divider().background(AppColors.borderSubtle.opacity(0.5))
                        teamDisplay(names: match.teamANames, ids: match.teamAPlayerIds, match: match, isTeamA: true)
                        Divider().background(AppColors.borderSubtle.opacity(0.5))
                        teamDisplay(names: match.teamBNames, ids: match.teamBPlayerIds, match: match, isTeamA: false)
                    }
                } else {
                    HStack(alignment: .top, spacing: 12) {
                        scoreSummary(match)
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
            }
            .padding()
            .padelSurfaceCard()
        }
        .buttonStyle(.plain)
        // Note for non-coders:
        // Swipe actions are the buttons shown when a user drags a row sideways.
        // We keep role checks here so members only see actions they are allowed to run.
        .swipeActions(edge: .trailing, allowsFullSwipe: false) {
            if viewModel.canDeleteMatch(match) {
                Button(role: .destructive) {
                    matchToDelete = match
                } label: {
                    Label(LocalizedStringKey("history.delete"), systemImage: "trash")
                }
                .tint(.red)
            }

            Button {
                editingMatch = match
            } label: {
                Label(LocalizedStringKey("history.edit"), systemImage: "pencil")
            }
            .tint(AppColors.brandPrimary)
        }
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

                    // Note for non-coders:
                    // We reuse the same avatar component here so history rows benefit from
                    // the shared image cache and do not flicker during scrolling.
                    PlayerAvatarView(urlString: avatarURL(for: row.id), size: 20)

                    Text(row.name)
                        .font(.inter(.subheadline, weight: isWinner ? .bold : .medium))
                        .foregroundStyle(isWinner ? AppColors.textPrimary : AppColors.textSecondary)
                        .lineLimit(dynamicTypeSize.isAccessibilitySize ? 2 : 1)

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

    private func scoreSummary(_ match: Match) -> some View {
        VStack(alignment: .center, spacing: 4) {
            Text(scoreLabel(match))
                .font(.inter(.title3, weight: .black))
                .foregroundStyle(AppColors.textPrimary)
            Text(match.scoreType == "points" ? String(localized: "history.score.points") : String(localized: "history.score.sets"))
                .font(.inter(.caption2, weight: .bold))
                .foregroundStyle(AppColors.textSecondary)
                .textCase(.uppercase)
        }
    }

    private func avatarURL(for playerId: String?) -> String? {
        guard let playerId,
              let uuid = UUID(uuidString: playerId.lowercased()) else {
            return nil
        }
        return viewModel.players.first(where: { $0.id == uuid })?.avatarURL
    }

    private func scoreLabel(_ match: Match) -> String {
        "\(match.teamAScore) – \(match.teamBScore)"
    }

    private func shareMatch(_ match: Match) {
        let fallbackText = """
        \(match.shareTitle)
        \(match.shareSummary)
        """

        let cardURL = try? match.createShareCardImage(title: "Padel Match", fileNamePrefix: "match-history")

        // Note for non-coders:
        // This source gives modern apps a rich preview card, but still sends plain text everywhere.
        let richTextSource = MatchShareActivityItemSource(
            text: fallbackText,
            title: match.shareTitle,
            cardImageURL: cardURL,
            metadataURL: URL(string: "https://padelnative.app/match/\(match.id.uuidString.lowercased())")!
        )

        var items: [Any] = [richTextSource]
        if let cardURL {
            items.append(cardURL)
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
