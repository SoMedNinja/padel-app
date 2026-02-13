import SwiftUI

struct DashboardView: View {
    @EnvironmentObject private var viewModel: AppViewModel
    @State private var leaderboardSortKey: String = "elo"
    @State private var leaderboardSortAscending: Bool = false

    private let dateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = AppConfig.swedishLocale
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter
    }()

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

    var body: some View {
        NavigationStack {
            ScrollViewReader { proxy in
                ZStack(alignment: .bottom) {
                    ScrollView {
                        VStack(spacing: 20) {
                            Color.clear
                                .frame(height: 1)
                                .id("top")
                                .onAppear { showScrollToTop = false }
                                .onDisappear { showScrollToTop = true }

                            content(proxy: proxy)
                        }
                        .padding()
                        .padding(.bottom, 60)
                    }
                    .background(AppColors.background)
                    .refreshable {
                        await viewModel.bootstrap()
                    }

                    if showScrollToTop {
                        Button {
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
                        .transition(.scale.combined(with: .opacity))
                    }
                }
            }
            .navigationTitle("Översikt")
            .navigationBarTitleDisplayMode(.inline)
            .padelLiquidGlassChrome()
            .task {
                viewModel.syncHighlightDismissalWindow()
            }
        }
    }

    @ViewBuilder
    private func content(proxy: ScrollViewProxy) -> some View {
        if viewModel.isDashboardLoading {
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
            ProgressView("Laddar översikt…")
                .font(.inter(.body))

            ForEach(0..<3) { _ in
                RoundedRectangle(cornerRadius: 14)
                    .fill(AppColors.surface)
                    .frame(height: 120)
                    .overlay(
                        RoundedRectangle(cornerRadius: 14)
                            .stroke(AppColors.borderSubtle, lineWidth: 1)
                    )
            }
        }
    }

    private func errorState(message: String) -> some View {
        SectionCard(title: "Kunde inte ladda data") {
            Text(message)
                .font(.inter(.body))
                .foregroundStyle(.red)
            Button("Försök igen") {
                Task { await viewModel.bootstrap() }
            }
            .buttonStyle(.bordered)
        }
    }

    private var emptyState: some View {
        SectionCard(title: "Inga matcher ännu") {
            Text("Lägg till din första match för att låsa upp trender, highlights och MVP-kort.")
                .font(.inter(.body))
                .foregroundStyle(AppColors.textSecondary)
        }
    }

    private var dashboardContent: some View {
        VStack(spacing: 20) {
            dashboardNoticeSections
            filterSection
            mvpSection
            highlightSection
            leaderboardSection
            rivalrySection
        }
    }

    @ViewBuilder
    private var dashboardNoticeSections: some View {
        VStack(spacing: 12) {
            if let error = viewModel.lastErrorMessage {
                AppAlert(severity: .warning) {
                    Text("Varning vid datahämtning")
                        .font(.inter(.headline, weight: .bold))
                    Text(error)
                        .font(.inter(.footnote))
                        .foregroundStyle(AppColors.textSecondary)
                }
            }

            if let notice = viewModel.activeTournamentNotice {
                AppAlert(severity: .info, icon: "play.fill", onClose: {
                    viewModel.dismissTournamentNotice()
                }) {
                    Text("Turnering pågår!")
                        .font(.inter(.headline, weight: .bold))
                    Text("\(notice.name) är live nu.")
                        .font(.inter(.subheadline))
                        .foregroundStyle(AppColors.textSecondary)
                    Button("Visa turnering") {
                        viewModel.openTournamentTab()
                    }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.small)
                    .padding(.top, 4)
                }
            }

            if let upcoming = viewModel.nextScheduledGameNotice {
                AppAlert(severity: .info, icon: "timer", onClose: {
                    viewModel.dismissScheduledGameNotice()
                }) {
                    Text("Uppkommande bokning")
                        .font(.inter(.headline, weight: .bold))
                    Text("\(upcoming.description ?? "Bokning") • \(upcoming.location ?? "Okänd bana")")
                        .font(.inter(.subheadline))
                    Text(dateFormatter.string(from: upcoming.startsAt))
                        .font(.inter(.caption))
                        .foregroundStyle(AppColors.textSecondary)
                    Button("Se schema") {
                        viewModel.openScheduleTab()
                    }
                    .buttonStyle(.bordered)
                    .controlSize(.small)
                    .padding(.top, 4)
                }
            }

            if let recent = viewModel.latestRecentMatch {
                AppAlert(severity: .success, icon: "timer", onClose: {
                    viewModel.dismissRecentMatchNotice()
                }) {
                    Text("Nytt resultat!")
                        .font(.inter(.headline, weight: .bold))
                    Text("\(recent.teamAName) vs \(recent.teamBName)")
                        .font(.inter(.body))
                    Text("Resultat: \(recent.teamAScore)–\(recent.teamBScore)")
                        .font(.inter(.subheadline, weight: .semibold))

                    Button("Se alla") {
                        viewModel.openHistoryTab()
                    }
                    .buttonStyle(.bordered)
                    .controlSize(.small)
                    .padding(.top, 4)
                }
            }
        }
    }

    private var filterSection: some View {
        SectionCard(title: "Filter") {
            VStack(alignment: .leading, spacing: 12) {
                Picker("Period", selection: $viewModel.dashboardFilter) {
                    ForEach(DashboardMatchFilter.allCases) { filter in
                        Text(filter.title).tag(filter)
                    }
                }
                .pickerStyle(.segmented)

                if viewModel.dashboardFilter == .custom {
                    DatePicker("Från", selection: $viewModel.dashboardCustomStartDate, displayedComponents: [.date])
                    DatePicker("Till", selection: $viewModel.dashboardCustomEndDate, displayedComponents: [.date])

                    Button("Återställ") {
                        viewModel.dashboardFilter = .all
                    }
                    .buttonStyle(.bordered)
                }

                Text("Aktivt filter: \(viewModel.dashboardActiveFilterLabel)")
                    .font(.inter(.caption))
                    .foregroundStyle(AppColors.textSecondary)
            }
        }
    }

    private var mvpSection: some View {
        HStack(spacing: 16) {
            if let evening = viewModel.currentMVP {
                mvpMiniCard(title: "Kvällens MVP", result: evening)
            } else {
                mvpEmptyMiniCard(title: "Kvällens MVP")
            }

            if let monthly = viewModel.periodMVP {
                mvpMiniCard(title: "Månadens MVP", result: monthly)
            } else {
                mvpEmptyMiniCard(title: "Månadens MVP")
            }
        }
    }

    private func mvpMiniCard(title: String, result: DashboardMVPResult) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.inter(.caption2, weight: .black))
                .foregroundStyle(AppColors.textSecondary)
                .textCase(.uppercase)

            HStack(spacing: 10) {
                PlayerAvatarView(urlString: result.player.avatarURL, size: 36)
                    .overlay(Circle().stroke(AppColors.success.opacity(0.2), lineWidth: 1))

                VStack(alignment: .leading, spacing: 0) {
                    Text(result.player.profileName)
                        .font(.inter(.subheadline, weight: .bold))
                        .lineLimit(1)
                    Text("\(result.wins)V • \(result.periodEloGain >= 0 ? "+" : "")\(result.periodEloGain)")
                        .font(.inter(.caption2))
                        .foregroundStyle(AppColors.textSecondary)
                }
            }
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .padelSurfaceCard()
    }

    private func mvpEmptyMiniCard(title: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.inter(.caption2, weight: .black))
                .foregroundStyle(AppColors.textSecondary)
                .textCase(.uppercase)

            Text("Ingen data")
                .font(.inter(.caption))
                .foregroundStyle(AppColors.textSecondary)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.vertical, 4)
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .padelSurfaceCard()
        .opacity(0.6)
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
                    Text(dateFormatter.string(from: match.playedAt))
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
            "Spelad: \(dateFormatter.string(from: match.playedAt))"
        ]

        let fileURL = try? ShareCardService.createShareImageFile(
            title: highlight.title,
            bodyLines: lines,
            fileNamePrefix: "highlight"
        )

        let text = """
        🎾 Match Highlight: \(highlight.title)

        \(highlight.description)

        \(match.teamAName) \(match.teamAScore)–\(match.teamBScore) \(match.teamBName)
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

    private var leaderboardSection: some View {
        SectionCard(title: "ELO-topplista") {
            ScrollView(.horizontal, showsIndicators: false) {
                VStack(alignment: .leading, spacing: 0) {
                    HStack(spacing: 0) {
                        headerCell(title: "Spelare", key: "name", width: 140, alignment: .leading)
                        headerCell(title: "ELO", key: "elo", width: 60, help: "ELO är ett rankingsystem baserat på flertal faktorer.")
                        headerCell(title: "Matcher", key: "games", width: 70)
                        headerCell(title: "Vinster", key: "wins", width: 65)
                        headerCell(title: "Streak", key: "", width: 60, help: "Antal vinster (V) eller förluster (F) i rad.")
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

    private var rivalrySection: some View {
        SectionCard(title: "Head-to-head") {
            if viewModel.currentRivalryAgainstStats.isEmpty {
                Text("Ingen data än.")
                    .font(.inter(.body))
                    .foregroundStyle(AppColors.textSecondary)
            } else {
                VStack(spacing: 16) {
                    Picker("Läge", selection: $viewModel.dashboardRivalryMode) {
                        Text("Mot").tag("against")
                        Text("Med").tag("together")
                    }
                    .pickerStyle(.segmented)

                    let stats = viewModel.dashboardRivalryMode == "against" ? viewModel.currentRivalryAgainstStats : viewModel.currentRivalryTogetherStats
                    let currentOpponentId = viewModel.dashboardRivalryOpponentId ?? stats.first?.id

                    Picker("Spelare", selection: $viewModel.dashboardRivalryOpponentId) {
                        Text("Välj spelare").tag(UUID?.none)
                        ForEach(viewModel.players.filter { $0.id != viewModel.currentPlayer?.id }) { player in
                            Text(player.profileName).tag(UUID?.init(player.id))
                        }
                    }
                    .pickerStyle(.menu)

                    if let featured = stats.first(where: { $0.id == currentOpponentId }) {
                        featuredRivalryCard(featured)
                    } else {
                        Text("Ingen data för vald kombination.")
                            .font(.inter(.caption))
                            .foregroundStyle(AppColors.textSecondary)
                    }

                    VStack(spacing: 0) {
                        let listStats = (viewModel.dashboardRivalryMode == "against" ? viewModel.currentRivalryAgainstStats : viewModel.currentRivalryTogetherStats)
                        let currentFeaturedId = viewModel.dashboardRivalryOpponentId ?? listStats.first?.id

                        ForEach(listStats.prefix(6).filter { $0.id != currentFeaturedId }) { summary in
                            NavigationLink(destination: RivalryView(opponentId: summary.id)) {
                                HStack {
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(viewModel.dashboardRivalryMode == "against" ? "Du vs \(summary.opponentName)" : "Du & \(summary.opponentName)")
                                            .font(.inter(.subheadline, weight: .semibold))
                                            .foregroundStyle(AppColors.textPrimary)
                                        Text("\(summary.matchesPlayed) matcher • \(summary.wins) vinster")
                                            .font(.inter(.caption))
                                            .foregroundStyle(AppColors.textSecondary)
                                    }
                                    Spacer()
                                    Text(summary.lastMatchResult == "V" ? "Vinst" : "Förlust")
                                        .font(.inter(.caption2, weight: .bold))
                                        .foregroundStyle(summary.lastMatchResult == "V" ? AppColors.success : AppColors.error)
                                        .padding(.horizontal, 8)
                                        .padding(.vertical, 4)
                                        .background((summary.lastMatchResult == "V" ? AppColors.success : AppColors.error).opacity(0.1), in: Capsule())
                                }
                                .padding(.vertical, 10)
                            }
                            Divider()
                                .background(AppColors.borderSubtle)
                        }
                    }
                }
            }
        }
    }

    private func featuredRivalryCard(_ summary: RivalrySummary) -> some View {
        NavigationLink(destination: RivalryView(opponentId: summary.id)) {
            VStack(spacing: 16) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("DIN STÖRSTA RIVAL")
                            .font(.inter(.caption2, weight: .black))
                            .foregroundStyle(AppColors.textSecondary)
                        Text(summary.opponentName)
                            .font(.inter(.title3, weight: .bold))
                            .foregroundStyle(AppColors.textPrimary)
                    }
                    Spacer()
                    PlayerAvatarView(urlString: summary.opponentAvatarURL, size: 50)
                        .overlay(Circle().stroke(AppColors.brandPrimary.opacity(0.2), lineWidth: 1))
                }

                HStack(spacing: 20) {
                    rivalStat(label: "Matcher", value: "\(summary.matchesPlayed)")
                    rivalStat(label: "Vinster", value: "\(summary.wins)", color: AppColors.success)
                    rivalStat(label: "Vinstchans", value: "\(Int(round(summary.winProbability * 100)))%")
                }

                HStack {
                    Text("Senaste: \(summary.lastMatchResult == "V" ? "Vinst" : "Förlust")")
                        .font(.inter(.caption, weight: .bold))
                        .foregroundStyle(summary.lastMatchResult == "V" ? AppColors.success : AppColors.error)

                    Spacer()

                    HStack(spacing: 4) {
                        ForEach(Array(summary.recentResults.prefix(5).enumerated()), id: \.offset) { _, res in
                            Text(res)
                                .font(.inter(size: 8, weight: .bold))
                                .foregroundStyle(.white)
                                .frame(width: 16, height: 16)
                                .background(res == "V" ? AppColors.success : AppColors.error)
                                .clipShape(Circle())
                        }
                    }
                }
            }
            .padding()
            .background(AppColors.background)
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
        .buttonStyle(.plain)
    }

    private func rivalStat(label: String, value: String, color: Color = AppColors.textPrimary) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label.uppercased())
                .font(.inter(size: 8, weight: .bold))
                .foregroundStyle(AppColors.textSecondary)
            Text(value)
                .font(.inter(.subheadline, weight: .bold))
                .foregroundStyle(color)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func leaderboardRow(index: Int, player: LeaderboardPlayer) -> some View {
        NavigationLink(destination: RivalryView(opponentId: player.id)) {
            HStack(spacing: 0) {
                HStack(spacing: 8) {
                    Text("\(index + 1)")
                        .font(.inter(.caption2, weight: .medium))
                        .monospacedDigit()
                        .foregroundStyle(AppColors.textSecondary)
                        .frame(width: 18, alignment: .leading)

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
                .frame(width: 140, alignment: .leading)

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

                Text(player.streak)
                    .font(.inter(.subheadline))
                    .foregroundStyle(AppColors.textPrimary)
                    .frame(width: 60)

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
        }
        .buttonStyle(.plain)
    }

    private func headerCell(title: String, key: String, width: CGFloat, alignment: Alignment = .center, help: String? = nil) -> some View {
        HStack(spacing: 2) {
            Button {
                if !key.isEmpty {
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

            if let help = help {
                Menu {
                    Text(help)
                        .font(.inter(.footnote))
                } label: {
                    Image(systemName: "info.circle")
                        .font(.system(size: 8))
                        .foregroundStyle(AppColors.textSecondary)
                }
            }
        }
        .frame(width: width, alignment: alignment)
    }
}
