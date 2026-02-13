import SwiftUI

private enum PendingAdminAction: Identifiable {
    case toggleApproval(AdminProfile)
    case toggleAdmin(AdminProfile)
    case toggleRegular(AdminProfile)
    case deactivate(AdminProfile)

    var id: UUID {
        switch self {
        case .toggleApproval(let profile), .toggleAdmin(let profile), .toggleRegular(let profile), .deactivate(let profile):
            return profile.id
        }
    }

    var title: String {
        switch self {
        case .toggleApproval(let profile):
            return profile.isApproved ? "Ta bort godkännande?" : "Godkänn användare?"
        case .toggleAdmin(let profile):
            return profile.isAdmin ? "Ta bort admin-roll?" : "Gör till admin?"
        case .toggleRegular(let profile):
            return profile.isRegular ? "Ta bort ordinarie?" : "Gör till ordinarie?"
        case .deactivate:
            return "Inaktivera användare?"
        }
    }

    var message: String {
        switch self {
        case .toggleApproval(let profile):
            return "Detta ändrar om \(profile.name) kan använda medlemsfunktioner."
        case .toggleAdmin(let profile):
            return "Detta ändrar om \(profile.name) har tillgång till adminverktyg."
        case .toggleRegular(let profile):
            return "Detta ändrar om \(profile.name) har tillgång till schemat."
        case .deactivate(let profile):
            return "Detta kommer att inaktivera \(profile.name), ta bort behörigheter och dölja profilen."
        }
    }
}

private enum AdminTab: String, CaseIterable, Identifiable {
    case users = "Användare"
    case reports = "Rapporter"
    case emails = "E-post"

    var id: String { rawValue }
}

private enum AdminUserFilter: String, CaseIterable, Identifiable {
    case all = "Alla"
    case pending = "Väntar"
    case regular = "Ordinarie"
    case admin = "Admin"
    case deleted = "Raderade"

    var id: String { rawValue }
}

struct AdminView: View {
    @EnvironmentObject private var viewModel: AppViewModel
    @State private var pendingAction: PendingAdminAction?
    @State private var selectedTab: AdminTab = .users
    @State private var userFilter: AdminUserFilter = .all
    @State private var userSearchText: String = ""
    @State private var selectedEvening: String = ""
    @State private var selectedReportTournamentId: UUID?
    @State private var selectedEmailTournamentId: UUID?
    @State private var selectedWeeklyTimeframe: AdminWeeklyTimeframe = .last7
    @State private var selectedISOWeek = Calendar(identifier: .iso8601).component(.weekOfYear, from: .now)
    @State private var selectedISOYear = Calendar(identifier: .iso8601).component(.yearForWeekOfYear, from: .now)

    @State private var renamingProfile: AdminProfile?
    @State private var newPlayerName: String = ""

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.canUseAdmin {
                    List {
                        Section {
                            Picker("Adminområde", selection: $selectedTab) {
                                ForEach(AdminTab.allCases) { tab in
                                    Text(tab.rawValue).tag(tab)
                                }
                            }
                            .pickerStyle(.segmented)
                        }

                        if let adminBanner = viewModel.adminBanner {
                            Section {
                                bannerView(adminBanner)
                            }
                        }

                        switch selectedTab {
                        case .users:
                            usersSection
                        case .reports:
                            reportsSection
                        case .emails:
                            emailsSection
                        }

                        Section("Information") {
                            Text("Här hanterar du användare, rapporter och e-postutskick. Alla åtgärder loggas och kräver adminbehörighet.")
                                .foregroundStyle(.secondary)
                        }
                    }
                    .overlay {
                        if viewModel.isAdminActionRunning || viewModel.isAdminReportRunning || viewModel.isAdminEmailActionRunning {
                            ProgressView("Processing admin action...")
                                .padding()
                                .background(.ultraThinMaterial)
                                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                        }
                    }
                } else {
                    ContentUnavailableView(
                        "Admin Access Required",
                        systemImage: "lock.shield",
                        description: Text("Note for non-coders: this area is hidden for non-admin users to match web permission gating.")
                    )
                }
            }
            .navigationTitle("Admin")
            .padelLiquidGlassChrome()
            .task {
                guard viewModel.canUseAdmin else { return }
                await viewModel.refreshAdminProfiles(silently: true)
                if selectedEvening.isEmpty {
                    selectedEvening = viewModel.adminMatchEveningOptions.first ?? ""
                }
                if selectedReportTournamentId == nil {
                    selectedReportTournamentId = viewModel.tournaments.first(where: { $0.status == "completed" })?.id
                }
                if selectedEmailTournamentId == nil {
                    selectedEmailTournamentId = viewModel.tournaments.first(where: { $0.status == "completed" })?.id
                }
            }
            .refreshable {
                guard viewModel.canUseAdmin else { return }
                await viewModel.bootstrap()
            }
            .alert(item: $pendingAction) { action in
                Alert(
                    title: Text(action.title),
                    message: Text(action.message),
                    primaryButton: .destructive(Text("Bekräfta")) {
                        Task { await run(action) }
                    },
                    secondaryButton: .cancel()
                )
            }
            .alert("Byt namn", isPresented: Binding(
                get: { renamingProfile != nil },
                set: { if !$0 { renamingProfile = nil } }
            )) {
                TextField("Nytt namn", text: $newPlayerName)
                Button("Avbryt", role: .cancel) { renamingProfile = nil }
                Button("Spara") {
                    if let profile = renamingProfile {
                        Task { await viewModel.renamePlayer(profileId: profile.id, newName: newPlayerName) }
                    }
                    renamingProfile = nil
                }
            } message: {
                Text("Ange ett nytt visningsnamn för spelaren.")
            }
        }
    }

    private var filteredAdminProfiles: [AdminProfile] {
        viewModel.adminProfiles.filter { profile in
            let matchesSearch = userSearchText.isEmpty || profile.name.localizedCaseInsensitiveContains(userSearchText)
            let matchesFilter: Bool
            switch userFilter {
            case .all: matchesFilter = !profile.isDeleted
            case .pending: matchesFilter = !profile.isApproved && !profile.isDeleted
            case .regular: matchesFilter = profile.isRegular && !profile.isDeleted
            case .admin: matchesFilter = profile.isAdmin && !profile.isDeleted
            case .deleted: matchesFilter = profile.isDeleted
            }
            return matchesSearch && matchesFilter
        }
    }

    private var usersSection: some View {
        Group {
            Section("Översikt") {
                let pendingCount = viewModel.adminProfiles.filter { !$0.isApproved && !$0.isDeleted }.count
                let adminCount = viewModel.adminProfiles.filter { $0.isAdmin && !$0.isDeleted }.count

                HStack(spacing: 12) {
                    metricCard(title: "Spelare", value: "\(viewModel.adminSnapshot.playerCount)", icon: "person.2.fill", color: .blue)
                    metricCard(title: "Väntar", value: "\(pendingCount)", icon: "hourglass", color: pendingCount > 0 ? .orange : .green)
                    metricCard(title: "Admins", value: "\(adminCount)", icon: "shield.fill", color: .purple)
                }
                .listRowBackground(Color.clear)
                .listRowInsets(EdgeInsets())
                .padding(.vertical, 8)

                metricRow(label: "Matcher totalt", value: "\(viewModel.adminSnapshot.matchCount)")
                metricRow(label: "Schemalagda pass", value: "\(viewModel.adminSnapshot.scheduledCount)")
            }

            Section("Användarhantering") {
                VStack(spacing: 12) {
                    TextField("Sök spelare...", text: $userSearchText)
                        .textFieldStyle(.roundedBorder)
                        .padding(.vertical, 4)

                    Picker("Filtrera", selection: $userFilter) {
                        ForEach(AdminUserFilter.allCases) { filter in
                            Text(filter.rawValue).tag(filter)
                        }
                    }
                    .pickerStyle(.segmented)
                }
                .listRowInsets(EdgeInsets(top: 12, leading: 16, bottom: 12, trailing: 16))

                ForEach(filteredAdminProfiles) { profile in
                    VStack(alignment: .leading, spacing: 10) {
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(profile.name).font(.headline)
                                if profile.isDeleted {
                                    Text("RADERAD ANVÄNDARE")
                                        .font(.caption2.bold())
                                        .foregroundStyle(.red)
                                }
                            }
                            Spacer()
                            if !profile.isDeleted {
                                if profile.isApproved {
                                    Label("Godkänd", systemImage: "checkmark.seal.fill")
                                        .font(.caption)
                                        .foregroundStyle(AppColors.success)
                                } else {
                                    Label("Väntar", systemImage: "hourglass")
                                        .font(.caption)
                                        .foregroundStyle(.orange)
                                }
                            }
                        }

                        if !profile.isDeleted {
                            HStack {
                                Text(profile.isRegular ? "Ordinarie" : "Gäst")
                                    .font(.caption2)
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 2)
                                    .background(Color.secondary.opacity(0.1), in: Capsule())

                                if profile.isAdmin {
                                    Text("Admin")
                                        .font(.caption2.bold())
                                        .foregroundStyle(.purple)
                                        .padding(.horizontal, 6)
                                        .padding(.vertical, 2)
                                        .background(Color.purple.opacity(0.1), in: Capsule())
                                }

                                Spacer()

                                Text("Svep för åtgärder")
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                                    .opacity(0.5)
                            }
                        } else {
                            Text("Inga åtgärder tillgängliga för raderad användare.")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                    }
                    .padding(.vertical, 6)
                    .opacity(profile.isDeleted ? 0.6 : 1.0)
                    .swipeActions(edge: .leading, allowsFullSwipe: true) {
                        if !profile.isDeleted {
                            Button {
                                pendingAction = .toggleApproval(profile)
                            } label: {
                                Label(profile.isApproved ? "Dra in" : "Godkänn", systemImage: profile.isApproved ? "xmark.seal" : "checkmark.seal")
                            }
                            .tint(profile.isApproved ? .orange : .green)
                        }
                    }
                    .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                        if !profile.isDeleted {
                            Button(role: .destructive) {
                                pendingAction = .deactivate(profile)
                            } label: {
                                Label("Inaktivera", systemImage: "person.crop.circle.badge.xmark")
                            }

                            Button {
                                renamingProfile = profile
                                newPlayerName = profile.name
                            } label: {
                                Label("Namn", systemImage: "pencil")
                            }
                            .tint(.blue)
                        }
                    }
                }
            }
        }
    }

    private var reportsSection: some View {
        Group {
            Section("Matchkvälls-rapport") {
                Picker("Datum", selection: $selectedEvening) {
                    ForEach(viewModel.adminMatchEveningOptions, id: \.self) { day in
                        Text(day).tag(day)
                    }
                }
                .disabled(viewModel.adminMatchEveningOptions.isEmpty)

                Button("Generera rapport") {
                    viewModel.generateMatchEveningReport(for: selectedEvening)
                }
                .disabled(selectedEvening.isEmpty)
            }

            Section("Turneringsrapport") {
                Picker("Slutförd turnering", selection: $selectedReportTournamentId) {
                    Text("Välj turnering").tag(Optional<UUID>.none)
                    ForEach(viewModel.tournaments.filter { $0.status == "completed" }) { tournament in
                        Text(tournament.name).tag(Optional(tournament.id))
                    }
                }

                Button("Generera rapport") {
                    guard let id = selectedReportTournamentId else { return }
                    Task { await viewModel.generateTournamentReport(for: id) }
                }
                .disabled(selectedReportTournamentId == nil)
            }

            previewSection(
                title: "Förhandsgranska / Dela",
                content: viewModel.adminReportPreviewText,
                status: viewModel.adminReportStatusMessage
            )
        }
    }

    private var emailsSection: some View {
        Group {
            Section("Veckobrev") {
                Picker("Tidsram", selection: $selectedWeeklyTimeframe) {
                    ForEach(AdminWeeklyTimeframe.allCases) { option in
                        Text(option.title.replacingOccurrences(of: "Last 7 days", with: "Senaste 7 dagarna").replacingOccurrences(of: "Last 30 days", with: "Senaste 30 dagarna")).tag(option)
                    }
                }

                if selectedWeeklyTimeframe == .isoWeek {
                    Stepper("ISO Vecka: \(selectedISOWeek)", value: $selectedISOWeek, in: 1...53)
                    Stepper("ISO År: \(selectedISOYear)", value: $selectedISOYear, in: 2020...2100)
                }

                Button("Förhandsgranska veckobrev") {
                    let week = selectedWeeklyTimeframe == .isoWeek ? selectedISOWeek : nil
                    let year = selectedWeeklyTimeframe == .isoWeek ? selectedISOYear : nil
                    viewModel.buildWeeklyEmailPreview(timeframe: selectedWeeklyTimeframe, week: week, year: year)
                }

                Button("Skicka test-veckobrev") {
                    let week = selectedWeeklyTimeframe == .isoWeek ? selectedISOWeek : nil
                    let year = selectedWeeklyTimeframe == .isoWeek ? selectedISOYear : nil
                    Task { await viewModel.sendWeeklyEmailTest(timeframe: selectedWeeklyTimeframe, week: week, year: year) }
                }
                .buttonStyle(.borderedProminent)
            }

            Section("Turneringsbrev") {
                Picker("Slutförd turnering", selection: $selectedEmailTournamentId) {
                    Text("Välj turnering").tag(Optional<UUID>.none)
                    ForEach(viewModel.tournaments.filter { $0.status == "completed" }) { tournament in
                        Text(tournament.name).tag(Optional(tournament.id))
                    }
                }

                Button("Förhandsgranska turneringsbrev") {
                    guard let id = selectedEmailTournamentId else { return }
                    Task { await viewModel.buildTournamentEmailPreview(for: id) }
                }
                .disabled(selectedEmailTournamentId == nil)

                Button("Skicka test-turneringsbrev") {
                    Task { await viewModel.sendTournamentEmailTest() }
                }
                .buttonStyle(.borderedProminent)
            }

            previewSection(
                title: "E-post förhandsgranskning",
                content: viewModel.adminEmailPreviewText,
                status: viewModel.adminEmailStatusMessage
            )
        }
    }

    private func metricRow(label: String, value: String) -> some View {
        HStack {
            Text(label)
            Spacer()
            Text(value).bold()
        }
    }

    private func metricCard(title: String, value: String, icon: String, color: Color) -> some View {
        VStack(spacing: 8) {
            HStack {
                Image(systemName: icon)
                    .font(.caption)
                Spacer()
            }
            .foregroundStyle(color)

            HStack {
                Text(value)
                    .font(.title2.bold())
                Spacer()
            }

            HStack {
                Text(title)
                    .font(.caption2.weight(.medium))
                    .foregroundStyle(.secondary)
                Spacer()
            }
        }
        .padding(12)
        .frame(maxWidth: .infinity)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    @ViewBuilder
    private func previewSection(title: String, content: String?, status: String?) -> some View {
        Section(title) {
            if let content, content.isEmpty == false {
                Text(content)
                    .font(.footnote)
                    .textSelection(.enabled)

                if let cardURL = adminShareImageURL(content: content, title: title) {
                    ShareLink(item: cardURL) {
                        Label("Dela som bild", systemImage: "photo.on.rectangle")
                    }
                }

                ShareLink(item: content) {
                    Label("Dela som text", systemImage: "square.and.arrow.up")
                }
            } else {
                Text("Ingen förhandsgranskning än.")
                    .foregroundStyle(.secondary)
            }

            if let status, status.isEmpty == false {
                Text(status)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }


    private func adminShareImageURL(content: String, title: String) -> URL? {
        let lines = content.split(separator: "\n").map(String.init).prefix(18)
        return try? ShareCardService.createShareImageFile(
            title: title,
            bodyLines: Array(lines),
            fileNamePrefix: "admin-report"
        )
    }

    @ViewBuilder
    private func bannerView(_ banner: AdminActionBanner) -> some View {
        HStack(spacing: 8) {
            Image(systemName: banner.style == .success ? "checkmark.circle.fill" : "xmark.octagon.fill")
            Text(banner.message)
                .font(.subheadline)
                .multilineTextAlignment(.leading)
        }
        .foregroundStyle(.white)
        .padding(10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(banner.style == .success ? AppColors.success : Color.red)
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
    }

    private func run(_ action: PendingAdminAction) async {
        switch action {
        case .toggleApproval(let profile):
            await viewModel.setApproval(for: profile, approved: !profile.isApproved)
        case .toggleAdmin(let profile):
            await viewModel.setAdminRole(for: profile, isAdmin: !profile.isAdmin)
        case .toggleRegular(let profile):
            await viewModel.setRegularRole(for: profile, isRegular: !profile.isRegular)
        case .deactivate(let profile):
            await viewModel.deactivateProfile(profile)
        }
    }
}
