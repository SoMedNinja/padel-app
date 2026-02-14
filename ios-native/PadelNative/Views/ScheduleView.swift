import SwiftUI

struct ScheduleView: View {
    @EnvironmentObject private var viewModel: AppViewModel

    @State private var inviteDateValue = Date()
    @State private var inviteStartTimeValue = ScheduleView.defaultTime(hour: 18, minute: 0)
    @State private var inviteEndTimeValue = ScheduleView.defaultTime(hour: 20, minute: 0)
    @State private var inviteLocation = ""
    @State private var inviteAction = "create"
    @State private var inviteTitle = "Padelpass"
    @State private var selectedInvitees: Set<UUID> = []
    @State private var expandedPolls: [UUID: Bool] = [:]
    @State private var selectedInvitePollId: UUID?
    @State private var selectedInviteDayId: UUID?
    @State private var addToLocalCalendar = false
    @State private var localCalendarStatus: String?
    @State private var showCalendarInviteForm = false

    private let calendarService = CalendarService()

    private let dateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = AppConfig.swedishLocale
        formatter.setLocalizedDateFormatFromTemplate("EEEE d MMM yyyy")
        return formatter
    }()

    private let gameFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = AppConfig.swedishLocale
        formatter.setLocalizedDateFormatFromTemplate("EEEE d MMM yyyy HH:mm")
        return formatter
    }()

    private static func defaultTime(hour: Int, minute: Int) -> Date {
        var components = Calendar.current.dateComponents([.year, .month, .day], from: .now)
        components.hour = hour
        components.minute = minute
        return Calendar.current.date(from: components) ?? .now
    }

    private static let inviteDateISOFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .iso8601)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = .current
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()

    private static let inviteTimeFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .iso8601)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = .current
        formatter.dateFormat = "HH:mm"
        return formatter
    }()

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    statusSection
                    scheduledGamesSection
                    calendarInviteSection
                    pollCardsSection
                    adminSection
                }
                .padding(.horizontal)
                .padding(.top, 4)
                .padding(.bottom, 40)
            }
            .background(AppColors.background)
            .toolbar(.hidden, for: .navigationBar)
            .padelLiquidGlassChrome()
            .task {
                await viewModel.refreshScheduleData()
                syncExpandedPollDefaults()
            }
            .onChange(of: viewModel.polls.count) { _, _ in
                syncExpandedPollDefaults()
            }
            .refreshable {
                await viewModel.refreshScheduleData()
            }
        }
    }

    @ViewBuilder
    private var statusSection: some View {
        if viewModel.isScheduleLoading || viewModel.scheduleErrorMessage != nil || viewModel.scheduleActionMessage != nil || viewModel.deepLinkedPollDayId != nil {
            SectionCard(title: "Status") {
                VStack(alignment: .leading, spacing: 8) {
                    if let deepDay = viewModel.deepLinkedPollDayId {
                        Label("Öppnad via direktlänk till dag: \(deepDay.uuidString.prefix(8))…", systemImage: "link")
                            .font(.inter(.footnote))
                            .foregroundStyle(AppColors.textSecondary)
                    }

                    if viewModel.isScheduleLoading {
                        ProgressView("Laddar schemadata…")
                            .font(.inter(.body))
                    }

                    if let error = viewModel.scheduleErrorMessage {
                        Label(error, systemImage: "exclamationmark.triangle.fill")
                            .font(.inter(.body))
                            .foregroundStyle(AppColors.error)
                    }

                    if let message = viewModel.scheduleActionMessage {
                        Label(message, systemImage: "checkmark.circle.fill")
                            .font(.inter(.body))
                            .foregroundStyle(AppColors.success)
                    }
                }
            }
        }
    }

    private var pollCardsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Omröstningar")
                .font(.inter(.headline, weight: .bold))
                .foregroundStyle(AppColors.textPrimary)
                .padding(.horizontal, 4)

            if viewModel.polls.isEmpty {
                SectionCard(title: "") {
                    Text("Inga omröstningar ännu.")
                        .font(.inter(.body))
                        .foregroundStyle(AppColors.textSecondary)
                }
            } else {
                ForEach(viewModel.polls) { poll in
                    DisclosureGroup(isExpanded: Binding(
                        get: { expandedPolls[poll.id, default: poll.status == .open] },
                        set: { expandedPolls[poll.id] = $0 }
                    )) {
                        pollBody(poll)
                            .padding(.top, 10)
                    } label: {
                        HStack(spacing: 12) {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Vecka \(poll.weekNumber) (\(poll.weekYear))")
                                    .font(.inter(.headline, weight: .bold))
                                    .foregroundStyle(AppColors.textPrimary)
                                Text("\(parsedDate(poll.startDate)) – \(parsedDate(poll.endDate))")
                                    .font(.inter(.caption))
                                    .foregroundStyle(AppColors.textSecondary)
                            }

                            Spacer()

                            let progress = PollDayVoteSummary.calculateProgress(for: poll)
                            VStack(alignment: .trailing, spacing: 4) {
                                Text("\(progress.readyDays)/\(progress.totalDays) spelklara")
                                    .font(.inter(size: 10, weight: .bold))
                                    .foregroundStyle(AppColors.textSecondary)
                                ProgressView(value: progress.percentage)
                                    .tint(AppColors.success)
                                    .frame(width: 60)
                            }

                            statusChip(for: poll)
                        }
                    }
                    .padding()
                    .padelSurfaceCard()
                }
            }
        }
    }

    @ViewBuilder
    private func pollBody(_ poll: AvailabilityPoll) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            let reminder = viewModel.reminderAvailability(for: poll)
            Text(reminder.helper)
                .font(.inter(.caption))
                .foregroundStyle(AppColors.textSecondary)

            if let days = poll.days, !days.isEmpty {
                ForEach(days) { day in
                    dayCard(poll: poll, day: day)
                }
            } else {
                Text("Inga dagar kopplade till denna omröstning.")
                    .font(.inter(.body))
                    .foregroundStyle(AppColors.textSecondary)
            }

            if viewModel.canManageSchedulePolls {
                pollAdminActions(poll: poll, reminder: reminder)
            }
        }
    }

    private func dayCard(poll: AvailabilityPoll, day: AvailabilityPollDay) -> some View {
        let summary = PollDayVoteSummary.evaluate(day: day)
        let myDraft = viewModel.draftForDay(day)

        return VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text(parsedDate(day.date))
                    .font(.inter(.subheadline, weight: .bold))
                    .foregroundStyle(AppColors.textPrimary)
                Spacer()
                Text(summary.isGreen ? "Spelklar" : "Ej spelklar")
                    .font(.inter(size: 10, weight: .bold))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(summary.isGreen ? AppColors.success.opacity(0.1) : AppColors.textSecondary.opacity(0.1), in: Capsule())
                    .foregroundStyle(summary.isGreen ? AppColors.success : AppColors.textSecondary)
            }

            Text("Röster: \(summary.totalVoters) • \(summary.compatibleSlot?.displayName ?? "Ingen gemensam tid ännu")")
                .font(.inter(.caption))
                .foregroundStyle(summary.isGreen ? AppColors.success : AppColors.textSecondary)

            if viewModel.canVoteInSchedulePolls && poll.status == .open {
                VStack(alignment: .leading, spacing: 8) {
                    Toggle("Jag kan spela denna dag", isOn: Binding(
                        get: { myDraft.hasVote },
                        set: { viewModel.setVoteEnabled($0, day: day) }
                    ))
                    .font(.inter(.subheadline))

                    if myDraft.hasVote {
                        Toggle("Tillgänglig hela dagen", isOn: Binding(
                            get: { myDraft.slots.isEmpty },
                            set: { viewModel.setFullDay($0, day: day) }
                        ))
                        .font(.inter(.footnote))
                        .padding(.leading, 20)

                        if !viewModel.draftForDay(day).slots.isEmpty {
                            ForEach(AvailabilitySlot.allCases) { slot in
                                Toggle(slot.displayName, isOn: Binding(
                                    get: { viewModel.draftForDay(day).slots.contains(slot) },
                                    set: { viewModel.setSlot(slot, selected: $0, day: day) }
                                ))
                                .font(.inter(.footnote))
                                .padding(.leading, 20)
                            }
                        }

                        Button(viewModel.isScheduleActionRunning ? "Sparar…" : "Spara röst") {
                            Task { await viewModel.submitVote(for: day) }
                        }
                        .buttonStyle(.borderedProminent)
                        .disabled(viewModel.isScheduleActionRunning)
                        .font(.inter(.subheadline, weight: .bold))
                        .padding(.top, 4)
                    }
                }
                .padding(.vertical, 4)
            }

            let voters = voterRows(for: day)
            if !voters.isEmpty {
                HStack(spacing: 12) {
                    AvatarGroupView(avatars: voters.map { $0.avatarURL }, size: 28)

                    Text("\(voters.count) röst\(voters.count == 1 ? "" : "er")")
                        .font(.inter(.caption))
                        .foregroundStyle(AppColors.textSecondary)

                    Spacer()

                    Menu {
                        ForEach(voters, id: \.id) { voter in
                            Text("\(voter.name) (\(voter.slots))")
                        }
                    } label: {
                        Image(systemName: "info.circle")
                            .font(.caption)
                            .foregroundStyle(AppColors.textSecondary)
                    }
                }
                .padding(.top, 4)
            }
        }
        .padding(12)
        .background(AppColors.background)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    @ViewBuilder
    private func pollAdminActions(poll: AvailabilityPoll, reminder: (canSend: Bool, helper: String)) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Divider()

            Text("Adminåtgärder")
                .font(.inter(.caption, weight: .bold))
                .foregroundStyle(AppColors.textSecondary)

            Toggle("Skicka bara till de som inte röstat", isOn: Binding(
                get: { viewModel.onlyMissingVotesByPoll[poll.id] == true },
                set: { viewModel.onlyMissingVotesByPoll[poll.id] = $0 }
            ))
            .font(.inter(.footnote))

            HStack {
                if poll.status == .open {
                    Button("Stäng") { Task { await viewModel.closeAvailabilityPoll(poll) } }
                        .buttonStyle(.bordered)
                        .font(.inter(.caption, weight: .bold))
                }

                Button("Skicka påminnelse") {
                    Task { await viewModel.sendAvailabilityReminder(for: poll) }
                }
                .buttonStyle(.bordered)
                .font(.inter(.caption, weight: .bold))
                .disabled(!reminder.canSend || viewModel.isScheduleActionRunning)

                Button("Radera", role: .destructive) {
                    Task { await viewModel.deleteAvailabilityPoll(poll) }
                }
                .buttonStyle(.bordered)
                .font(.inter(.caption, weight: .bold))
            }
        }
        .padding(.top, 8)
    }

    private var adminSection: some View {
        Group {
            if viewModel.canManageSchedulePolls {
                SectionCard(title: "Admin: skapa omröstning") {
                    VStack(alignment: .leading, spacing: 12) {
                        Picker("Kommande vecka", selection: $viewModel.selectedScheduleWeekKey) {
                            ForEach(viewModel.scheduleWeekOptions) { option in
                                Text(option.label.replacingOccurrences(of: "Week", with: "Vecka")).tag(option.key)
                            }
                        }
                        .pickerStyle(.menu)

                        Button(viewModel.isScheduleActionRunning ? "Skapar…" : "Skapa omröstning") {
                            Task { await viewModel.createAvailabilityPoll() }
                        }
                        .buttonStyle(PrimaryButtonStyle())
                        .disabled(viewModel.isScheduleActionRunning || viewModel.selectedScheduleWeekKey.isEmpty)
                    }
                }
            }
        }
    }

    private var calendarInviteSection: some View {
        Group {
            if viewModel.canManageSchedulePolls {
                SectionCard(title: "Kalenderinbjudan (admin)") {
                    VStack(alignment: .leading, spacing: 12) {
                        Button(showCalendarInviteForm ? "Dölj kalenderinbjudan" : "Skapa kalenderinbjudan") {
                            withAnimation(.easeInOut(duration: 0.2)) {
                                showCalendarInviteForm.toggle()
                            }
                        }
                        .buttonStyle(PrimaryButtonStyle())

                        if !showCalendarInviteForm {
                            Text("Öppna formuläret när du vill skapa, uppdatera eller avboka en kalenderinbjudan.")
                                .font(.inter(.footnote))
                                .foregroundStyle(AppColors.textSecondary)
                        }

                        if showCalendarInviteForm {
                        Picker("Omröstning", selection: $selectedInvitePollId) {
                            Text("Ingen kopplad omröstning").tag(Optional<UUID>.none)
                            ForEach(viewModel.polls) { poll in
                                Text("Vecka \(poll.weekNumber) (\(poll.weekYear))").tag(Optional(poll.id))
                            }
                        }
                        .pickerStyle(.menu)

                        Picker("Dag", selection: $selectedInviteDayId) {
                            Text("Välj dag").tag(Optional<UUID>.none)
                            ForEach(inviteDays) { day in
                                Text(parsedDate(day.date)).tag(Optional(day.id))
                            }
                        }
                        .pickerStyle(.menu)
                        .onChange(of: selectedInviteDayId) { _, newDayId in
                            guard let day = inviteDays.first(where: { $0.id == newDayId }) else { return }
                            inviteDateValue = dateValue(fromISO: day.date)
                        }

                        DatePicker("Datum", selection: $inviteDateValue, displayedComponents: .date)
                        DatePicker("Starttid", selection: $inviteStartTimeValue, displayedComponents: .hourAndMinute)
                        DatePicker("Sluttid", selection: $inviteEndTimeValue, displayedComponents: .hourAndMinute)

                        TextField("Plats", text: $inviteLocation)
                            .textFieldStyle(.roundedBorder)
                        TextField("Titel", text: $inviteTitle)
                            .textFieldStyle(.roundedBorder)

                        Toggle("Lägg till i iPhone-kalender", isOn: $addToLocalCalendar)
                            .font(.inter(.footnote))

                        Picker("Åtgärd", selection: $inviteAction) {
                            Text("Skapa").tag("create")
                            Text("Uppdatera").tag("update")
                            Text("Avboka").tag("cancel")
                        }
                        .pickerStyle(.segmented)

                        Text("Mottagare")
                            .font(.inter(.subheadline, weight: .bold))

                        HStack {
                            Button("Välj alla") {
                                let allIds = viewModel.players.filter { $0.isRegular }.map(\.id)
                                selectedInvitees = Set(allIds)
                            }
                            .buttonStyle(.bordered)
                            .controlSize(.small)

                            if let pollId = selectedInvitePollId,
                               let dayId = selectedInviteDayId,
                               let poll = viewModel.polls.first(where: { $0.id == pollId }),
                               let day = poll.days?.first(where: { $0.id == dayId }) {
                                Button("Välj röstade") {
                                    let votedIds = day.votes?.map(\.profileId) ?? []
                                    selectedInvitees = Set(votedIds)
                                }
                                .buttonStyle(.bordered)
                                .controlSize(.small)
                            }

                            Button("Rensa") {
                                selectedInvitees.removeAll()
                            }
                            .buttonStyle(.bordered)
                            .controlSize(.small)
                        }

                        VStack(alignment: .leading, spacing: 4) {
                            ForEach(viewModel.players.filter { $0.isRegular }) { player in
                                Toggle(player.profileName, isOn: Binding(
                                    get: { selectedInvitees.contains(player.id) },
                                    set: { enabled in
                                        if enabled { selectedInvitees.insert(player.id) }
                                        else { selectedInvitees.remove(player.id) }
                                    }
                                ))
                                .font(.inter(.footnote))
                            }
                        }

                        Button(viewModel.isScheduleActionRunning ? "Skickar…" : "Skicka kalenderinbjudan") {
                            Task {
                                localCalendarStatus = nil
                                await viewModel.sendCalendarInvite(
                                    pollId: selectedInvitePollId,
                                    date: Self.inviteDateISOFormatter.string(from: inviteDateValue),
                                    startTime: Self.inviteTimeFormatter.string(from: inviteStartTimeValue),
                                    endTime: Self.inviteTimeFormatter.string(from: inviteEndTimeValue),
                                    location: inviteLocation.isEmpty ? nil : inviteLocation,
                                    inviteeProfileIds: Array(selectedInvitees),
                                    action: inviteAction,
                                    title: inviteTitle.isEmpty ? nil : inviteTitle
                                )

                                guard addToLocalCalendar, inviteAction != "cancel" else { return }
                                do {
                                    try await calendarService.upsertLocalEvent(
                                        title: inviteTitle.isEmpty ? "Padelpass" : inviteTitle,
                                        date: inviteDateValue,
                                        startTime: inviteStartTimeValue,
                                        endTime: inviteEndTimeValue,
                                        location: inviteLocation.isEmpty ? nil : inviteLocation
                                    )
                                    localCalendarStatus = "Lokal kalenderpost skapad."
                                } catch {
                                    localCalendarStatus = "Kunde inte spara: \(error.localizedDescription)"
                                }
                            }
                        }
                        .buttonStyle(PrimaryButtonStyle())
                        .disabled(selectedInvitees.isEmpty || inviteEndTimeValue <= inviteStartTimeValue)

                        if let localCalendarStatus {
                            Text(localCalendarStatus)
                                .font(.inter(.caption))
                                .foregroundStyle(AppColors.textSecondary)
                        }
                        }
                    }
                }
            }
        }
    }

    private var scheduledGamesSection: some View {
        SectionCard(title: "Schemalagda matcher") {
            if viewModel.schedule.isEmpty {
                Text("Inga matcher schemalagda ännu.")
                    .font(.inter(.body))
                    .foregroundStyle(AppColors.textSecondary)
            } else {
                VStack(alignment: .leading, spacing: 16) {
                    ForEach(viewModel.schedule) { game in
                        VStack(alignment: .leading, spacing: 4) {
                            Text(game.description ?? "Bokning")
                                .font(.inter(.headline, weight: .bold))
                                .foregroundStyle(AppColors.textPrimary)
                            Text(game.location ?? "Okänd bana")
                                .font(.inter(.subheadline))
                                .foregroundStyle(AppColors.textSecondary)
                            Text(gameFormatter.string(from: game.startsAt))
                                .font(.inter(.caption))
                                .foregroundStyle(AppColors.brandPrimary)
                        }

                        if game.id != viewModel.schedule.last?.id {
                            Divider()
                                .background(AppColors.borderSubtle)
                        }
                    }
                }
            }
        }
    }

    private var inviteDays: [AvailabilityPollDay] {
        guard let pollId = selectedInvitePollId,
              let poll = viewModel.polls.first(where: { $0.id == pollId }) else { return [] }
        return poll.days ?? []
    }

    private func statusChip(for poll: AvailabilityPoll) -> some View {
        StatusChip(
            title: poll.status == .open ? "Öppen" : "Stängd",
            tint: poll.status == .open ? AppColors.success : AppColors.textSecondary
        )
    }

    private func syncExpandedPollDefaults() {
        for (index, poll) in viewModel.polls.enumerated() where expandedPolls[poll.id] == nil {
            expandedPolls[poll.id] = index == 0 && poll.status == .open
        }
    }

    private func voterRows(for day: AvailabilityPollDay) -> [(id: UUID, name: String, slots: String, avatarURL: String?)] {
        let dedupedVotes = Dictionary(grouping: day.votes ?? [], by: { $0.profileId }).compactMap { $0.value.last }
        return dedupedVotes.map { vote in
            let player = viewModel.players.first(where: { $0.id == vote.profileId })
            let name = player?.profileName ?? player?.fullName ?? "Unknown"
            let avatarURL = player?.avatarURL

            let slotText: String
            if let multi = vote.slotPreferences, !multi.isEmpty {
                slotText = multi.map(\.displayName).joined(separator: "/")
            } else if let single = vote.slot {
                slotText = single.displayName
            } else {
                slotText = "Hela dagen"
            }
            return (vote.profileId, name, slotText, avatarURL)
        }
        .sorted { $0.name < $1.name }
    }


    private func dateValue(fromISO rawDate: String) -> Date {
        ScheduleView.inviteDateISOFormatter.date(from: rawDate) ?? .now
    }

    private func parsedDate(_ rawDate: String) -> String {
        let parts = rawDate.split(separator: "-")
        guard parts.count == 3,
              let year = Int(parts[0]),
              let month = Int(parts[1]),
              let day = Int(parts[2]) else {
            return rawDate
        }

        var components = DateComponents()
        components.year = year
        components.month = month
        components.day = day
        let calendar = Calendar(identifier: .gregorian)
        guard let date = calendar.date(from: components) else { return rawDate }
        return dateFormatter.string(from: date)
    }
}
