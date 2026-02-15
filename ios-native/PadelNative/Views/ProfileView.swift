import Charts
import SwiftUI

private enum ProfileTab: String, CaseIterable, Identifiable {
    case overview
    case eloTrend
    case teammates
    case merits

    var id: String { rawValue }

    var title: String {
        switch self {
        case .overview: return "Profil"
        case .eloTrend: return "ELO trend"
        case .teammates: return "Lagkamrater"
        case .merits: return "Meriter"
        }
    }
}

struct BadgeGroup: Identifiable {
    let id: String
    let label: String
    let order: Int
    var items: [Badge]
}

struct ProfileView: View {
    @EnvironmentObject private var viewModel: AppViewModel
    @State private var selectedTab: ProfileTab = .overview
    @State private var compareWithIds: Set<UUID> = []
    @State private var selectedMeritSection: String = "earned"
    @State private var pullProgress: CGFloat = 0
    @State private var chartSelectionIndex: Int?
    @State private var profileTimeRange: TrendChartTimeRange = .days90
    @State private var primaryMetric: TrendChartMetric = .elo
    @State private var secondaryMetric: TrendChartMetric = .winRate

    private var profileFilterOptions: [DashboardMatchFilter] {
        [.last7, .last30, .tournaments, .custom, .all]
    }

    // Note for non-coders:
    // We keep a fixed color palette so each compared player gets a stable, distinct line color.
    private let trendPalette: [Color] = [.blue, .green, .orange, .purple, .pink, .teal, .indigo, .brown]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    ScrollOffsetTracker()
                    PadelRefreshHeader(isRefreshing: viewModel.isDashboardLoading && !viewModel.players.isEmpty, pullProgress: pullProgress)

                    if let current = viewModel.currentPlayer {
                        headerSection(current)
                        tabSelector
                        selectedTabContent(for: current)
                    } else if viewModel.isGuestMode {
                        tabSelector
                        guestModeSection
                    }
                }
                .padding(.horizontal)
                .padding(.top, 4)
                .padding(.bottom, 40)
            }
            .background(AppColors.background)
            .coordinateSpace(name: "padelScroll")
            .onPreferenceChange(ScrollOffsetPreferenceKey.self) { offset in
                let threshold: CGFloat = 80
                pullProgress = max(0, min(1.0, offset / threshold))
            }
            .refreshable {
                await viewModel.bootstrap()
            }
            .navigationTitle("Profil")
            .navigationBarTitleDisplayMode(.inline)
            .task {
                viewModel.syncProfileSetupDraftFromCurrentPlayer()
            }
            .padelLiquidGlassChrome()
        }
    }

    private var tabSelector: some View {
        VStack(spacing: 12) {
            Picker("Profile tab", selection: $selectedTab) {
                ForEach(ProfileTab.allCases) { tab in
                    Text(tab.title).tag(tab)
                }
            }
            .pickerStyle(.segmented)

            if selectedTab == .overview || selectedTab == .eloTrend {
                SectionCard(title: "Globalt Filter") {
                    VStack(alignment: .leading, spacing: 10) {
                        Picker("Period", selection: $viewModel.globalFilter) {
                            ForEach(profileFilterOptions) { filter in
                                Text(filter.title).tag(filter)
                            }
                        }
                        .pickerStyle(.segmented)

                        if viewModel.globalFilter == .custom {
                            DatePicker("Från", selection: $viewModel.globalCustomStartDate, displayedComponents: [.date])
                            DatePicker("Till", selection: $viewModel.globalCustomEndDate, displayedComponents: [.date])
                        }

                        Text("Aktivt filter: \(viewModel.globalActiveFilterLabel)")
                            .font(.inter(.caption))
                            .foregroundStyle(AppColors.textSecondary)
                    }
                }
            }
        }
    }



    private var guestModeSection: some View {
        SectionCard(title: "Gästläge") {
            Text("Gästläge är skrivskyddat. Du kan se statistik, men för att spara matcher eller ändra profil krävs ett konto.")
                .font(.inter(.footnote))
                .foregroundStyle(AppColors.textSecondary)

            Button("Logga in") {
                viewModel.exitGuestMode()
            }
            .buttonStyle(.borderedProminent)
            .font(.inter(.subheadline, weight: .bold))
        }
    }

    @ViewBuilder
    private func selectedTabContent(for current: Player) -> some View {
        switch selectedTab {
        case .overview:
            overviewTab(current)
        case .eloTrend:
            eloTrendTab
        case .teammates:
            teammatesTab
        case .merits:
            meritsTab(current)
        }
    }

    private func overviewTab(_ current: Player) -> some View {
        Group {
            if viewModel.profileMatchesPlayed == 0 {
                SectionCard(title: "Välkommen!") {
                    Text("Du har inte registrerat några matcher ännu. Spela din första match för att få en placering på ledartavlan och låsa upp mer statistik!")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
            performanceSection
            synergyRivalrySection
        }
    }

    private func headerSection(_ current: Player) -> some View {
        VStack(spacing: 20) {
            HStack(spacing: 20) {
                PlayerAvatarView(urlString: current.avatarURL, size: 100)
                    .shadow(color: AppColors.shadowColor, radius: 8, x: 0, y: 4)

                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Text(current.profileName)
                            .font(.inter(.title2, weight: .bold))
                            .foregroundStyle(AppColors.textPrimary)

                        Spacer()

                        if let cardURL = viewModel.generatePlayerStatsCard() {
                            ShareLink(item: cardURL) {
                                Image(systemName: "square.and.arrow.up")
                                    .font(.body.bold())
                                    .foregroundStyle(AppColors.brandPrimary)
                                    .padding(8)
                                    .background(AppColors.brandPrimary.opacity(0.1), in: Circle())
                            }
                        }
                    }

                    HStack(spacing: 4) {
                        Text("ELO: \(current.elo)")
                            .font(.inter(.headline, weight: .bold))
                            .foregroundStyle(AppColors.brandPrimary)

                        if let badgeId = current.featuredBadgeId,
                           let badgeIcon = BadgeService.getBadgeIconById(badgeId) {
                            Text("•")
                                .foregroundStyle(AppColors.textSecondary)
                            Text(badgeIcon)
                                .font(.inter(.subheadline))
                        }
                    }
                }
                Spacer()
            }

            if let message = viewModel.profileSetupMessage {
                Text(message)
                    .font(.inter(.caption2))
                    .foregroundStyle(AppColors.textSecondary)
            }
        }
        .padding()
        .padelSurfaceCard()
    }

    private var eloTrendTab: some View {
        SectionCard(title: "ELO-tidslinje") {
            VStack(alignment: .leading, spacing: 12) {
                metricControls
                comparisonChips

                let playerIds = (viewModel.currentPlayer?.id).map { [$0] + Array(compareWithIds) } ?? Array(compareWithIds)
                let datasetState = viewModel.comparisonChartDataset(playerIds: playerIds, filter: viewModel.globalFilter, timeRange: profileTimeRange)

                switch datasetState {
                case .loading:
                    ProgressView("Laddar trenddata…")
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 30)
                case .error(let message):
                    Text(message)
                        .foregroundStyle(.red)
                        .font(.caption)
                case .empty(let message):
                    Text(message)
                        .foregroundStyle(.secondary)
                        .padding(.vertical, 24)
                        .frame(maxWidth: .infinity)
                case .ready(let dataset):
                    trendChartContent(dataset: dataset)

                    NavigationLink {
                        EloTrendDetailView(playerIds: playerIds, filter: viewModel.globalFilter)
                    } label: {
                        Label("Fullständig analys", systemImage: "arrow.up.left.and.arrow.down.right")
                            .font(.inter(.subheadline, weight: .bold))
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 10)
                    }
                    .buttonStyle(.bordered)
                    .padding(.top, 10)
                }
            }
        }
    }

    // Note for non-coders:
    // These controls let you decide which time window and two metrics to compare in one chart.
    private var metricControls: some View {
        VStack(alignment: .leading, spacing: 10) {
            Picker("Tidsintervall", selection: $profileTimeRange) {
                ForEach(TrendChartTimeRange.allCases) { range in
                    Text(range.title).tag(range)
                }
            }
            .pickerStyle(.segmented)

            HStack {
                Picker("Primär", selection: $primaryMetric) {
                    ForEach(TrendChartMetric.allCases) { metric in
                        Text(metric.title).tag(metric)
                    }
                }
                Picker("Sekundär", selection: $secondaryMetric) {
                    ForEach(TrendChartMetric.allCases) { metric in
                        Text(metric.title).tag(metric)
                    }
                }
            }
            .pickerStyle(.menu)
            .onChange(of: primaryMetric) { newValue in
                if secondaryMetric == newValue { secondaryMetric = newValue == .elo ? .winRate : .elo }
            }
            .onChange(of: secondaryMetric) { newValue in
                if primaryMetric == newValue { primaryMetric = newValue == .elo ? .winRate : .elo }
            }
        }
    }

    private var comparisonChips: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("Jämför med:")
                .font(.caption.bold())
                .foregroundStyle(.secondary)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    Button {
                        if compareWithIds.count == viewModel.players.count - 1 {
                            compareWithIds = []
                        } else {
                            compareWithIds = Set(viewModel.players.filter { $0.id != viewModel.currentPlayer?.id }.map { $0.id })
                        }
                    } label: {
                        Text("Alla")
                            .font(.caption2)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 6)
                            .background(compareWithIds.count == viewModel.players.count - 1 && !compareWithIds.isEmpty ? Color.accentColor : Color(.systemGray5))
                            .foregroundStyle(compareWithIds.count == viewModel.players.count - 1 && !compareWithIds.isEmpty ? .white : .primary)
                            .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)

                    ForEach(viewModel.players.filter { $0.id != viewModel.currentPlayer?.id }) { player in
                        Button {
                            if compareWithIds.contains(player.id) { compareWithIds.remove(player.id) } else { compareWithIds.insert(player.id) }
                        } label: {
                            Text(player.profileName)
                                .font(.caption2)
                                .padding(.horizontal, 10)
                                .padding(.vertical, 6)
                                .background(compareWithIds.contains(player.id) ? Color.accentColor : Color(.systemGray5))
                                .foregroundStyle(compareWithIds.contains(player.id) ? .white : .primary)
                                .clipShape(Capsule())
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.vertical, 2)
            }
        }
    }

    @State private var comboSortKey: String = "games"
    @State private var comboSortAscending: Bool = false

    private var teammatesTab: some View {
        HeatmapSectionView(
            combos: viewModel.heatmapCombos,
            title: "Lagkombinationer",
            sortKey: $comboSortKey,
            sortAscending: $comboSortAscending,
            currentPlayerName: viewModel.currentPlayer?.profileName
        )
    }

    private func groupBadges(_ badges: [Badge]) -> [BadgeGroup] {
        var groupMap: [String: BadgeGroup] = [:]
        for badge in badges {
            let groupName = badge.group
            if var existing = groupMap[groupName] {
                existing.items.append(badge)
                groupMap[groupName] = existing
            } else {
                groupMap[groupName] = BadgeGroup(id: groupName, label: groupName, order: badge.groupOrder, items: [badge])
            }
        }
        return Array(groupMap.values).sorted { lhs, rhs in
            if lhs.order != rhs.order { return lhs.order < rhs.order }
            return lhs.label < rhs.label
        }
    }

    private func meritsTab(_ current: Player) -> some View {
        VStack(spacing: 20) {
            SectionCard(title: "Visa merit") {
                badgePickerContent(current)
            }

            Picker("Kategori", selection: $selectedMeritSection) {
                Text("Upplåsta").tag("earned")
                Text("Unika").tag("unique")
                Text("Kommande").tag("locked")
            }
            .pickerStyle(.segmented)
            .sensoryFeedback(.selection, trigger: selectedMeritSection)

            SectionCard(title: "Turneringsmeriter") {
                HStack(spacing: 16) {
                    meritStatCard(title: "Americano", value: "\(viewModel.americanoWins)")
                    meritStatCard(title: "Mexicano", value: "\(viewModel.mexicanoWins)")
                }
            }

            switch selectedMeritSection {
            case "earned":
                let earned = viewModel.currentPlayerBadges.filter { $0.earned && $0.tier != "Unique" }
                if earned.isEmpty {
                    SectionCard(title: "Mina upplåsta meriter") {
                        Text("Du har inga upplåsta meriter ännu.")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                } else {
                    ForEach(groupBadges(earned)) { group in
                        SectionCard(title: group.label) {
                            badgeGrid(badges: group.items)
                        }
                    }
                }
            case "unique":
                SectionCard(title: "Unika meriter (Ledare)") {
                    let unique = viewModel.currentPlayerBadges.filter { $0.tier == "Unique" }
                    VStack(alignment: .leading, spacing: 12) {
                        ForEach(unique) { badge in
                            HStack(spacing: 12) {
                                Text(badge.icon)
                                    .font(.title2)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(badge.title)
                                        .font(.subheadline.weight(.semibold))
                                    Text(badge.description)
                                        .font(.caption2)
                                        .foregroundStyle(.secondary)

                                    HStack(spacing: 4) {
                                        if badge.earned {
                                            Text("Du innehar denna!")
                                                .font(.caption2.weight(.bold))
                                                .foregroundStyle(Color.accentColor)
                                        } else if let holderId = badge.holderId,
                                                  let holder = viewModel.players.first(where: { $0.id == holderId }) {
                                            Text("Innehas av: \(holder.profileName)")
                                                .font(.caption2.weight(.bold))
                                                .foregroundStyle(.secondary)

                                            if let val = badge.holderValue {
                                                Text("(\(val))")
                                                    .font(.caption2)
                                                    .foregroundStyle(.secondary)
                                            }
                                        }
                                    }
                                }
                                Spacer()
                                if badge.earned {
                                    Image(systemName: "checkmark.seal.fill")
                                        .foregroundStyle(Color.accentColor)
                                }
                            }
                            Divider()
                        }
                    }
                }
            case "locked":
                let locked = viewModel.currentPlayerBadges.filter { !$0.earned && $0.tier != "Unique" }
                if locked.isEmpty {
                    SectionCard(title: "Kommande milstolpar") {
                        Text("Du har låst upp allt! Snyggt jobbat.")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                } else {
                    ForEach(groupBadges(locked)) { group in
                        SectionCard(title: group.label) {
                            VStack(alignment: .leading, spacing: 16) {
                                ForEach(group.items) { badge in
                                    VStack(alignment: .leading, spacing: 6) {
                                        HStack {
                                            Text(badge.icon)
                                            Text(badge.title)
                                                .font(.subheadline.weight(.semibold))
                                            Spacer()
                                            if let progress = badge.progress {
                                                let percent = Int((progress.current / progress.target) * 100)
                                                Text("\(Int(progress.current))/\(Int(progress.target)) (\(percent)%)")
                                                    .font(.caption2.weight(.bold))
                                                    .foregroundStyle(.secondary)
                                            }
                                        }
                                        if let progress = badge.progress {
                                            ProgressView(value: progress.current, total: progress.target)
                                                .tint(Color.accentColor.opacity(0.6))
                                        }
                                        Text(badge.description)
                                            .font(.caption2)
                                            .foregroundStyle(.secondary)
                                    }
                                    Divider()
                                }
                            }
                        }
                    }
                }
            default:
                EmptyView()
            }
        }
    }

    private func meritStatCard(title: String, value: String) -> some View {
        VStack(spacing: 4) {
            Text(title.uppercased())
                .font(.caption2.weight(.black))
                .foregroundStyle(.secondary)
            Text(value)
                .font(.title3.weight(.bold))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func badgeGrid(badges: [Badge]) -> some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 80))], spacing: 16) {
            ForEach(badges) { badge in
                VStack(spacing: 4) {
                    Text(badge.icon)
                        .font(.title)
                    Text(badge.tier)
                        .font(.system(size: 8, weight: .black))
                        .padding(.horizontal, 4)
                        .padding(.vertical, 1)
                        .background(Color.accentColor, in: Capsule())
                        .foregroundStyle(.white)
                    Text(badge.title)
                        .font(.system(size: 10, weight: .semibold))
                        .multilineTextAlignment(.center)
                        .lineLimit(2)
                }
            }
        }
    }



    private func badgesSection(_ current: Player) -> some View {
        SectionCard(title: "Merits & badges") {
            badgePickerContent(current)
        }
    }

    private func badgePickerContent(_ current: Player) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Välj vilken av dina upplåsta meriter som ska visas vid ditt namn.")
                .font(.footnote)
                .foregroundStyle(.secondary)

            let earned = viewModel.currentPlayerBadges.filter { $0.earned }

            if earned.isEmpty {
                Text("Du har inga upplåsta meriter att välja bland.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        ForEach(earned) { badge in
                            let isSelected = (viewModel.selectedFeaturedBadgeId ?? current.featuredBadgeId) == badge.id
                            Button {
                                UIImpactFeedbackGenerator(style: .light).impactOccurred()
                                viewModel.selectedFeaturedBadgeId = viewModel.selectedFeaturedBadgeId == badge.id ? nil : badge.id
                            } label: {
                                VStack(spacing: 4) {
                                    Text(badge.icon)
                                        .font(.title2)
                                    Text(badge.title)
                                        .font(.caption2.weight(.bold))
                                        .lineLimit(1)
                                }
                                .frame(width: 80, height: 70)
                                .background(
                                    RoundedRectangle(cornerRadius: 12)
                                        .fill(isSelected ? Color.accentColor.opacity(0.2) : Color(.systemGray6))
                                )
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(isSelected ? Color.accentColor : Color.clear, lineWidth: 2)
                                )
                            }
                            .buttonStyle(.plain)
                            .accessibilityLabel("\(badge.icon) \(badge.title)")
                            .accessibilityAddTraits(isSelected ? [.isSelected] : [])
                            .accessibilityHint(isSelected ? "Avmarkera för att dölja merit" : "Välj för att visa vid ditt namn")
                        }
                    }
                }
            }
        }
    }

    private var performanceSection: some View {
        SectionCard(title: "Prestation") {
            // Note for non-coders: we use a grid of equal cards here so this matches the PWA layout.
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                ForEach(viewModel.profilePerformanceWidgets(filter: viewModel.globalFilter)) { widget in
                    VStack(spacing: 8) {
                        Text(widget.title.uppercased())
                            .font(.inter(size: 9, weight: .black))
                            .foregroundStyle(AppColors.textSecondary)
                            .multilineTextAlignment(.center)
                        Text(widget.value)
                            .font(.inter(.title3, weight: .bold))
                            .foregroundStyle(widget.color == "success" ? .green : (widget.color == "error" ? .red : .primary))
                            .multilineTextAlignment(.center)
                        Text(widget.detail)
                            .font(.inter(size: 10))
                            .foregroundStyle(AppColors.textSecondary)
                            .multilineTextAlignment(.center)
                            .lineLimit(2)
                    }
                    .frame(maxWidth: .infinity, minHeight: 112)
                    .padding(10)
                    .background(Color(.secondarySystemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
            }
        }
    }

    private var synergyRivalrySection: some View {
        SectionCard(title: "Synergi & Rivalitet (30d)") {
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("BÄSTA PARTNER")
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(.secondary)
                    if let partner = viewModel.bestPartner {
                        Text(partner.name)
                            .font(.headline)
                        Text("\(partner.wins) vinster på \(partner.games) matcher")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    } else {
                        Text("—")
                            .font(.headline)
                            .foregroundStyle(.secondary)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(10)
                .background(Color.green.opacity(0.1))
                .clipShape(RoundedRectangle(cornerRadius: 12))

                VStack(alignment: .leading, spacing: 4) {
                    Text("TUFFASTE MOTSTÅND")
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(.secondary)
                    if let rival = viewModel.toughestOpponent {
                        Text(rival.name)
                            .font(.headline)
                        Text("\(rival.losses) förluster på \(rival.games) matcher")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    } else {
                        Text("—")
                            .font(.headline)
                            .foregroundStyle(.secondary)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(10)
                .background(Color.red.opacity(0.1))
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }
    }



    @ViewBuilder
    private func trendChartContent(dataset: ComparisonChartDataset) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            if let index = chartSelectionIndex,
               let point = dataset.points.first(where: { $0.id == index }) {
                tooltip(point: point, playerIds: dataset.playerIds)
            } else {
                Text("Dra över grafen för detaljer. Tooltipen ligger kvar tills du väljer en ny punkt.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            let points = dataset.points
            let eloDomain = viewModel.eloDomain(for: points, players: dataset.playerIds)

            Chart {
                if primaryMetric == .elo || secondaryMetric == .elo {
                    ForEach(dataset.playerIds, id: \.self) { pid in
                        let label = viewModel.chartDisplayName(for: pid)
                        let color = colorForSeries(name: label, index: dataset.playerIds.firstIndex(of: pid) ?? 0)
                        ForEach(points) { point in
                            if let elo = point.elos[pid] {
                                LineMark(x: .value("Match", point.id), y: .value("ELO", elo), series: .value("Serie", label))
                                    .foregroundStyle(color)
                                    .lineStyle(.init(lineWidth: 2.5, lineCap: .round, lineJoin: .round))
                            }
                        }
                    }
                }

                if primaryMetric == .winRate || secondaryMetric == .winRate,
                   let currentId = viewModel.currentPlayer?.id {
                    ForEach(points) { point in
                        if let rate = point.winRates[currentId] {
                            LineMark(x: .value("Match", point.id), y: .value("Win rate", scaledWinRate(rate, domain: eloDomain)))
                                .foregroundStyle(.mint)
                                .lineStyle(.init(lineWidth: 2, dash: [6, 4]))
                                .symbol(.circle)
                                .symbolSize(24)
                        }
                    }
                }

                if let selected = chartSelectionIndex {
                    RuleMark(x: .value("Vald", selected))
                        .foregroundStyle(.secondary.opacity(0.35))
                }
            }
            .frame(height: 280)
            .chartYScale(domain: eloDomain)
            .chartXSelection(value: $chartSelectionIndex)

            chartLegendPills(playerIds: dataset.playerIds)

            if chartSelectionIndex != nil {
                Button("Rensa markör") { chartSelectionIndex = nil }
                    .font(.caption)
            }
        }
    }

    // Note for non-coders:
    // We render one custom legend row so iOS shows exactly one consistent key for line colors.
    private func chartLegendPills(playerIds: [UUID]) -> some View {
        HStack(spacing: 10) {
            ForEach(Array(playerIds.enumerated()), id: \.element) { index, pid in
                let label = viewModel.chartDisplayName(for: pid)
                HStack(spacing: 6) {
                    Circle()
                        .fill(colorForSeries(name: label, index: index))
                        .frame(width: 8, height: 8)
                    Text(label)
                        .font(.caption2.weight(.semibold))
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(Color(.systemGray6), in: Capsule())
            }
        }
    }

    private func tooltip(point: ComparisonMetricTimelinePoint, playerIds: [UUID]) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(point.date, format: .dateTime.day().month().year())
                .font(.caption)
                .foregroundStyle(.secondary)

            ForEach(Array(playerIds.enumerated()), id: \.element) { index, pid in
                let label = viewModel.chartDisplayName(for: pid)
                if let elo = point.elos[pid] {
                    Text("\(label): \(elo) ELO")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(colorForSeries(name: label, index: index))
                }
            }

            if let currentId = viewModel.currentPlayer?.id, let rate = point.winRates[currentId] {
                Text("Du: \(rate, format: .number.precision(.fractionLength(1)))% win rate")
                    .font(.caption)
                    .foregroundStyle(.mint)
            }
        }
    }

    private func scaledWinRate(_ rate: Double, domain: ClosedRange<Double>) -> Double {
        domain.lowerBound + ((rate / 100) * (domain.upperBound - domain.lowerBound))
    }

    private func colorForSeries(name: String, index: Int) -> Color {
        if name == "Du" { return AppColors.brandPrimary }
        return trendPalette[index % trendPalette.count]
    }
}
