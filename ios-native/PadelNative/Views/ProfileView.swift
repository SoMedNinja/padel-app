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
        case .overview: return "Overview"
        case .eloTrend: return "ELO trend"
        case .teammates: return "Teammates"
        case .merits: return "Merits"
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
                    }

                    Button(role: .destructive) {
                        viewModel.signOut()
                    } label: {
                        Label("Sign out", systemImage: "rectangle.portrait.and.arrow.right")
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
                    .foregroundStyle(.accent)

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
        SectionCard(title: "Teammate & opponent matrix") {
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
        SectionCard(title: "Merits & milestones") {
            Text("Note for non-coders: unlocked merits are your achieved badges, while progress bars track trophy-style milestones that are still in progress.")
                .font(.footnote)
                .foregroundStyle(.secondary)

            badgePickerContent(current)

            VStack(alignment: .leading, spacing: 10) {
                ForEach(viewModel.profileMeritMilestones(filter: selectedFilter)) { merit in
                    VStack(alignment: .leading, spacing: 6) {
                        HStack {
                            Label(merit.title, systemImage: merit.icon)
                            Spacer()
                            Text(merit.unlocked ? "Unlocked" : "\(merit.current)/\(merit.target)")
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(merit.unlocked ? .green : .secondary)
                        }
                        Text(merit.description)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        ProgressView(value: merit.progress)
                    }
                    Divider()
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
            Text("Choose which unlocked badge should be highlighted beside your name.")
                .font(.footnote)
                .foregroundStyle(.secondary)

            LazyVGrid(columns: [GridItem(.adaptive(minimum: 140), spacing: 10)], spacing: 10) {
                ForEach(viewModel.availableBadgeOptions) { badge in
                    Button {
                        viewModel.selectedFeaturedBadgeId = viewModel.selectedFeaturedBadgeId == badge.id ? nil : badge.id
                    } label: {
                        VStack(alignment: .leading, spacing: 6) {
                            Label(badge.title, systemImage: badge.icon)
                                .font(.subheadline.weight(.semibold))
                            Text(badge.hint)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        .padding(10)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(
                            RoundedRectangle(cornerRadius: 10)
                                .fill((viewModel.selectedFeaturedBadgeId ?? current.featuredBadgeId) == badge.id ? Color.accentColor.opacity(0.2) : Color(.systemGray6))
                        )
                    }
                    .buttonStyle(.plain)
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
