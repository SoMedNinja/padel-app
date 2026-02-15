import SwiftUI
import WebKit

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
    @State private var pullProgress: CGFloat = 0

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.canUseAdmin {
                    ScrollView {
                        VStack(spacing: 20) {
                            ScrollOffsetTracker()
                            PadelRefreshHeader(isRefreshing: viewModel.isDashboardLoading && !viewModel.adminProfiles.isEmpty, pullProgress: pullProgress)
                            SectionCard(title: "Adminområde") {
                                Picker("Område", selection: $selectedTab) {
                                    ForEach(AdminTab.allCases) { tab in
                                        Text(tab.rawValue).tag(tab)
                                    }
                                }
                                .pickerStyle(.segmented)
                            }

                            if let adminBanner = viewModel.adminBanner {
                                bannerView(adminBanner)
                            }

                            switch selectedTab {
                            case .users:
                                usersSection
                            case .reports:
                                reportsSection
                            case .emails:
                                emailsSection
                            }

                            SectionCard(title: "Information") {
                                Text("Här hanterar du användare, rapporter och e-postutskick. Alla åtgärder loggas och kräver adminbehörighet.")
                                    .font(.inter(.footnote))
                                    .foregroundStyle(AppColors.textSecondary)
                            }
                        }
                        .padding()
                    }
                    .background(AppColors.background)
                    .coordinateSpace(name: "padelScroll")
                    .onPreferenceChange(ScrollOffsetPreferenceKey.self) { offset in
                        let threshold: CGFloat = 80
                        pullProgress = max(0, min(1.0, offset / threshold))
                    }
                    .overlay {
                        if viewModel.isAdminActionRunning || viewModel.isAdminReportRunning || viewModel.isAdminEmailActionRunning {
                            ProgressView("Bearbetar...")
                                .font(.inter(.body))
                                .padding()
                                .padelGlassCard()
                        }
                    }
                } else {
                    ContentUnavailableView(
                        "Admin-behörighet krävs",
                        systemImage: "lock.shield",
                        description: Text("Dessa verktyg är endast tillgängliga för administratörer.")
                            .font(.inter(.body))
                    )
                }
            }
            .navigationTitle("Admin")
            .navigationBarTitleDisplayMode(.inline)
            .padelLiquidGlassChrome()
            .task {
                guard viewModel.canUseAdmin else { return }
                // Note for non-coders: if a deep link requested a specific admin section,
                // we read that one-time value before loading content so the right tab is visible immediately.
                if let deepLinkedSection = viewModel.consumeDeepLinkedAdminSection() {
                    switch deepLinkedSection {
                    case "emails":
                        selectedTab = .emails
                    case "reports":
                        selectedTab = .reports
                    default:
                        selectedTab = .users
                    }
                }

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

    @ViewBuilder
    private var usersSection: some View {
        VStack(spacing: 20) {
            SectionCard(title: "Översikt") {
                let pendingCount = viewModel.adminProfiles.filter { !$0.isApproved && !$0.isDeleted }.count
                let adminCount = viewModel.adminProfiles.filter { $0.isAdmin && !$0.isDeleted }.count

                VStack(spacing: 12) {
                    HStack(spacing: 12) {
                        metricCard(title: "Spelare", value: "\(viewModel.adminSnapshot.playerCount)", icon: "person.2.fill", color: .blue)
                        metricCard(title: "Väntar", value: "\(pendingCount)", icon: "hourglass", color: pendingCount > 0 ? .orange : .green)
                        metricCard(title: "Admins", value: "\(adminCount)", icon: "shield.fill", color: .purple)
                    }

                    Divider()
                        .background(AppColors.borderSubtle)

                    metricRow(label: "Matcher totalt", value: "\(viewModel.adminSnapshot.matchCount)")
                    metricRow(label: "Schemalagda pass", value: "\(viewModel.adminSnapshot.scheduledCount)")
                }
            }

            SectionCard(title: "Användarhantering") {
                VStack(alignment: .leading, spacing: 16) {
                    VStack(spacing: 12) {
                        TextField("Sök spelare...", text: $userSearchText)
                            .textFieldStyle(.roundedBorder)
                            .font(.inter(.body))

                        Picker("Filtrera", selection: $userFilter) {
                            ForEach(AdminUserFilter.allCases) { filter in
                                Text(filter.rawValue).tag(filter)
                            }
                        }
                        .pickerStyle(.segmented)
                    }

                    VStack(spacing: 0) {
                        ForEach(filteredAdminProfiles) { profile in
                            userRow(profile: profile)
                            if profile.id != filteredAdminProfiles.last?.id {
                                Divider()
                                    .background(AppColors.borderSubtle)
                            }
                        }
                    }
                }
            }
        }
    }

    private func userRow(profile: AdminProfile) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(profile.name)
                        .font(.inter(.headline, weight: .bold))
                        .foregroundStyle(AppColors.textPrimary)
                    if profile.isDeleted {
                        Text("RADERAD ANVÄNDARE")
                            .font(.inter(size: 8, weight: .bold))
                            .foregroundStyle(AppColors.error)
                    }
                }
                Spacer()
                if !profile.isDeleted {
                    if profile.isApproved {
                        Label("Godkänd", systemImage: "checkmark.seal.fill")
                            .font(.inter(.caption, weight: .bold))
                            .foregroundStyle(AppColors.success)
                    } else {
                        Label("Väntar", systemImage: "hourglass")
                            .font(.inter(.caption, weight: .bold))
                            .foregroundStyle(.orange)
                    }
                }
            }

            if !profile.isDeleted {
                HStack {
                    Text(profile.isRegular ? "Ordinarie" : "Gäst")
                        .font(.inter(size: 8, weight: .bold))
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(AppColors.textSecondary.opacity(0.1), in: Capsule())
                        .foregroundStyle(AppColors.textSecondary)

                    if profile.isAdmin {
                        Text("Admin")
                            .font(.inter(size: 8, weight: .bold))
                            .foregroundStyle(.purple)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color.purple.opacity(0.1), in: Capsule())
                    }

                    Spacer()

                    Menu {
                        Button { pendingAction = .toggleApproval(profile) } label: {
                            Label(profile.isApproved ? "Dra in godkännande" : "Godkänn", systemImage: profile.isApproved ? "xmark.seal" : "checkmark.seal")
                        }
                        Button { renamingProfile = profile; newPlayerName = profile.name } label: {
                            Label("Byt namn", systemImage: "pencil")
                        }
                        Button(role: .destructive) { pendingAction = .deactivate(profile) } label: {
                            Label("Inaktivera", systemImage: "person.crop.circle.badge.xmark")
                        }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                            .font(.body)
                            .foregroundStyle(AppColors.brandPrimary)
                    }
                }
            }
        }
        .padding(.vertical, 12)
        .opacity(profile.isDeleted ? 0.6 : 1.0)
    }

    @ViewBuilder
    private var reportsSection: some View {
        VStack(spacing: 20) {
            SectionCard(title: "Matchkvälls-recap") {
                VStack(alignment: .leading, spacing: 12) {
                    Text("Välj en spelkväll ur listan för att generera en sammanfattning.")
                        .font(.inter(.caption))
                        .foregroundStyle(AppColors.textSecondary)

                    Picker("Välj spelkväll", selection: $selectedEvening) {
                        if viewModel.adminMatchEveningOptions.isEmpty {
                            Text("Inga kvällar hittades").tag("")
                        }
                        ForEach(viewModel.adminMatchEveningOptions, id: \.self) { day in
                            Text(day).tag(day)
                        }
                    }
                    .pickerStyle(.menu)

                    Button {
                        viewModel.generateMatchEveningReport(for: selectedEvening)
                        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                    } label: {
                        Label("Generera & Förhandsgranska", systemImage: "doc.text.magnifyingglass")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .font(.inter(.subheadline, weight: .bold))
                    .disabled(selectedEvening.isEmpty)
                }
            }

            SectionCard(title: "Turneringsrecap") {
                VStack(alignment: .leading, spacing: 12) {
                    Text("Välj en avslutad turnering för att generera en sammanfattning.")
                        .font(.inter(.caption))
                        .foregroundStyle(AppColors.textSecondary)

                    Picker("Slutförd turnering", selection: $selectedReportTournamentId) {
                        Text("Välj turnering...").tag(Optional<UUID>.none)
                        ForEach(viewModel.tournaments.filter { $0.status == "completed" }) { tournament in
                            Text(tournament.name).tag(Optional(tournament.id))
                        }
                    }
                    .pickerStyle(.menu)

                    Button {
                        guard let id = selectedReportTournamentId else { return }
                        Task {
                            await viewModel.generateTournamentReport(for: id)
                            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                        }
                    } label: {
                        Label("Generera & Förhandsgranska", systemImage: "trophy.fill")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .font(.inter(.subheadline, weight: .bold))
                    .disabled(selectedReportTournamentId == nil)
                }
            }

            previewSection(
                title: "Förhandsgranska / Dela",
                content: viewModel.adminReportPreviewText,
                status: viewModel.adminReportStatusMessage
            )
        }
    }

    @ViewBuilder
    private var emailsSection: some View {
        VStack(spacing: 20) {
            SectionCard(title: "Veckobrev") {
                VStack(alignment: .leading, spacing: 12) {
                    Picker("Tidsram", selection: $selectedWeeklyTimeframe) {
                        ForEach(AdminWeeklyTimeframe.allCases) { option in
                            Text(option.title.replacingOccurrences(of: "Last 7 days", with: "Senaste 7 dagarna").replacingOccurrences(of: "Last 30 days", with: "Senaste 30 dagarna")).tag(option)
                        }
                    }
                    .pickerStyle(.segmented)

                    if selectedWeeklyTimeframe == .isoWeek {
                        Stepper("ISO Vecka: \(selectedISOWeek)", value: $selectedISOWeek, in: 1...53)
                            .font(.inter(.subheadline))
                        Stepper("ISO År: \(selectedISOYear)", value: $selectedISOYear, in: 2020...2100)
                            .font(.inter(.subheadline))
                    }

                    VStack(spacing: 12) {
                        Button {
                            let week = selectedWeeklyTimeframe == .isoWeek ? selectedISOWeek : nil
                            let year = selectedWeeklyTimeframe == .isoWeek ? selectedISOYear : nil
                            Task {
                                await viewModel.buildWeeklyEmailPreview(timeframe: selectedWeeklyTimeframe, week: week, year: year)
                                UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                            }
                        } label: {
                            Label("Förhandsgranska Veckobrev", systemImage: "eye.fill")
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.bordered)

                        Button {
                            let week = selectedWeeklyTimeframe == .isoWeek ? selectedISOWeek : nil
                            let year = selectedWeeklyTimeframe == .isoWeek ? selectedISOYear : nil
                            Task { await viewModel.sendWeeklyEmailTest(timeframe: selectedWeeklyTimeframe, week: week, year: year) }
                        } label: {
                            Label("Skicka test-brev", systemImage: "paperplane.fill")
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.borderedProminent)
                    }
                    .font(.inter(.subheadline, weight: .bold))
                }
            }

            SectionCard(title: "Turneringsbrev") {
                VStack(alignment: .leading, spacing: 12) {
                    Picker("Slutförd turnering", selection: $selectedEmailTournamentId) {
                        Text("Välj turnering").tag(Optional<UUID>.none)
                        ForEach(viewModel.tournaments.filter { $0.status == "completed" }) { tournament in
                            Text(tournament.name).tag(Optional(tournament.id))
                        }
                    }
                    .pickerStyle(.menu)

                    VStack(spacing: 12) {
                        Button {
                            guard let id = selectedEmailTournamentId else { return }
                            Task {
                                await viewModel.buildTournamentEmailPreview(for: id)
                                UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                            }
                        } label: {
                            Label("Förhandsgranska Turneringsbrev", systemImage: "eye.fill")
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.bordered)
                        .disabled(selectedEmailTournamentId == nil)

                        Button {
                            Task { await viewModel.sendTournamentEmailTest() }
                        } label: {
                            Label("Skicka test-brev", systemImage: "paperplane.fill")
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.borderedProminent)
                    }
                    .font(.inter(.subheadline, weight: .bold))
                }
            }

            previewSection(
                title: "E-post förhandsgranskning",
                content: viewModel.adminEmailPreviewText,
                status: viewModel.adminEmailStatusMessage,
                renderAsEmail: true,
                htmlContent: viewModel.adminEmailPreviewHTML
            )
        }
    }

    private func metricRow(label: String, value: String) -> some View {
        HStack {
            Text(label)
                .font(.inter(.subheadline))
                .foregroundStyle(AppColors.textSecondary)
            Spacer()
            Text(value)
                .font(.inter(.subheadline, weight: .bold))
                .foregroundStyle(AppColors.textPrimary)
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
                    .font(.inter(.title2, weight: .bold))
                Spacer()
            }

            HStack {
                Text(title)
                    .font(.inter(size: 8, weight: .bold))
                    .foregroundStyle(AppColors.textSecondary)
                Spacer()
            }
        }
        .padding(12)
        .frame(maxWidth: .infinity)
        .background(AppColors.background)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    @ViewBuilder
    private func previewSection(title: String, content: String?, status: String?, renderAsEmail: Bool = false, htmlContent: String? = nil) -> some View {
        SectionCard(title: title) {
            VStack(alignment: .leading, spacing: 12) {
                if let content, content.isEmpty == false {
                    ScrollView {
                        if renderAsEmail {
                            // Note for non-coders: `Group` lets us apply one shared style (`frame`) to either email branch below.
                            Group {
                                if let htmlContent, htmlContent.isEmpty == false {
                                    // Note for non-coders: when this HTML exists, it is the exact email body from the backend.
                                    HTMLPreviewWebView(html: htmlContent)
                                        .frame(height: 420)
                                        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                                } else {
                                    emailPreviewCard(content: content)
                                }
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                        } else {
                            Text(content)
                                .font(.system(.caption, design: .monospaced))
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .textSelection(.enabled)
                        }
                    }
                    .frame(maxHeight: 280)
                    .padding(10)
                    .background(AppColors.background)
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))

                    HStack {
                        if let cardURL = adminShareImageURL(content: content, title: title) {
                            ShareLink(item: cardURL) {
                                Label("Dela bild", systemImage: "photo.on.rectangle")
                            }
                        }

                        ShareLink(item: content) {
                            Label("Dela text", systemImage: "square.and.arrow.up")
                        }
                    }
                    .font(.inter(.caption, weight: .bold))
                } else {
                    Text("Ingen förhandsgranskning än.")
                        .font(.inter(.footnote))
                        .foregroundStyle(AppColors.textSecondary)
                }

                if let status, status.isEmpty == false {
                    Text(status)
                        .font(.inter(.caption2))
                        .foregroundStyle(AppColors.textSecondary)
                }
            }
        }
    }


    @ViewBuilder
    private func emailPreviewCard(content: String) -> some View {
        // Note for non-coders: this converts preview text into simple HTML so admins see
        // a realistic email card (closer to the web/PWA preview) instead of plain monospaced text.
        HTMLPreviewWebView(html: buildEmailHTML(from: content))
            .frame(height: 420)
            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
    }

    private func buildEmailHTML(from content: String) -> String {
        let escaped = content
            .replacingOccurrences(of: "&", with: "&amp;")
            .replacingOccurrences(of: "<", with: "&lt;")
            .replacingOccurrences(of: ">", with: "&gt;")
        let paragraphs = escaped
            .split(separator: "\n", omittingEmptySubsequences: false)
            .map { line -> String in
                let value = String(line).trimmingCharacters(in: .whitespacesAndNewlines)
                if value.isEmpty { return "<div style='height:10px'></div>" }
                if value.hasSuffix(":") {
                    return "<h4 style='margin:8px 0 4px;font-size:12px;letter-spacing:0.6px;color:#6B7280;text-transform:uppercase;'>\(value)</h4>"
                }
                return "<p style='margin:0 0 8px;font-size:14px;line-height:1.5;color:#111827;'>\(value)</p>"
            }
            .joined()

        return """
        <html>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <body style="margin:0;background:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
            <div style="max-width:680px;margin:0 auto;padding:12px;">
              <div style="background:#FFFFFF;border:1px solid #E5E7EB;border-radius:12px;padding:14px;">\(paragraphs)</div>
            </div>
          </body>
        </html>
        """
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
                .font(.inter(.subheadline))
                .multilineTextAlignment(.leading)
        }
        .foregroundStyle(.white)
        .padding(10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(banner.style == .success ? AppColors.success : AppColors.error)
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


private struct HTMLPreviewWebView: UIViewRepresentable {
    let html: String

    func makeUIView(context: Context) -> WKWebView {
        let webView = WKWebView(frame: .zero)
        webView.isOpaque = false
        webView.backgroundColor = .clear
        webView.scrollView.isScrollEnabled = false
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {
        uiView.loadHTMLString(html, baseURL: nil)
    }
}
