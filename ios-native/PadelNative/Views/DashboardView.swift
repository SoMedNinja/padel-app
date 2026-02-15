import SwiftUI

struct DashboardView: View {
    @EnvironmentObject private var viewModel: AppViewModel
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    @State private var leaderboardSortKey: String = "elo"
    @State private var leaderboardSortAscending: Bool = false
    // Note for non-coders:
    // We share one formatter helper so all screens show dates the same way.
    private let dateFormattingService = DateFormattingService.shared

    private var sortedLeaderboard: [LeaderboardPlayer] {
        let base = viewModel.leaderboardPlayers
        return base.sorted { a, b in
            let result: Bool
            switch leaderboardSortKey {
            case "name": result = a.name.localizedCompare(b.name) == .orderedAscending
            case "games": result = a.games < b.games
            case "wins": result = a.wins < b.wins
            case "winPct": result = a.winRate < b.winRate
            case "elo": fallthrough
            default: result = a.elo < b.elo
            }
            return leaderboardSortAscending ? result : !result
        }
    }

    @State private var showScrollToTop = false
    @State private var pullProgress: CGFloat = 0
    @State private var isPullRefreshing = false
    @State private var pullOffsetBaseline: CGFloat?
    @State private var heatmapSortKey: String = "games"
    @State private var heatmapSortAscending: Bool = false
    @State private var lastErrorNoticeMessage: String?
    @State private var lastTournamentNoticeId: UUID?
    @State private var lastScheduledNoticeId: UUID?
    @State private var lastRecentNoticeId: UUID?

    var body: some View {
        NavigationStack {
            ScrollViewReader { proxy in
                ZStack(alignment: .bottom) {
                    ScrollView {
                        VStack(spacing: 12) {
                            ScrollOffsetTracker()
                            PadelRefreshHeader(isRefreshing: isPullRefreshing, pullProgress: pullProgress)

                            Color.clear
                                .frame(height: 0.01)
                                .id("top")
                                .onAppear { showScrollToTop = false }
                                .onDisappear { showScrollToTop = true }

                            content(proxy: proxy)
                        }
                        .padding(.horizontal)
                        .padding(.bottom, 60)
                    }
                    .background(AppColors.background)
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
                            await viewModel.bootstrap()
                        }
                    }

                    if showScrollToTop {
                        Button {
                            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                            withAnimation {
                                proxy.scrollTo("top", anchor: .top)
                            }
                        } label: {
                            Image(systemName: "chevron.up")
                                .font(.headline)
                                .foregroundStyle(.white)
                                .frame(width: 44, height: 44)
                                .background(AppColors.brandPrimary)
                                .clipShape(Circle())
                                .shadow(color: AppColors.shadowColor, radius: 4)
                        }
                        .padding(.bottom, 20)
                        .accessibilityLabel(Text("dashboard.scroll_to_top"))
                        .transition(.scale.combined(with: .opacity))
                    }
                }
            }
            .navigationTitle(LocalizedStringKey("dashboard.title"))
            .navigationBarTitleDisplayMode(.inline)
            .padelLiquidGlassChrome()
            .task {
                viewModel.syncHighlightDismissalWindow()
            }
            .onChange(of: viewModel.lastErrorMessage) { _, error in
                guard let error, error != lastErrorNoticeMessage else { return }
                lastErrorNoticeMessage = error
                FeedbackService.shared.notify(.warning)
            }
            .onChange(of: viewModel.activeTournamentNotice?.id) { _, id in
                guard let id, id != lastTournamentNoticeId else { return }
                lastTournamentNoticeId = id
                FeedbackService.shared.impact(.success)
            }
            .onChange(of: viewModel.nextScheduledGameNotice?.id) { _, id in
                guard let id, id != lastScheduledNoticeId else { return }
                lastScheduledNoticeId = id
                FeedbackService.shared.notify(.warning)
            }
            .onChange(of: viewModel.latestRecentMatch?.id) { _, id in
                guard let id, id != lastRecentNoticeId else { return }
                lastRecentNoticeId = id
                FeedbackService.shared.notify(.success)
            }
        }
    }

    @ViewBuilder
    private func content(proxy: ScrollViewProxy) -> some View {
        if viewModel.isDashboardLoading && viewModel.matches.isEmpty {
            loadingState
        } else if let error = viewModel.lastErrorMessage,
                  viewModel.players.isEmpty,
                  viewModel.matches.isEmpty {
            errorState(message: error)
        } else if viewModel.dashboardFilteredMatches.isEmpty {
            emptyState
        } else {
            dashboardContent
        }
    }

    private var loadingState: some View {
        VStack(spacing: 16) {
            // Note for non-coders:
            // These placeholder cards mirror the real dashboard sections, so loading feels stable.
            ForEach([96.0, 86.0, 132.0, 160.0], id: \.self) { height in
                SkeletonCardView {
                    VStack(alignment: .leading, spacing: 12) {
                        SkeletonBlock(height: 12, width: 120)
                        SkeletonBlock(height: 10, width: 220)
                        SkeletonBlock(height: height - 54)
                    }
                }
            }
        }
    }

    private func errorState(message: String) -> some View {
        SectionCard(title: String(localized: "dashboard.error.title")) {
            Text(message)
                .font(.inter(.body))
                .foregroundStyle(.red)
            Button(LocalizedStringKey("dashboard.retry")) {
                Task { await viewModel.bootstrap() }
            }
            .buttonStyle(.bordered)
        }
    }

    private var emptyState: some View {
        SectionCard(title: String(localized: "dashboard.empty.title")) {
            VStack(alignment: .leading, spacing: 16) {
                // Note for non-coders:
                // This line explains *why* the dashboard is empty so people know whether
                // they should change the time filter or add their first match.
                Text(dashboardEmptyReason)
                    .font(.inter(.body))
                    .foregroundStyle(AppColors.textSecondary)

                Button {
                    viewModel.selectedMainTab = viewModel.canUseSingleGame ? 1 : 2
                } label: {
                    Label(dashboardPrimaryCTA, systemImage: viewModel.canUseSingleGame ? "plus.square.on.square" : "person.crop.circle")
                        .font(.inter(.subheadline, weight: .bold))
                }
                .buttonStyle(.borderedProminent)

                if isDashboardFilterCausedEmpty {
                    Button("Återställ filter") {
                        viewModel.globalFilter = .all
                    }
                    .buttonStyle(.bordered)
                }
            }
        }
    }

    private var isDashboardFilterCausedEmpty: Bool {
        !viewModel.matches.isEmpty && viewModel.globalFilter != .all
    }

    private var dashboardEmptyReason: String {
        isDashboardFilterCausedEmpty ? "Inga matcher i vald period." : "Inga matcher registrerade ännu."
    }

    private var dashboardPrimaryCTA: String {
        viewModel.canUseSingleGame ? "Registrera match" : "Öppna profil"
    }

    private var dashboardContent: some View {
        VStack(spacing: 20) {
            dashboardNoticeSections
            filterSection
            mvpSection
            highlightSection
            leaderboardSection
            heatmapSection
            rivalrySection
        }
    }

    private var heatmapSection: some View {
        HeatmapSectionView(
            combos: viewModel.heatmapCombos,
            title: String(localized: "dashboard.heatmap.title"),
            sortKey: $heatmapSortKey,
            sortAscending: $heatmapSortAscending,
            currentPlayerName: viewModel.currentPlayer?.profileName
        )
    }

    @ViewBuilder
    private var dashboardNoticeSections: some View {
        VStack(spacing: 12) {
            if let error = viewModel.lastErrorMessage {
                AppAlert(severity: .warning, isAnimated: true) {
                    Text(LocalizedStringKey("dashboard.notice.warning_title"))
                        .font(.inter(.headline, weight: .bold))
                    Text(error)
                        .font(.inter(.footnote))
                        .foregroundStyle(AppColors.textSecondary)
                }
            }

            if let notice = viewModel.activeTournamentNotice {
                AppAlert(severity: .info, icon: "trophy.fill", isAnimated: true, onClose: {
                    viewModel.dismissTournamentNotice()
                }) {
                    Text(LocalizedStringKey("dashboard.notice.tournament_title"))
                        .font(.inter(.headline, weight: .bold))
                    Text(String(format: String(localized: "dashboard.notice.tournament_live"), notice.name))
                        .font(.inter(.subheadline))
                        .foregroundStyle(AppColors.textSecondary)
                    Button {
                        viewModel.openTournamentTab()
                    } label: {
                        Label(LocalizedStringKey("dashboard.notice.tournament_button"), systemImage: "trophy.fill")
                    }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.small)
                    .padding(.top, 4)
                }
            }

            if let upcoming = viewModel.nextScheduledGameNotice {
                AppAlert(severity: .info, icon: "timer", isAnimated: true, onClose: {
                    viewModel.dismissScheduledGameNotice()
                }) {
                    Text(LocalizedStringKey("dashboard.notice.schedule_title"))
                        .font(.inter(.headline, weight: .bold))
                    Text("\(upcoming.description ?? String(localized: "dashboard.notice.schedule_default_description")) • \(upcoming.location ?? String(localized: "dashboard.notice.schedule_default_location"))")
                        .font(.inter(.subheadline))
                    Text(dateFormattingService.fullScheduleTimestamp(upcoming.startsAt))
                        .font(.inter(.caption))
                        .foregroundStyle(AppColors.textSecondary)
                    Button {
                        viewModel.openScheduleTab()
                    } label: {
                        Label(LocalizedStringKey("dashboard.notice.schedule_button"), systemImage: "calendar")
                    }
                    .buttonStyle(.bordered)
                    .controlSize(.small)
                    .padding(.top, 4)
                }
            }

            if let recent = viewModel.latestRecentMatch {
                AppAlert(severity: .success, icon: "timer", isAnimated: true, onClose: {
                    viewModel.dismissRecentMatchNotice()
                }) {
                    Text(LocalizedStringKey("dashboard.notice.recent_title"))
                        .font(.inter(.headline, weight: .bold))
                    Text("\(recent.teamAName) vs \(recent.teamBName)")
                        .font(.inter(.body))
                    Text(String(format: String(localized: "dashboard.notice.recent_score"), String(recent.teamAScore), String(recent.teamBScore)))
                        .font(.inter(.subheadline, weight: .semibold))

                    Button {
                        viewModel.openHistoryTab()
                    } label: {
                        Label(LocalizedStringKey("dashboard.notice.recent_button"), systemImage: "clock.arrow.circlepath")
                    }
                    .buttonStyle(.bordered)
                    .controlSize(.small)
                    .padding(.top, 4)
                }
            }
        }
    }

    private var filterSection: some View {
        SectionCard(title: String(localized: "dashboard.filter.title")) {
            VStack(alignment: .leading, spacing: 12) {
                Picker(LocalizedStringKey("dashboard.filter.period"), selection: $viewModel.globalFilter) {
                    ForEach(DashboardMatchFilter.allCases) { filter in
                        Text(filter.title).tag(filter)
                    }
                }
                .pickerStyle(.segmented)
                .sensoryFeedback(.selection, trigger: viewModel.globalFilter)

                if viewModel.globalFilter == .custom {
                    DatePicker(LocalizedStringKey("dashboard.filter.from"), selection: $viewModel.globalCustomStartDate, displayedComponents: [.date])
                    DatePicker(LocalizedStringKey("dashboard.filter.to"), selection: $viewModel.globalCustomEndDate, displayedComponents: [.date])

                    Button(LocalizedStringKey("dashboard.filter.reset")) {
                        viewModel.globalFilter = .all
                    }
                    .buttonStyle(.bordered)
                }

                Text(String(format: String(localized: "dashboard.filter.active"), viewModel.globalActiveFilterLabel))
                    .font(.inter(.caption))
                    .foregroundStyle(AppColors.textSecondary)
            }
        }
    }

    private var mvpSection: some View {
        VStack(spacing: 12) {
            if let evening = viewModel.currentMVP {
                mvpCard(title: "Kvällens MVP", result: evening)
            } else {
                mvpEmptyCard(title: "Kvällens MVP")
            }

            if let monthly = viewModel.periodMVP {
                mvpCard(title: "Månadens MVP", result: monthly)
            } else {
                mvpEmptyCard(title: "Månadens MVP")
            }
        }
    }

    private func mvpCard(title: String, result: DashboardMVPResult) -> some View {
        let icon = title.lowercased().contains("kvällens") ? "🚀" : "🏆"
        let winPercent = Int((result.winRate * 100).rounded())

        // Note for non-coders:
        // This mirrors the PWA MVP card data so iOS and web show the same summary values.
        return VStack(spacing: 10) {
            Text("\(icon) \(title)")
                .font(.inter(.subheadline, weight: .bold))
                .foregroundStyle(AppColors.brandPrimary)

            Text(result.player.profileName)
                .font(.inter(.headline, weight: .bold))
                .multilineTextAlignment(.center)

            Text("\(result.wins) vinster, \(result.games) matcher, \(winPercent)% vinst, ΔELO: \(result.periodEloGain)")
                .font(.inter(.caption))
                .foregroundStyle(AppColors.textSecondary)
                .multilineTextAlignment(.center)
        }
        .padding(14)
        .frame(maxWidth: .infinity)
        .padelSurfaceCard()
    }

    private func mvpEmptyCard(title: String) -> some View {
        let icon = title.lowercased().contains("kvällens") ? "🚀" : "🏆"

        return VStack(spacing: 10) {
            Text("\(icon) \(title)")
                .font(.inter(.subheadline, weight: .bold))
                .foregroundStyle(AppColors.brandPrimary)

            Text("Inte tillräckligt många spelade matcher")
                .font(.inter(.caption))
                .foregroundStyle(AppColors.textSecondary)
                .multilineTextAlignment(.center)
        }
        .padding(14)
        .frame(maxWidth: .infinity)
        .padelSurfaceCard()
        .opacity(0.8)
    }

    @ViewBuilder
    private var highlightSection: some View {
        if viewModel.showHighlightCard,
           let highlight = viewModel.latestHighlightMatch,
           let match = viewModel.matches.first(where: { $0.id == highlight.matchId }) {

            VStack(alignment: .leading, spacing: 12) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("MATCH-FOKUS")
                            .font(.inter(.caption2, weight: .black))
                            .foregroundStyle(AppColors.textSecondary)

                        Text(highlight.title)
                            .font(.inter(.headline, weight: .bold))
                    }

                    Spacer()

                    Button {
                        viewModel.dismissHighlightCard()
                    } label: {
                        Image(systemName: "xmark")
                            .font(.caption2.bold())
                            .foregroundStyle(AppColors.textSecondary)
                            .padding(8)
                            .background(AppColors.background, in: Circle())
                    }
                    .accessibilityLabel("Dölj match-fokus")
                }

                HStack(spacing: 12) {
                    Image(systemName: highlightIcon(for: highlight.reason))
                        .font(.title3)
                        .foregroundStyle(AppColors.brandPrimary)
                        .frame(width: 44, height: 44)
                        .background(AppColors.brandPrimary.opacity(0.1), in: Circle())

                    VStack(alignment: .leading, spacing: 2) {
                        Text(highlight.description)
                            .font(.inter(.subheadline))
                            .foregroundStyle(AppColors.textSecondary)
                    }
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text("\(match.teamAName) \(match.teamAScore)–\(match.teamBScore) \(match.teamBName)")
                        .font(.inter(.subheadline, weight: .bold))
                    Text(dateFormattingService.historyDateLabel(match.playedAt))
                        .font(.inter(.caption2))
                        .foregroundStyle(AppColors.textSecondary)
                }
                .padding(.leading, 56)

                HStack {
                    Button {
                        shareHighlight(highlight, match: match)
                    } label: {
                        Label("Dela recap", systemImage: "square.and.arrow.up")
                    }
                    .buttonStyle(.bordered)
                    .controlSize(.small)
                    .font(.inter(.caption, weight: .semibold))
                }
                .padding(.leading, 56)
            }
            .padding()
            .padelSurfaceCard()
        }
    }

    private func highlightIcon(for reason: DashboardMatchHighlight.Reason) -> String {
        switch reason {
        case .upset: return "bolt.fill"
        case .thriller: return "flame.fill"
        case .crush: return "hammer.fill"
        case .titans: return "crown.fill"
        }
    }

    private func shareHighlight(_ highlight: DashboardMatchHighlight, match: Match) {
        let lines = [
            highlight.description,
            "",
            "\(match.teamAName) \(match.teamAScore)–\(match.teamBScore) \(match.teamBName)",
            "",
            "Spelad: \(dateFormattingService.historyDateLabel(match.playedAt))"
        ]

        let fileURL = try? ShareCardService.createShareImageFile(
            title: highlight.title,
            bodyLines: lines,
            fileNamePrefix: "highlight"
        )

        let fallbackText = """
        🎾 \(highlight.title)
        \(highlight.description)
        \(match.shareSummary)
        """

        let richTextSource = MatchShareActivityItemSource(
            text: fallbackText,
            title: "🎾 \(highlight.title)",
            cardImageURL: fileURL,
            metadataURL: URL(string: "https://padelnative.app/highlight/\(match.id.uuidString.lowercased())")!
        )

        var items: [Any] = [richTextSource]
        if let fileURL = fileURL {
            items.append(fileURL)
        }

        let av = UIActivityViewController(activityItems: items, applicationActivities: nil)
        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let rootVC = windowScene.windows.first?.rootViewController {
            rootVC.present(av, animated: true)
        }
    }

    private var leaderboardSection: some View {
        SectionCard(title: "ELO-topplista") {
            if dynamicTypeSize.isAccessibilitySize {
                // Note for non-coders:
                // At very large text sizes we switch from a dense table to stacked cards,
                // so labels can wrap and stay readable instead of being cut off.
                VStack(alignment: .leading, spacing: 10) {
                    ForEach(Array(sortedLeaderboard.enumerated()), id: \.element.id) { index, player in
                        leaderboardAccessibleRow(index: index, player: player)
                    }
                }
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    VStack(alignment: .leading, spacing: 0) {
                        HStack(spacing: 0) {
                            headerCell(title: "Spelare", key: "name", width: 160, alignment: .leading)
                            headerCell(title: "ELO", key: "elo", width: 60, help: "ELO är ett rankingsystem baserat på flertal faktorer.")
                            headerCell(title: "Matcher", key: "games", width: 70)
                            headerCell(title: "Vinster", key: "wins", width: 65)
                            // NOTE (för icke-kodare): Vi visar inte "Streak" i iOS-topplistan längre,
                            // så tabellen fokuserar på ELO, matcher, formkurva och vinstprocent.
                            headerCell(title: "Form", key: "", width: 70)
                            headerCell(title: "Vinst %", key: "winPct", width: 70)
                        }
                        .padding(.vertical, 10)
                        .background(AppColors.background)

                        ForEach(Array(sortedLeaderboard.enumerated()), id: \.element.id) { index, player in
                            leaderboardRow(index: index, player: player)
                            Divider()
                                .background(AppColors.borderSubtle)
                        }
                    }
                }
                .clipShape(RoundedRectangle(cornerRadius: 10))
            }
        }
    }

    private func leaderboardAccessibleRow(index: Int, player: LeaderboardPlayer) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .top, spacing: 8) {
                Text("#\(index + 1)")
                    .font(.inter(.caption, weight: .bold))
                    .foregroundStyle(AppColors.textSecondary)
                PlayerAvatarView(urlString: player.avatarURL, size: 24)
                    .overlay(Circle().stroke(AppColors.brandPrimary.opacity(0.1), lineWidth: 0.5))
                VStack(alignment: .leading, spacing: 2) {
                    Text(player.name)
                        .font(.inter(.subheadline, weight: .semibold))
                        .foregroundStyle(AppColors.textPrimary)
                        .lineLimit(3)
                    if let badgeId = player.featuredBadgeId,
                       let badgeIcon = BadgeService.getBadgeIconById(badgeId) {
                        Text("Märke: \(badgeIcon)")
                            .font(.inter(.caption2))
                            .foregroundStyle(AppColors.textSecondary)
                    }
                }
                Spacer(minLength: 0)
            }

            HStack {
                statPair(label: "ELO", value: "\(player.elo)", valueColor: AppColors.brandPrimary)
                statPair(label: "Matcher", value: "\(player.games)")
                statPair(label: "Vinster", value: "\(player.wins)")
                statPair(label: "Vinst %", value: "\(player.winRate)%")
            }

            if player.eloHistory.count >= 2 {
                SparklineView(points: player.eloHistory)
                    .frame(height: 24)
                    .opacity(0.8)
                    .accessibilityHidden(true)
            }
        }
        .padding(12)
        .background(player.isMe ? AppColors.brandPrimary.opacity(0.08) : AppColors.background)
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    private func statPair(label: String, value: String, valueColor: Color = AppColors.textPrimary) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label)
                .font(.inter(.caption2, weight: .bold))
                .foregroundStyle(AppColors.textSecondary)
            Text(value)
                .font(.inter(.subheadline, weight: .semibold))
                .foregroundStyle(valueColor)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var rivalrySection: some View {
        SectionCard(title: "Head-to-head") {
            VStack(spacing: 16) {
                Picker("Läge", selection: $viewModel.dashboardRivalryMode) {
                    Text("Mot").tag("against")
                    Text("Med").tag("together")
                }
                .pickerStyle(.segmented)

                Picker("Spelare", selection: $viewModel.dashboardRivalryOpponentId) {
                    Text("Välj spelare").tag(UUID?.none)
                    ForEach(viewModel.players.filter { $0.id != viewModel.currentPlayer?.id }) { player in
                        Text(player.profileName).tag(UUID?.init(player.id))
                    }
                }
                .pickerStyle(.menu)

                let stats = viewModel.dashboardRivalryMode == "against" ? viewModel.currentRivalryAgainstStats : viewModel.currentRivalryTogetherStats
                let currentOpponentId = viewModel.dashboardRivalryOpponentId ?? stats.first?.id

                if let opponentId = currentOpponentId {
                    rivalryDetailContent(opponentId: opponentId)
                } else {
                    Text("Välj en spelare ovan för att se statistik.")
                        .font(.inter(.caption))
                        .foregroundStyle(AppColors.textSecondary)
                        .padding(.vertical, 20)
                }
            }
        }
    }

    @ViewBuilder
    private func rivalryDetailContent(opponentId: UUID) -> some View {
        let stats = viewModel.dashboardRivalryMode == "against" ? viewModel.currentRivalryAgainstStats : viewModel.currentRivalryTogetherStats
        if let summary = stats.first(where: { $0.id == opponentId }) {
            VStack(spacing: 20) {
                rivalryHeader(summary: summary)

                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                    rivalStat(label: "Matcher", value: "\(summary.matchesPlayed)")
                    rivalStat(label: "Vinst/förlust", value: "\(summary.wins) - \(summary.losses)")
                    rivalStat(label: "Vinst %", value: "\(Int((summary.winRate) * 100))%")
                    rivalStat(label: "Totala set", value: "\(summary.totalSetsFor) - \(summary.totalSetsAgainst)")
                    rivalStat(label: "Start-serve", value: "\(summary.serveFirstWins) - \(summary.serveFirstLosses)")
                    rivalStat(label: "Mottagning", value: "\(summary.serveSecondWins) - \(summary.serveSecondLosses)")
                    rivalStat(label: "Högsta ELO", value: "\(summary.highestElo)")
                    rivalStat(label: "Månadens MVP-dagar", value: "\(summary.monthlyMvpDays)")
                    rivalStat(label: "Kvällens MVP", value: "\(summary.eveningMvps)")
                    rivalStat(label: "Gemensamma turneringar", value: "\(summary.commonTournaments)")
                    rivalStat(label: "Dina turneringsvinster", value: "\(summary.commonTournamentWins)")

                    if viewModel.dashboardRivalryMode == "against" {
                        rivalStat(label: "Vinstchans", value: "\(Int(round(summary.winProbability * 100)))%")
                        rivalStat(label: "ELO-utbyte", value: "\(summary.eloDelta >= 0 ? "+" : "")\(summary.eloDelta)", color: summary.eloDelta >= 0 ? AppColors.success : AppColors.error)
                    }
                }

                if !summary.recentResults.isEmpty {
                    VStack(spacing: 8) {
                        Text("FORM (SENASTE 5)")
                            .font(.inter(.caption2, weight: .black))
                            .foregroundStyle(AppColors.textSecondary)
                        HStack(spacing: 8) {
                            ForEach(Array(summary.recentResults.enumerated()), id: \.offset) { _, res in
                                Text(res)
                                    .font(.inter(size: 8, weight: .bold))
                                    .foregroundStyle(.white)
                                    .frame(width: 20, height: 20)
                                    .background(res == "V" ? AppColors.success : AppColors.error)
                                    .clipShape(Circle())
                            }
                        }
                    }
                }
            }
            .padding(.top, 10)
        } else {
            Text("Ingen matchhistorik hittades för denna kombination.")
                .font(.inter(.caption))
                .foregroundStyle(AppColors.textSecondary)
                .padding(.vertical, 20)
        }
    }

    private func rivalryHeader(summary: RivalrySummary) -> some View {
        HStack(spacing: 12) {
            rivalryPlayerAvatar(player: viewModel.currentPlayer, label: "Du")
            Text(viewModel.dashboardRivalryMode == "against" ? "VS" : "&")
                .font(.inter(.headline, weight: .black))
                .foregroundStyle(AppColors.textSecondary.opacity(0.3))

            let opponent = viewModel.players.first(where: { $0.id == summary.id })
            rivalryPlayerAvatar(player: opponent, label: viewModel.dashboardRivalryMode == "against" ? "Motstånd" : "Partner")
        }
        .padding(.vertical, 10)
    }

    private func rivalryPlayerAvatar(player: Player?, label: String) -> some View {
        let elo = (player?.id).flatMap { viewModel.playerBadgeStats[$0]?.currentElo } ?? player?.elo ?? 1000

        return VStack(spacing: 6) {
            PlayerAvatarView(urlString: player?.avatarURL, size: 44)
                .overlay(Circle().stroke(AppColors.brandPrimary.opacity(0.1), lineWidth: 1))
            Text(player?.profileName ?? "Okänd")
                .font(.inter(.caption, weight: .bold))
                .lineLimit(1)
            Text("ELO \(elo)")
                .font(.inter(size: 8))
                .foregroundStyle(AppColors.textSecondary)
        }
        .frame(maxWidth: .infinity)
    }

    private func rivalStat(label: String, value: String, color: Color = AppColors.textPrimary) -> some View {
        VStack(spacing: 2) {
            Text(label.uppercased())
                .font(.inter(size: 8, weight: .bold))
                .foregroundStyle(AppColors.textSecondary)
            Text(value)
                .font(.inter(.subheadline, weight: .bold))
                .foregroundStyle(color)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
        .background(AppColors.background.opacity(0.5))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    private func leaderboardRow(index: Int, player: LeaderboardPlayer) -> some View {
        HStack(spacing: 0) {
            HStack(spacing: 8) {
                Text("\(index + 1)")
                    .font(.inter(.caption2, weight: .medium))
                    .monospacedDigit()
                    .foregroundStyle(AppColors.textSecondary)
                    .frame(width: 18, alignment: .leading)

                HStack(spacing: 6) {
                    PlayerAvatarView(urlString: player.avatarURL, size: 24)
                        .overlay(Circle().stroke(AppColors.brandPrimary.opacity(0.1), lineWidth: 0.5))

                    HStack(spacing: 4) {
                        Text(player.name)
                            .font(.inter(.subheadline, weight: .semibold))
                            .foregroundStyle(AppColors.textPrimary)
                            .lineLimit(1)
                        if let badgeId = player.featuredBadgeId,
                           let badgeIcon = BadgeService.getBadgeIconById(badgeId) {
                            Text(badgeIcon)
                                .font(.caption2)
                        }
                    }
                }
            }
            .frame(width: 160, alignment: .leading)

            Text("\(player.elo)")
                .font(.inter(.subheadline, weight: .bold))
                .foregroundStyle(AppColors.brandPrimary)
                .frame(width: 60)

            Text("\(player.games)")
                .font(.inter(.subheadline))
                .foregroundStyle(AppColors.textPrimary)
                .frame(width: 70)

            Text("\(player.wins)")
                .font(.inter(.subheadline))
                .foregroundStyle(AppColors.textPrimary)
                .frame(width: 65)

            Group {
                if player.eloHistory.count >= 2 {
                    SparklineView(points: player.eloHistory)
                        .frame(width: 50, height: 20)
                        .opacity(0.8)
                } else {
                    Text("—").font(.inter(.caption2)).foregroundStyle(AppColors.textSecondary)
                }
            }
            .frame(width: 70)

            Text("\(player.winRate)%")
                .font(.inter(.subheadline, weight: .semibold))
                .foregroundStyle(AppColors.textPrimary)
                .frame(width: 70)
        }
        .padding(.vertical, 10)
        .contentShape(Rectangle())
        .background(player.isMe ? AppColors.brandPrimary.opacity(0.08) : Color.clear)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(index + 1). \(player.name), \(player.elo) ELO. \(player.games) matcher, \(player.wins) vinster, \(player.winRate) procent vinst.")
    }

    private func headerCell(title: String, key: String, width: CGFloat, alignment: Alignment = .center, help: String? = nil) -> some View {
        HStack(spacing: 2) {
            Button {
                if !key.isEmpty {
                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                    if leaderboardSortKey == key {
                        leaderboardSortAscending.toggle()
                    } else {
                        leaderboardSortKey = key
                        leaderboardSortAscending = false
                    }
                }
            } label: {
                HStack(spacing: 2) {
                    Text(title)
                        .font(.inter(.caption, weight: .bold))
                        .foregroundStyle(AppColors.textSecondary)
                    if leaderboardSortKey == key && !key.isEmpty {
                        Image(systemName: leaderboardSortAscending ? "chevron.up" : "chevron.down")
                            .font(.system(size: 8, weight: .bold))
                            .foregroundStyle(AppColors.brandPrimary)
                    }
                }
            }
            .disabled(key.isEmpty)
            .buttonStyle(.plain)
            .accessibilityLabel(title)
            .accessibilityValue(leaderboardSortKey == key ? (leaderboardSortAscending ? "Sorterat stigande" : "Sorterat fallande") : "")
            .accessibilityAddTraits(.isButton)
            .accessibilityHint(key.isEmpty ? "" : "Tryck för att sortera efter \(title.lowercased())")

            if let help = help {
                Menu {
                    Text(help)
                        .font(.inter(.footnote))
                } label: {
                    Image(systemName: "info.circle")
                        .font(.system(size: 8))
                        .foregroundStyle(AppColors.textSecondary)
                }
                .accessibilityLabel("Mer information om \(title.lowercased())")
            }
        }
        .frame(width: width, alignment: alignment)
    }
}
