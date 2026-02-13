import PhotosUI
import Charts
import SwiftUI
import UIKit

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
    @State private var selectedAvatarItem: PhotosPickerItem?
    @State private var selectedTab: ProfileTab = .overview
    @State private var selectedFilter: DashboardMatchFilter = .all
    @State private var compareWithIds: Set<UUID> = []
    @State private var selectedMeritSection: String = "earned"
    @State private var isEditingName = false

    @State private var chartSelection: Date?
    @State private var showCropper = false
    @State private var imageToCrop: UIImage?

    private var profileFilterOptions: [DashboardMatchFilter] {
        [.last7, .last30, .tournaments, .custom, .all]
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    if let current = viewModel.currentPlayer {
                        headerSection(current)
                        tabSelector
                        selectedTabContent(for: current)
                    } else if viewModel.isGuestMode {
                        tabSelector
                        guestModeSection
                    }
                }
                .padding()
            }
            .background(AppColors.background)
            .navigationTitle("Profil")
            .task {
                viewModel.syncProfileSetupDraftFromCurrentPlayer()
            }
            .padelLiquidGlassChrome()
        }
    }

    private var tabSelector: some View {
        Picker("Profile tab", selection: $selectedTab) {
            ForEach(ProfileTab.allCases) { tab in
                Text(tab.title).tag(tab)
            }
        }
        .pickerStyle(.segmented)
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
                ZStack(alignment: .bottomTrailing) {
                    PlayerAvatarView(urlString: current.avatarURL, size: 100)
                        .shadow(color: AppColors.shadowColor, radius: 8, x: 0, y: 4)

                    Menu {
                        PhotosPicker(selection: $selectedAvatarItem, matching: .images) {
                            Label("Välj ny bild", systemImage: "photo")
                        }
                        Button(role: .destructive) {
                            viewModel.profileAvatarURLInput = ""
                            Task { await viewModel.saveProfileSetup() }
                        } label: {
                            Label("Ta bort bild", systemImage: "trash")
                        }
                    } label: {
                        Image(systemImage: "camera.fill")
                            .font(.system(size: 14))
                            .foregroundStyle(.white)
                            .padding(8)
                            .background(AppColors.brandPrimary)
                            .clipShape(Circle())
                            .overlay(Circle().stroke(Color.white, lineWidth: 2))
                    }
                }

                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        if isEditingName {
                            TextField("Namn", text: $viewModel.profileDisplayNameDraft)
                                .textFieldStyle(.roundedBorder)
                                .font(.inter(.title3, weight: .bold))
                                .onSubmit {
                                    Task { await viewModel.saveProfileSetup() }
                                    isEditingName = false
                                }
                            Button {
                                Task { await viewModel.saveProfileSetup() }
                                isEditingName = false
                            } label: {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundStyle(AppColors.success)
                            }
                        } else {
                            Text(current.profileName)
                                .font(.inter(.title2, weight: .bold))
                                .foregroundStyle(AppColors.textPrimary)

                            Button {
                                viewModel.profileDisplayNameDraft = current.profileName
                                isEditingName = true
                            } label: {
                                Image(systemName: "pencil.circle")
                                    .foregroundStyle(AppColors.textSecondary)
                            }
                        }
                    }

                    HStack(spacing: 4) {
                        Text("ELO: \(current.elo)")
                            .font(.inter(.headline, weight: .bold))
                            .foregroundStyle(AppColors.brandPrimary)

                        if let badgeId = current.featuredBadgeId,
                           let badgeLabel = BadgeService.getBadgeIconById(badgeId) {
                            Text("•")
                                .foregroundStyle(AppColors.textSecondary)
                            Text(badgeLabel)
                                .font(.inter(.subheadline))
                        }
                    }

                    let earned = viewModel.currentPlayerBadges.filter { $0.earned }
                    if earned.isEmpty {
                        Text(viewModel.highlightedBadgeTitle)
                            .font(.inter(.caption, weight: .bold))
                            .padding(.horizontal, 10)
                            .padding(.vertical, 5)
                            .background(AppColors.textSecondary.opacity(0.1), in: Capsule())
                            .foregroundStyle(AppColors.textSecondary)
                    } else {
                        Menu {
                            ForEach(earned) { badge in
                                Button {
                                    viewModel.selectedFeaturedBadgeId = badge.id
                                    Task { await viewModel.saveProfileSetup() }
                                } label: {
                                    Label(badge.title, systemImage: (viewModel.selectedFeaturedBadgeId ?? current.featuredBadgeId) == badge.id ? "checkmark.circle.fill" : "circle")
                                }
                            }
                            Divider()
                            Button(role: .destructive) {
                                viewModel.selectedFeaturedBadgeId = nil
                                Task { await viewModel.saveProfileSetup() }
                            } label: {
                                Label("Ingen merit", systemImage: "xmark.circle")
                            }
                        } label: {
                            HStack(spacing: 4) {
                                Text(viewModel.highlightedBadgeTitle)
                                Image(systemName: "chevron.down")
                                    .font(.system(size: 8))
                            }
                            .font(.inter(.caption, weight: .bold))
                            .padding(.horizontal, 10)
                            .padding(.vertical, 5)
                            .background(AppColors.brandPrimary.opacity(0.1), in: Capsule())
                            .foregroundStyle(AppColors.brandPrimary)
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
        .onChange(of: selectedAvatarItem) { _, newItem in
            guard let newItem else { return }
            Task {
                if let data = try? await newItem.loadTransferable(type: Data.self),
                   let image = UIImage(data: data) {
                    imageToCrop = image
                    showCropper = true
                }
            }
        }
        .fullScreenCover(isPresented: $showCropper) {
            if let image = imageToCrop {
                CircularAvatarCropperView(image: image, isPresented: $showCropper) { croppedImage in
                    if let resizedData = croppedImage.jpegData(compressionQuality: 0.7) {
                        let base64 = resizedData.base64EncodedString()
                        viewModel.profileAvatarURLInput = "data:image/jpeg;base64,\(base64)"
                        Task { await viewModel.saveProfileSetup() }
                    }
                }
            }
        }
    }

    private var eloTrendTab: some View {
        SectionCard(title: "ELO-tidslinje") {
            VStack(alignment: .leading, spacing: 12) {
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
                                    if compareWithIds.contains(player.id) {
                                        compareWithIds.remove(player.id)
                                    } else {
                                        compareWithIds.insert(player.id)
                                    }
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

                let myPoints = viewModel.profileEloTimeline(filter: .all)

                if myPoints.count <= 1 && compareWithIds.isEmpty {
                    Text("Spela fler matcher för att se din ELO-trend.")
                        .foregroundStyle(.secondary)
                        .padding(.vertical, 40)
                        .frame(maxWidth: .infinity)
                } else {
                    if #available(iOS 17.0, *) {
                        chartWithScrubbing(myPoints: myPoints)
                    } else {
                        chartStatic(myPoints: myPoints)
                    }
                }
            }
        }
    }

    @State private var comboSortKey: String = "games"
    @State private var comboSortAscending: Bool = false

    private var sortedHeatmapCombos: [HeatmapCombo] {
        viewModel.heatmapCombos.sorted { a, b in
            let result: Bool
            switch comboSortKey {
            case "games": result = a.games < b.games
            case "winPct": result = a.winPct < b.winPct
            case "avgElo": result = a.avgElo < b.avgElo
            default: result = a.games < b.games
            }
            return comboSortAscending ? result : !result
        }
    }

    private var teammatesTab: some View {
        SectionCard(title: "Lagkombinationer") {
            Picker("Visa stats för", selection: $viewModel.teammateFilterPlayerId) {
                Text("Mig själv").tag(UUID?.none)
                ForEach(viewModel.players.filter { $0.id != viewModel.currentPlayer?.id }) { player in
                    Text(player.profileName).tag(UUID?.init(player.id))
                }
            }
            .pickerStyle(.menu)
            .onChange(of: viewModel.teammateFilterPlayerId) { _, _ in
                viewModel.recalculateDerivedStats()
            }

            ScrollView(.horizontal, showsIndicators: false) {
                VStack(alignment: .leading, spacing: 0) {
                    // Header
                    HStack(spacing: 0) {
                        Text("Lagkamrat").font(.caption.bold()).foregroundStyle(.secondary).frame(width: 130, alignment: .leading)

                        sortableHeader(title: "Matcher", key: "games", width: 70)
                        sortableHeader(title: "Vinst %", key: "winPct", width: 70)

                        Text("S/M %").font(.caption.bold()).foregroundStyle(.secondary).frame(width: 80)
                            .help("Vinstprocent vid Start-serve (S) respektive Mottagning (M).")

                        sortableHeader(title: "Snitt-ELO", key: "avgElo", width: 80)

                        Text("Senaste 5").font(.caption.bold()).foregroundStyle(.secondary).frame(width: 110)
                    }
                    .padding(.vertical, 10)
                    .background(Color(.systemGray6))

                    ForEach(sortedHeatmapCombos) { combo in
                        let otherPlayers = combo.players.filter { $0 != (viewModel.currentPlayer?.profileName ?? "") }
                        let otherNames = otherPlayers.joined(separator: " & ")

                        HStack(spacing: 0) {
                            Text(otherNames.isEmpty ? "Singles" : otherNames)
                                .font(.subheadline.weight(.semibold))
                                .frame(width: 130, alignment: .leading)
                                .lineLimit(1)

                            Text("\(combo.games)")
                                .font(.subheadline)
                                .frame(width: 70)

                            Text("\(combo.winPct)%")
                                .font(.subheadline.weight(.bold))
                                .foregroundStyle(combo.winPct >= 50 ? .green : .primary)
                                .frame(width: 70)

                            Text("\(combo.serveFirstWinPct ?? 0)%/\(combo.serveSecondWinPct ?? 0)%")
                                .font(.caption.monospacedDigit())
                                .foregroundStyle(.secondary)
                                .frame(width: 80)

                            Text("\(combo.avgElo)")
                                .font(.subheadline)
                                .frame(width: 80)

                            HStack(spacing: 4) {
                                ForEach(Array(combo.recentResults.enumerated()), id: \.offset) { _, res in
                                    Text(res)
                                        .font(.system(size: 9, weight: .bold))
                                        .foregroundStyle(.white)
                                        .frame(width: 18, height: 18)
                                        .background(res == "V" ? Color.green : Color.red)
                                        .clipShape(Circle())
                                }
                            }
                            .frame(width: 110)
                        }
                        .padding(.vertical, 10)
                        Divider()
                    }
                }
            }
        }
    }

    private func sortableHeader(title: String, key: String, width: CGFloat) -> some View {
        Button {
            if comboSortKey == key {
                comboSortAscending.toggle()
            } else {
                comboSortKey = key
                comboSortAscending = false
            }
        } label: {
            HStack(spacing: 2) {
                Text(title)
                    .font(.caption.weight(.bold))
                    .foregroundStyle(.secondary)
                if comboSortKey == key {
                    Image(systemName: comboSortAscending ? "chevron.up" : "chevron.down")
                        .font(.system(size: 8, weight: .bold))
                        .foregroundStyle(Color.accentColor)
                }
            }
        }
        .buttonStyle(.plain)
        .frame(width: width)
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
                            Button {
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
                                        .fill((viewModel.selectedFeaturedBadgeId ?? current.featuredBadgeId) == badge.id ? Color.accentColor.opacity(0.2) : Color(.systemGray6))
                                )
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke((viewModel.selectedFeaturedBadgeId ?? current.featuredBadgeId) == badge.id ? Color.accentColor : Color.clear, lineWidth: 2)
                                )
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            }
        }
    }

    private var performanceSection: some View {
        SectionCard(title: "Prestation") {
            ForEach(viewModel.profilePerformanceWidgets(filter: selectedFilter)) { widget in
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Label(widget.title, systemImage: widget.symbol)
                        Spacer()
                        Text(widget.value)
                            .font(.headline)
                            .foregroundStyle(widget.color == "success" ? .green : (widget.color == "error" ? .red : .primary))
                    }
                    Text(widget.detail)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .padding(.vertical, 4)
                Divider()
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



    @available(iOS 17.0, *)
    @ViewBuilder
    private func chartWithScrubbing(myPoints: [ProfileEloPoint]) -> some View {
        VStack(alignment: .leading) {
            if let selection = chartSelection {
                let selectedPoint = myPoints.min(by: { abs($0.date.timeIntervalSince(selection)) < abs($1.date.timeIntervalSince(selection)) })
                if let point = selectedPoint {
                    Text("\(point.date, format: .dateTime.day().month().year())")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text("\(point.elo) ELO")
                        .font(.headline)
                        .foregroundStyle(Color.accentColor)
                }
            } else {
                Text("Dra över grafen för detaljer")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Text(" ")
                    .font(.headline)
            }

            Chart {
                ForEach(myPoints) { point in
                    LineMark(
                        x: .value("Datum", point.date),
                        y: .value("ELO", point.elo),
                        series: .value("Spelare", "Du")
                    )
                    .interpolationMethod(.catmullRom)
                    .foregroundStyle(Color.accentColor)
                    .symbol(by: .value("Spelare", "Du"))
                }

                ForEach(Array(compareWithIds), id: \.self) { otherId in
                    let otherPoints = viewModel.playerEloTimeline(playerId: otherId, filter: selectedFilter)
                    let name = viewModel.players.first(where: { $0.id == otherId })?.profileName ?? "Annan"
                    ForEach(otherPoints) { point in
                        LineMark(
                            x: .value("Datum", point.date),
                            y: .value("ELO", point.elo),
                            series: .value("Spelare", name)
                        )
                        .interpolationMethod(.catmullRom)
                        .symbol(by: .value("Spelare", name))
                    }
                }

                if let selection = chartSelection {
                    RuleMark(x: .value("Vald", selection))
                        .foregroundStyle(Color.secondary.opacity(0.3))
                        .offset(y: -10)
                        .annotation(position: .top, spacing: 0, overflowResolution: .init(x: .fit, y: .disabled)) {
                            Circle()
                                .fill(Color.accentColor)
                                .frame(width: 10, height: 10)
                        }
                }
            }
            .frame(height: 280)
            .chartLegend(.visible)
            .chartXAxis {
                AxisMarks(values: .stride(by: .day, count: 7)) { value in
                    AxisGridLine()
                    AxisValueLabel(format: .dateTime.day().month())
                }
            }
            .chartXSelection(value: $chartSelection)
        }
    }

    @ViewBuilder
    private func chartStatic(myPoints: [ProfileEloPoint]) -> some View {
        Chart {
            ForEach(myPoints) { point in
                LineMark(
                    x: .value("Datum", point.date),
                    y: .value("ELO", point.elo),
                    series: .value("Spelare", "Du")
                )
                .interpolationMethod(.catmullRom)
                .foregroundStyle(Color.accentColor)
                .symbol(by: .value("Spelare", "Du"))
            }

            ForEach(Array(compareWithIds), id: \.self) { otherId in
                let otherPoints = viewModel.playerEloTimeline(playerId: otherId, filter: selectedFilter)
                let name = viewModel.players.first(where: { $0.id == otherId })?.profileName ?? "Annan"
                ForEach(otherPoints) { point in
                    LineMark(
                        x: .value("Datum", point.date),
                        y: .value("ELO", point.elo),
                        series: .value("Spelare", name)
                    )
                    .interpolationMethod(.catmullRom)
                    .symbol(by: .value("Spelare", name))
                }
            }
        }
        .frame(height: 280)
        .chartLegend(.visible)
        .chartXAxis {
            AxisMarks(values: .stride(by: .day, count: 7)) { value in
                AxisGridLine()
                AxisValueLabel(format: .dateTime.day().month())
            }
        }
    }


    private func resizeAvatarImageData(_ data: Data) -> Data? {
        guard let image = UIImage(data: data) else { return nil }
        let targetSize = CGSize(width: 360, height: 360)
        let renderer = UIGraphicsImageRenderer(size: targetSize)
        let rendered = renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: targetSize))
        }
        return rendered.jpegData(compressionQuality: 0.72)
    }
}
