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

struct ProfileView: View {
    @EnvironmentObject private var viewModel: AppViewModel
    @State private var selectedAvatarItem: PhotosPickerItem?
    @State private var selectedTab: ProfileTab = .overview
    @State private var selectedFilter: DashboardMatchFilter = .all
    @State private var compareWithId: UUID? = nil

    private var profileFilterOptions: [DashboardMatchFilter] {
        [.last7, .last30, .tournaments, .custom, .all]
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    tabSelector
                    profileFilterSelector

                    if let current = viewModel.currentPlayer {
                        selectedTabContent(for: current)
                    } else if viewModel.isGuestMode {
                        guestModeSection
                    }

                    Button(role: .destructive) {
                        if viewModel.isGuestMode {
                            viewModel.exitGuestMode()
                        } else {
                            viewModel.signOut()
                        }
                    } label: {
                        Label(viewModel.isGuestMode ? "Gå till inloggning" : "Logga ut", systemImage: "rectangle.portrait.and.arrow.right")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                }
                .padding()
            }
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

    private var profileFilterSelector: some View {
        SectionCard(title: "Profilfilter") {
            Picker("Filter", selection: $selectedFilter) {
                ForEach(profileFilterOptions) { filter in
                    Text(filter.title).tag(filter)
                }
            }
            .pickerStyle(.menu)

            if selectedFilter == .custom {
                DatePicker("Från", selection: $viewModel.dashboardCustomStartDate, displayedComponents: [.date])
                DatePicker("Till", selection: $viewModel.dashboardCustomEndDate, displayedComponents: [.date])

                Button("Återställ") {
                    selectedFilter = .all
                }
                .buttonStyle(.bordered)
            }

            Text("Aktivt filter: \(selectedFilter == .custom ? viewModel.dashboardActiveFilterLabel : selectedFilter.title)")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }



    private var guestModeSection: some View {
        SectionCard(title: "Gästläge") {
            Text("Gästläge är skrivskyddat. Du kan se statistik, men för att spara matcher eller ändra profil krävs ett konto.")
                .font(.footnote)
                .foregroundStyle(.secondary)

            Button("Logga in") {
                viewModel.exitGuestMode()
            }
            .buttonStyle(.borderedProminent)
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
            accountSection
            currentPlayerSection(current)
            profileSetupSection
            performanceSection
            navigationActionsSection
            permissionsSection(current)
        }
    }

    private var eloTrendTab: some View {
        SectionCard(title: "ELO-tidslinje") {
            VStack(alignment: .leading, spacing: 12) {
                Picker("Jämför med", selection: $compareWithId) {
                    Text("Ingen").tag(Optional<UUID>.none)
                    ForEach(viewModel.players.filter { $0.id != viewModel.currentPlayer?.id }) { player in
                        Text(player.profileName).tag(Optional(player.id))
                    }
                }
                .pickerStyle(.menu)

                let myPoints = viewModel.profileEloTimeline(filter: selectedFilter)

                if myPoints.count <= 1 {
                    Text("Spela fler matcher för att se din ELO-trend.")
                        .foregroundStyle(.secondary)
                        .padding(.vertical, 40)
                        .frame(maxWidth: .infinity)
                } else {
                    Chart {
                        ForEach(myPoints) { point in
                            LineMark(
                                x: .value("Datum", point.date),
                                y: .value("ELO", point.elo),
                                series: .value("Spelare", "Du")
                            )
                            .interpolationMethod(.catmullRom)
                            .foregroundStyle(Color.accentColor)
                        }

                        if let otherId = compareWithId {
                            let otherPoints = viewModel.playerEloTimeline(playerId: otherId, filter: selectedFilter)
                            ForEach(otherPoints) { point in
                                LineMark(
                                    x: .value("Datum", point.date),
                                    y: .value("ELO", point.elo),
                                    series: .value("Spelare", viewModel.players.first(where: { $0.id == otherId })?.profileName ?? "Annan")
                                )
                                .interpolationMethod(.catmullRom)
                                .foregroundStyle(Color.blue)
                            }
                        }
                    }
                    .frame(height: 250)
                    .chartLegend(.visible)
                }
            }
        }
    }

    private var teammatesTab: some View {
        SectionCard(title: "Lagkombinationer") {
            ScrollView(.horizontal, showsIndicators: false) {
                VStack(alignment: .leading, spacing: 0) {
                    // Header
                    HStack(spacing: 0) {
                        Text("Lagkamrat").font(.caption.bold()).foregroundStyle(.secondary).frame(width: 120, alignment: .leading)
                        Text("Matcher").font(.caption.bold()).foregroundStyle(.secondary).frame(width: 60)
                        Text("Vinster").font(.caption.bold()).foregroundStyle(.secondary).frame(width: 60)
                        Text("Vinst %").font(.caption.bold()).foregroundStyle(.secondary).frame(width: 65)
                        Text("Senaste 5").font(.caption.bold()).foregroundStyle(.secondary).frame(width: 110)
                    }
                    .padding(.vertical, 8)
                    .background(Color(.systemGray6))

                    ForEach(viewModel.heatmapCombos) { combo in
                        let otherPlayers = combo.players.filter { $0 != (viewModel.currentPlayer?.profileName ?? "") }
                        let otherNames = otherPlayers.joined(separator: " & ")

                        HStack(spacing: 0) {
                            Text(otherNames.isEmpty ? "Singles" : otherNames)
                                .font(.subheadline.weight(.semibold))
                                .frame(width: 120, alignment: .leading)
                                .lineLimit(1)

                            Text("\(combo.games)")
                                .font(.subheadline)
                                .frame(width: 60)

                            Text("\(combo.wins)")
                                .font(.subheadline)
                                .frame(width: 60)

                            Text("\(combo.winPct)%")
                                .font(.subheadline.weight(.bold))
                                .frame(width: 65)

                            HStack(spacing: 4) {
                                ForEach(Array(combo.recentResults.enumerated()), id: \.offset) { _, res in
                                    Text(res)
                                        .font(.system(size: 9, weight: .bold))
                                        .foregroundStyle(.white)
                                        .frame(width: 16, height: 16)
                                        .background(res == "V" ? Color.green : Color.red)
                                        .clipShape(Circle())
                                }
                            }
                            .frame(width: 110)
                        }
                        .padding(.vertical, 8)
                        Divider()
                    }
                }
            }
        }
    }

    private func meritsTab(_ current: Player) -> some View {
        VStack(spacing: 20) {
            SectionCard(title: "Vald merit") {
                badgePickerContent(current)
            }

            SectionCard(title: "Mina upplåsta meriter") {
                let earned = viewModel.currentPlayerBadges.filter { $0.earned }
                if earned.isEmpty {
                    Text("Du har inga upplåsta meriter ännu.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                } else {
                    badgeGrid(badges: earned)
                }
            }

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
                                if let holderValue = badge.holderValue {
                                    Text("Ledare: \(holderValue)")
                                        .font(.caption2.weight(.bold))
                                        .foregroundStyle(badge.earned ? Color.accentColor : .secondary)
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

            SectionCard(title: "Kommande milstolpar") {
                let locked = viewModel.currentPlayerBadges.filter { !$0.earned && $0.tier != "Unique" }
                VStack(alignment: .leading, spacing: 16) {
                    ForEach(locked.prefix(10)) { badge in
                        VStack(alignment: .leading, spacing: 6) {
                            HStack {
                                Text(badge.icon)
                                Text(badge.title)
                                    .font(.subheadline.weight(.semibold))
                                Spacer()
                                if let progress = badge.progress {
                                    Text("\(Int(progress.current))/\(Int(progress.target))")
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

    private var accountSection: some View {
        SectionCard(title: "Konto") {
            if let email = viewModel.signedInEmail {
                Label(email, systemImage: "envelope")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
            Text(viewModel.profileSetupPrompt)
                .font(.footnote)
                .foregroundStyle(.secondary)

            Toggle("Påminn mig om kommande matcher (notiser)", isOn: Binding(
                get: { viewModel.areScheduleNotificationsEnabled },
                set: { enabled in
                    Task { await viewModel.setScheduleNotificationsEnabled(enabled) }
                }
            ))

            Toggle("Lås upp appen med Face ID / Touch ID", isOn: Binding(
                get: { viewModel.isBiometricLockEnabled },
                set: { enabled in
                    Task { await viewModel.setBiometricLockEnabled(enabled) }
                }
            ))
        }
    }

    private func currentPlayerSection(_ current: Player) -> some View {
        SectionCard(title: "Nuvarande spelare") {
            HStack {
                profileAvatarView(urlString: current.avatarURL)
                    .frame(width: 56, height: 56)

                VStack(alignment: .leading, spacing: 4) {
                    Text(current.profileName)
                        .font(.title3).bold()
                    Text("ELO: \(current.elo)")
                        .foregroundStyle(.secondary)
                    Text("Vald merit: \(viewModel.highlightedBadgeTitle)")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
                Spacer()
            }
        }
    }

    private var profileSetupSection: some View {
        SectionCard(title: "Profilinställningar") {
            TextField("Visningsnamn", text: $viewModel.profileDisplayNameDraft)
                .textInputAutocapitalization(.words)
                .autocorrectionDisabled()
                .textFieldStyle(.roundedBorder)

            TextField("Avatar-URL (valfri)", text: $viewModel.profileAvatarURLInput)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .textFieldStyle(.roundedBorder)

            PhotosPicker(selection: $selectedAvatarItem, matching: .images) {
                Label("Välj bild från mobilen", systemImage: "photo")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.bordered)
            .onChange(of: selectedAvatarItem) { _, newItem in
                guard let newItem else { return }
                Task {
                    if let data = try? await newItem.loadTransferable(type: Data.self),
                       let resizedData = resizeAvatarImageData(data) {
                        let base64 = resizedData.base64EncodedString()
                        viewModel.profileAvatarURLInput = "data:image/jpeg;base64,\(base64)"
                    }
                }
            }

            if let message = viewModel.profileSetupMessage {
                Text(message)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }

            Button {
                Task { await viewModel.saveProfileSetup() }
            } label: {
                if viewModel.isSavingProfileSetup {
                    ProgressView()
                        .frame(maxWidth: .infinity)
                } else {
                    Label("Spara inställningar", systemImage: "square.and.arrow.down")
                        .frame(maxWidth: .infinity)
                }
            }
            .buttonStyle(.borderedProminent)
            .disabled(viewModel.isSavingProfileSetup)
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

    private var navigationActionsSection: some View {
        SectionCard(title: "Snabbval") {
            HStack {
                Button("Senaste 7d") {
                    viewModel.openDashboardFiltered(.last7)
                }
                .buttonStyle(.bordered)

                Button("Turnering") {
                    viewModel.openDashboardFiltered(.tournaments)
                }
                .buttonStyle(.bordered)

                Button("Historik") {
                    viewModel.openHistoryTab()
                }
                .buttonStyle(.bordered)
            }
        }
    }

    private func permissionsSection(_ current: Player) -> some View {
        SectionCard(title: "Behörigheter") {
            Label(current.isRegular ? "Åtkomst till schema: JA" : "Åtkomst till schema: NEJ", systemImage: current.isRegular ? "checkmark.circle" : "xmark.circle")
            Label(current.isAdmin ? "Adminverktyg: JA" : "Adminverktyg: NEJ", systemImage: current.isAdmin ? "checkmark.shield" : "shield.slash")

            if viewModel.isAwaitingApproval {
                Text("Ditt konto väntar på admin-godkännande.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        }
    }

    @ViewBuilder
    private func profileAvatarView(urlString: String?) -> some View {
        if let urlString, let url = URL(string: urlString), url.scheme?.hasPrefix("http") == true {
            AsyncImage(url: url) { image in
                image.resizable().scaledToFill()
            } placeholder: {
                avatarFallback
            }
            .clipShape(Circle())
        } else {
            avatarFallback
        }
    }

    private var avatarFallback: some View {
        Image(systemName: "person.crop.circle.fill")
            .font(.system(size: 42))
            .foregroundStyle(Color.accentColor)
            .frame(width: 56, height: 56)
            .background(Circle().fill(Color.accentColor.opacity(0.15)))
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
