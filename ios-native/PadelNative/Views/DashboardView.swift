import SwiftUI

struct DashboardView: View {
    @EnvironmentObject private var viewModel: AppViewModel
    @State private var leaderboardSortKey: String = "elo"
    @State private var leaderboardSortAscending: Bool = false

    private let dateFormatter: DateFormatter = {
        let formatter = DateFormatter()
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
                    content(proxy: proxy)

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
                                .background(Color.accentColor)
                                .clipShape(Circle())
                                .shadow(radius: 4)
                        }
                        .padding(.bottom, 20)
                        .transition(.scale.combined(with: .opacity))
                    }
                }
            }
            .navigationTitle("Översikt")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Logga ut") {
                        viewModel.signOut()
                    }
                }
            }
            .padelLiquidGlassChrome()
            .task {
                // Note for non-coders: this keeps "dismissed" cards synced with the newest match date, like the web app.
                viewModel.syncHighlightDismissalWindow()
            }
            .refreshable {
                await viewModel.bootstrap()
            }
        }
    }

    @ViewBuilder
    private func content(proxy: ScrollViewProxy) -> some View {
        Group {
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
    }

    private var loadingState: some View {
        List {
            Section {
                ProgressView("Laddar översikt…")
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.secondary.opacity(0.15))
                    .frame(height: 90)
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.secondary.opacity(0.15))
                    .frame(height: 160)
            }
        }
    }

    private func errorState(message: String) -> some View {
        List {
            Section("Kunde inte ladda data") {
                Text(message)
                    .foregroundStyle(.red)
                Button("Försök igen") {
                    Task { await viewModel.bootstrap() }
                }
            }
        }
    }

    private var emptyState: some View {
        List {
            Section("Inga matcher ännu") {
                Text("Lägg till din första match för att låsa upp trender, highlights och MVP-kort.")
                    .foregroundStyle(.secondary)
            }
        }
    }

    private var dashboardContent: some View {
        List {
            Color.clear
                .frame(height: 1)
                .id("top")
                .listRowInsets(EdgeInsets())
                .listRowBackground(Color.clear)
                .onAppear { showScrollToTop = false }
                .onDisappear { showScrollToTop = true }

            dashboardNoticeSections
            filterSection
            mvpSection
            highlightSection
            leaderboardSection
            rivalrySection
        }
    }

    // Note for non-coders: splitting this into smaller chunks helps Swift compile faster and keeps each card easier to maintain.
    @ViewBuilder
    private var dashboardNoticeSections: some View {
        if let error = viewModel.lastErrorMessage {
            Section {
                VStack(alignment: .leading, spacing: 8) {
                    Label("Varning vid datahämtning", systemImage: "exclamationmark.triangle.fill")
                        .font(.headline)
                        .foregroundStyle(.orange)
                    Text(error)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
                .padding(.vertical, 4)
            }
        }

        if let notice = viewModel.activeTournamentNotice {
            Section {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Turnering pågår!")
                        .font(.headline)
                    Text("\(notice.name) är live nu.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    HStack {
                        Button("Visa turnering") {
                            viewModel.openTournamentTab()
                        }
                        .buttonStyle(.borderedProminent)

                        Button("Stäng") {
                            viewModel.dismissTournamentNotice()
                        }
                        .buttonStyle(.bordered)
                    }
                }
                .padding(.vertical, 4)
            }
        }

        if let upcoming = viewModel.nextScheduledGameNotice {
            Section {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Uppkommande bokning")
                        .font(.headline)
                    Text("\(upcoming.description) • \(upcoming.location)")
                        .font(.subheadline)
                    Text(dateFormatter.string(from: upcoming.startsAt))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    HStack {
                        Button("Se schema") {
                            viewModel.openScheduleTab()
                        }
                        .buttonStyle(.bordered)
                        Button("Stäng") {
                            viewModel.dismissScheduledGameNotice()
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.vertical, 4)
            }
        }

        if let recent = viewModel.latestRecentMatch {
            Section("Senaste highlight") {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Nytt resultat!")
                        .font(.headline)
                    Text("\(recent.teamAName) vs \(recent.teamBName)")
                    Text("Resultat: \(recent.teamAScore)-\(recent.teamBScore)")
                        .font(.subheadline.weight(.semibold))
                    Button("Stäng") {
                        viewModel.dismissRecentMatchNotice()
                    }
                    .buttonStyle(.plain)
                }
                .padding(.vertical, 4)
            }
        }
    }

    private var filterSection: some View {
        Section("Filter") {
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
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }

    private var mvpSection: some View {
        Section("MVP-centret") {
            if let evening = viewModel.currentMVP {
                mvpRow(title: "Kvällens MVP", result: evening)
            } else {
                Text("Ingen kvällens MVP ännu (behöver fler matcher i kväll).")
                    .foregroundStyle(.secondary)
            }

            if let monthly = viewModel.periodMVP {
                mvpRow(title: "Månadens MVP", result: monthly)
            } else {
                Text("Ingen månadens MVP ännu (behöver fler matcher den här månaden).")
                    .foregroundStyle(.secondary)
            }
        }
    }

    @ViewBuilder
    private var highlightSection: some View {
        if viewModel.showHighlightCard,
           let highlight = viewModel.latestHighlightMatch,
           let match = viewModel.matches.first(where: { $0.id == highlight.matchId }) {
            Section("Match-fokus") {
                VStack(alignment: .leading, spacing: 6) {
                    Text(highlight.title)
                        .font(.headline)
                    Text(highlight.description)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    Text("\(match.teamAName) \(match.teamAScore)-\(match.teamBScore) \(match.teamBName)")
                        .font(.caption)
                    Button("Stäng") {
                        viewModel.dismissHighlightCard()
                    }
                    .buttonStyle(.plain)
                }
                .padding(.vertical, 4)
            }
        }
    }

    private var leaderboardSection: some View {
        Section {
            ScrollView(.horizontal, showsIndicators: false) {
                VStack(alignment: .leading, spacing: 0) {
                    HStack(spacing: 0) {
                        headerCell(title: "Spelare", key: "name", width: 140, alignment: .leading)
                        headerCell(title: "ELO", key: "elo", width: 60, help: "ELO är ett rankingsystem baserat på flertal faktorer - hur stark du är, hur starkt motståndet är, hur lång matchen är, med mera.")
                        headerCell(title: "Matcher", key: "games", width: 70)
                        headerCell(title: "Vinster", key: "wins", width: 65)
                        headerCell(title: "Streak", key: "", width: 60, help: "Antal vinster (V) eller förluster (F) i rad.")
                        headerCell(title: "Form", key: "", width: 70, help: "Form baserat på ELO-förändring över de senaste matcherna.")
                        headerCell(title: "Vinst %", key: "winPct", width: 70)
                    }
                    .padding(.vertical, 8)
                    .background(Color(.systemGray6))

                    ForEach(Array(sortedLeaderboard.enumerated()), id: \.element.id) { index, player in
                        leaderboardRow(index: index, player: player)
                        Divider()
                    }
                }
            }
        } header: {
            Text("ELO-topplista")
        }
    }

    private var rivalrySection: some View {
        Section("Head-to-head") {
            if viewModel.currentRivalryAgainstStats.isEmpty {
                Text("Ingen data än.")
                    .foregroundStyle(.secondary)
            } else {
                ForEach(viewModel.currentRivalryAgainstStats.prefix(5)) { summary in
                    NavigationLink(destination: RivalryView(opponentId: summary.id)) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Du vs \(summary.opponentName)")
                                .font(.subheadline.weight(.semibold))
                            Text("\(summary.matchesPlayed) matcher • \(summary.wins) vinster")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            Text("Senaste: \(summary.lastMatchResult == "V" ? "Vinst" : "Förlust")")
                                .font(.caption2)
                                .foregroundStyle(summary.lastMatchResult == "V" ? .green : .red)
                        }
                        .padding(.vertical, 4)
                    }
                }
            }
        }
    }

    private func leaderboardRow(index: Int, player: LeaderboardPlayer) -> some View {
        NavigationLink(destination: RivalryView(opponentId: player.id)) {
            HStack(spacing: 0) {
                HStack(spacing: 8) {
                    Text("\(index + 1)")
                        .font(.caption2.monospacedDigit())
                        .foregroundStyle(.secondary)
                        .frame(width: 18, alignment: .leading)

                    HStack(spacing: 4) {
                        Text(player.name)
                            .font(.subheadline.weight(.semibold))
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
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(Color.accentColor)
                    .frame(width: 60)

                Text("\(player.games)")
                    .font(.subheadline)
                    .frame(width: 70)

                Text("\(player.wins)")
                    .font(.subheadline)
                    .frame(width: 65)

                Text(player.streak)
                    .font(.subheadline)
                    .frame(width: 60)

                Group {
                    if player.eloHistory.count >= 2 {
                        SparklineView(points: player.eloHistory)
                            .frame(width: 50, height: 20)
                            .opacity(0.8)
                    } else {
                        Text("—").font(.caption2).foregroundStyle(.secondary)
                    }
                }
                .frame(width: 70)

                Text("\(player.winRate)%")
                    .font(.subheadline.weight(.semibold))
                    .frame(width: 70)
            }
            .padding(.vertical, 10)
            .contentShape(Rectangle())
            .background(player.isMe ? Color.accentColor.opacity(0.08) : Color.clear)
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
                        .font(.caption.weight(.bold))
                        .foregroundStyle(.secondary)
                    if leaderboardSortKey == key && !key.isEmpty {
                        Image(systemName: leaderboardSortAscending ? "chevron.up" : "chevron.down")
                            .font(.system(size: 8, weight: .bold))
                            .foregroundStyle(Color.accentColor)
                    }
                }
            }
            .disabled(key.isEmpty)
            .buttonStyle(.plain)

            if let help = help {
                Menu {
                    Text(help)
                } label: {
                    Image(systemName: "info.circle")
                        .font(.system(size: 8))
                        .foregroundStyle(.secondary)
                }
            }
        }
        .frame(width: width, alignment: alignment)
    }

    private func mvpRow(title: String, result: DashboardMVPResult) -> some View {
        HStack(spacing: 12) {
            AsyncImage(url: URL(string: result.player.avatarURL ?? "")) { image in
                image.resizable().scaledToFill()
            } placeholder: {
                Image(systemName: "person.crop.circle.fill")
                    .font(.title2)
                    .foregroundStyle(Color.accentColor)
            }
            .frame(width: 44, height: 44)
            .clipShape(Circle())
            .overlay(Circle().stroke(Color.accentColor.opacity(0.1), lineWidth: 1))

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.caption2.weight(.bold))
                    .foregroundStyle(AppColors.success)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(AppColors.success.opacity(0.1), in: Capsule())

                Text(result.player.profileName)
                    .font(.headline)

                Text("\(result.wins) vinster på \(result.games) matcher • \(result.periodEloGain >= 0 ? "+" : "")\(result.periodEloGain) ELO")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer()
        }
        .padding(.vertical, 4)
    }
}
