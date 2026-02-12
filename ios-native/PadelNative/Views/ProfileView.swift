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
                        Label(viewModel.isGuestMode ? "Gå till inloggning" : "Sign out", systemImage: "rectangle.portrait.and.arrow.right")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                }
                .padding()
            }
            .navigationTitle("Profile")
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
        SectionCard(title: "Profile filter") {
            Text("Note for non-coders: this filter works like web profile tabs, so every profile statistic below uses the same time/tournament context.")
                .font(.footnote)
                .foregroundStyle(.secondary)

            Picker("Filter", selection: $selectedFilter) {
                ForEach(profileFilterOptions) { filter in
                    Text(filter.title).tag(filter)
                }
            }
            .pickerStyle(.menu)

            if selectedFilter == .custom {
                DatePicker("From", selection: $viewModel.dashboardCustomStartDate, displayedComponents: [.date])
                DatePicker("To", selection: $viewModel.dashboardCustomEndDate, displayedComponents: [.date])

                Button("Reset to all") {
                    selectedFilter = .all
                }
                .buttonStyle(.bordered)
            }

            Text("Active filter: \(selectedFilter == .custom ? viewModel.dashboardActiveFilterLabel : selectedFilter.title)")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }



    private var guestModeSection: some View {
        SectionCard(title: "Guest mode") {
            Text("Note for non-coders: guest mode is read-only. You can browse public stats, but profile editing and saved actions require a real account.")
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
            accountSection
            currentPlayerSection(current)
            profileSetupSection
            performanceSection
            navigationActionsSection
            permissionsSection(current)
        }
    }

    private var eloTrendTab: some View {
        SectionCard(title: "ELO timeline") {
            Text("Note for non-coders: this chart shows how your rating moved match by match in the selected filter window.")
                .font(.footnote)
                .foregroundStyle(.secondary)

            let points = viewModel.profileEloTimeline(filter: selectedFilter)
            if points.count <= 1 {
                Text("Play more matches to see an ELO trend line.")
                    .foregroundStyle(.secondary)
            } else {
                Chart(points) { point in
                    LineMark(
                        x: .value("Date", point.date),
                        y: .value("ELO", point.elo)
                    )
                    .interpolationMethod(.catmullRom)
                    .foregroundStyle(Color.accentColor)

                    PointMark(
                        x: .value("Date", point.date),
                        y: .value("ELO", point.elo)
                    )
                    .symbolSize(24)
                }
                .frame(height: 220)
            }
        }
    }

    private var teammatesTab: some View {
        SectionCard(title: "Lagkamrater & motståndare") {
            Text("Note for non-coders: this is the profile equivalent of the web heatmap summary, focused on your strongest and most frequent combinations.")
                .font(.footnote)
                .foregroundStyle(.secondary)

            ForEach(viewModel.profileComboStats(filter: selectedFilter)) { combo in
                HStack {
                    Label(combo.title, systemImage: combo.symbol)
                    Spacer()
                    Text(combo.value)
                        .font(.subheadline.weight(.semibold))
                        .multilineTextAlignment(.trailing)
                }
                Text(combo.detail)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Divider()
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
        SectionCard(title: "Account") {
            Text("Note for non-coders: this screen mirrors web profile setup so users can update identity, avatar, badges, and quick filters from one place.")
                .foregroundStyle(.secondary)
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

            Text("Note for non-coders: toggles above are iOS-only extras. Notifications can alert before matches, and biometric lock adds device-level privacy.")
                .font(.footnote)
                .foregroundStyle(.secondary)
        }
    }

    private func currentPlayerSection(_ current: Player) -> some View {
        SectionCard(title: "Current player") {
            HStack {
                profileAvatarView(urlString: current.avatarURL)
                    .frame(width: 56, height: 56)

                VStack(alignment: .leading, spacing: 4) {
                    Text(current.profileName)
                        .font(.title3).bold()
                    Text("ELO: \(current.elo)")
                        .foregroundStyle(.secondary)
                    Text("Featured badge: \(viewModel.highlightedBadgeTitle)")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
                Spacer()
            }
        }
    }

    private var profileSetupSection: some View {
        SectionCard(title: "Profile setup") {
            TextField("Display name", text: $viewModel.profileDisplayNameDraft)
                .textInputAutocapitalization(.words)
                .autocorrectionDisabled()
                .textFieldStyle(.roundedBorder)

            TextField("Avatar URL (optional)", text: $viewModel.profileAvatarURLInput)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .textFieldStyle(.roundedBorder)

            PhotosPicker(selection: $selectedAvatarItem, matching: .images) {
                Label("Choose photo from device", systemImage: "photo")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.bordered)
            .onChange(of: selectedAvatarItem) { _, newItem in
                guard let newItem else { return }
                Task {
                    if let data = try? await newItem.loadTransferable(type: Data.self),
                       let resizedData = resizeAvatarImageData(data) {
                        let base64 = resizedData.base64EncodedString()
                        // Note for non-coders: data URLs let us store a picked image as text in avatar_url when no file storage bucket is configured.
                        viewModel.profileAvatarURLInput = "data:image/jpeg;base64,\(base64)"
                    }
                }
            }

            Text("Note for non-coders: avatar strategy follows web fallback order — use saved profile avatar, else typed URL/photo, else initials icon.")
                .font(.footnote)
                .foregroundStyle(.secondary)

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
                    Label("Save profile setup", systemImage: "square.and.arrow.down")
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
        SectionCard(title: "Performance") {
            ForEach(viewModel.profilePerformanceWidgets(filter: selectedFilter)) { widget in
                HStack {
                    Label(widget.title, systemImage: widget.symbol)
                    Spacer()
                    Text(widget.value)
                        .font(.headline)
                }
                Text(widget.detail)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Divider()
            }
        }
    }

    private var navigationActionsSection: some View {
        SectionCard(title: "Quick actions") {
            Text("Note for non-coders: these shortcuts open profile-relevant filters in Dashboard/History like the web profile tabs.")
                .font(.footnote)
                .foregroundStyle(.secondary)

            HStack {
                Button("Last 7d") {
                    viewModel.openDashboardFiltered(.last7)
                }
                .buttonStyle(.bordered)

                Button("Tournament") {
                    viewModel.openDashboardFiltered(.tournaments)
                }
                .buttonStyle(.bordered)

                Button("History") {
                    viewModel.openHistoryTab()
                }
                .buttonStyle(.bordered)
            }
        }
    }

    private func permissionsSection(_ current: Player) -> some View {
        SectionCard(title: "Permissions") {
            Label(current.isRegular ? "Schedule access enabled" : "Schedule access disabled", systemImage: current.isRegular ? "checkmark.circle" : "xmark.circle")
            Label(current.isAdmin ? "Admin tools enabled" : "Admin tools disabled", systemImage: current.isAdmin ? "checkmark.shield" : "shield.slash")

            if viewModel.isAwaitingApproval {
                Text("Your account is waiting for admin approval. You can still review profile information while waiting.")
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
