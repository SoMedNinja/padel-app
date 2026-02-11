import SwiftUI

struct ScheduleView: View {
    @EnvironmentObject private var viewModel: AppViewModel

    @State private var inviteDate = ""
    @State private var inviteStartTime = "18:00"
    @State private var inviteEndTime = "20:00"
    @State private var inviteLocation = ""
    @State private var inviteAction = "create"
    @State private var inviteTitle = "Padelpass"
    @State private var selectedInvitees: Set<UUID> = []
    @State private var expandedPolls: [UUID: Bool] = [:]
    @State private var selectedInvitePollId: UUID?
    @State private var selectedInviteDayId: UUID?

    private let dateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .none
        return formatter
    }()

    private let gameFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter
    }()

    var body: some View {
        NavigationStack {
            List {
                statusSection
                pollCardsSection
                adminSection
                calendarInviteSection
                scheduledGamesSection
            }
            .navigationTitle("Schema")
            .padelLiquidGlassChrome()
            .task {
                await viewModel.refreshScheduleData()
                prefillInviteDateIfNeeded()
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

    private var statusSection: some View {
        Section {
            Text("Note for non-coders: den här sidan visar samma kärnflöde som webben: öppna/stänga omröstningar, rösta med tidsluckor och skicka kalenderinbjudan.")
                .font(.footnote)
                .foregroundStyle(.secondary)

            if let deepDay = viewModel.deepLinkedPollDayId {
                Label("Öppnad via direktlänk till dag: \(deepDay.uuidString.prefix(8))…", systemImage: "link")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }

            if viewModel.isScheduleLoading {
                ProgressView("Laddar schemadata…")
            }

            if let error = viewModel.scheduleErrorMessage {
                Label(error, systemImage: "exclamationmark.triangle.fill")
                    .foregroundStyle(.red)
            }

            if let message = viewModel.scheduleActionMessage {
                Label(message, systemImage: "checkmark.circle.fill")
                    .foregroundStyle(.green)
            }
        }
    }

    private var pollCardsSection: some View {
        Section("Omröstningar") {
            if viewModel.polls.isEmpty {
                Text("Inga omröstningar ännu.")
                    .foregroundStyle(.secondary)
            } else {
                ForEach(viewModel.polls) { poll in
                    DisclosureGroup(isExpanded: Binding(
                        get: { expandedPolls[poll.id, default: poll.status == .open] },
                        set: { expandedPolls[poll.id] = $0 }
                    )) {
                        pollBody(poll)
                    } label: {
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Vecka \(poll.weekNumber) (\(poll.weekYear))")
                                    .font(.headline)
                                Text("\(parsedDate(poll.startDate)) – \(parsedDate(poll.endDate))")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                            statusChip(for: poll)
                        }
                    }
                }
            }
        }
    }

    @ViewBuilder
    private func pollBody(_ poll: AvailabilityPoll) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            let reminder = viewModel.reminderAvailability(for: poll)
            Text(reminder.helper)
                .font(.caption)
                .foregroundStyle(.secondary)

            if let days = poll.days, !days.isEmpty {
                ForEach(days) { day in
                    dayCard(poll: poll, day: day)
                }
            } else {
                Text("Inga dagar kopplade till denna omröstning.")
                    .foregroundStyle(.secondary)
            }

            if viewModel.canManageSchedulePolls {
                pollAdminActions(poll: poll, reminder: reminder)
            }
        }
        .padding(.vertical, 4)
    }

    private func dayCard(poll: AvailabilityPoll, day: AvailabilityPollDay) -> some View {
        let summary = PollDayVoteSummary.evaluate(day: day)
        let myDraft = viewModel.draftForDay(day)

        return VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(parsedDate(day.date))
                    .font(.subheadline.weight(.semibold))
                Spacer()
                Text(summary.isGreen ? "Spelklar" : "Ej spelklar")
                    .font(.caption.weight(.semibold))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(summary.isGreen ? Color.green.opacity(0.2) : Color.gray.opacity(0.2), in: Capsule())
            }

            Text("Röster: \(summary.totalVoters) • \(summary.compatibleSlot?.displayName ?? "Ingen gemensam tid ännu")")
                .font(.caption)
                .foregroundStyle(summary.isGreen ? .green : .secondary)

            if viewModel.canVoteInSchedulePolls && poll.status == .open {
                Toggle("Jag kan spela denna dag", isOn: Binding(
                    get: { myDraft.hasVote },
                    set: { viewModel.setVoteEnabled($0, day: day) }
                ))

                if myDraft.hasVote {
                    Toggle("Tillgänglig hela dagen", isOn: Binding(
                        get: { myDraft.slots.isEmpty },
                        set: { viewModel.setFullDay($0, day: day) }
                    ))

                    if !viewModel.draftForDay(day).slots.isEmpty {
                        ForEach(AvailabilitySlot.allCases) { slot in
                            Toggle(slot.displayName, isOn: Binding(
                                get: { viewModel.draftForDay(day).slots.contains(slot) },
                                set: { viewModel.setSlot(slot, selected: $0, day: day) }
                            ))
                        }
                    }

                    Button(viewModel.isScheduleActionRunning ? "Sparar…" : "Spara röst") {
                        Task { await viewModel.submitVote(for: day) }
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(viewModel.isScheduleActionRunning)
                }
            }

            let voters = voterRows(for: day)
            if !voters.isEmpty {
                Text("Väljare och tider")
                    .font(.caption.weight(.semibold))
                ForEach(voters, id: \.id) { voter in
                    HStack {
                        Text(voter.name)
                        Spacer()
                        Text(voter.slots)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
        .padding(10)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
    }

    @ViewBuilder
    private func pollAdminActions(poll: AvailabilityPoll, reminder: (canSend: Bool, helper: String)) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Toggle("Skicka bara till de som inte röstat", isOn: Binding(
                get: { viewModel.onlyMissingVotesByPoll[poll.id] == true },
                set: { viewModel.onlyMissingVotesByPoll[poll.id] = $0 }
            ))

            HStack {
                if poll.status == .open {
                    Button("Stäng") { Task { await viewModel.closeAvailabilityPoll(poll) } }
                        .buttonStyle(.bordered)
                }

                Button("Skicka påminnelse") {
                    Task { await viewModel.sendAvailabilityReminder(for: poll) }
                }
                .buttonStyle(.bordered)
                .disabled(!reminder.canSend || viewModel.isScheduleActionRunning)

                Button("Radera", role: .destructive) {
                    Task { await viewModel.deleteAvailabilityPoll(poll) }
                }
                .buttonStyle(.bordered)
            }
        }
    }

    private var adminSection: some View {
        Section("Admin: skapa omröstning") {
            if !viewModel.canManageSchedulePolls {
                Text("Adminåtgärder visas bara för administratörer.")
                    .foregroundStyle(.secondary)
            } else {
                Picker("Kommande vecka", selection: $viewModel.selectedScheduleWeekKey) {
                    ForEach(viewModel.scheduleWeekOptions) { option in
                        Text(option.label).tag(option.key)
                    }
                }

                Button(viewModel.isScheduleActionRunning ? "Skapar…" : "Skapa omröstning") {
                    Task { await viewModel.createAvailabilityPoll() }
                }
                .buttonStyle(.borderedProminent)
                .disabled(viewModel.isScheduleActionRunning || viewModel.selectedScheduleWeekKey.isEmpty)
            }
        }
    }

    private var calendarInviteSection: some View {
        Section("Kalenderinbjudan (admin)") {
            if !viewModel.canManageSchedulePolls {
                Text("Endast admin kan skicka kalenderinbjudningar.")
                    .foregroundStyle(.secondary)
            } else {
                Picker("Omröstning", selection: $selectedInvitePollId) {
                    Text("Ingen kopplad omröstning").tag(Optional<UUID>.none)
                    ForEach(viewModel.polls) { poll in
                        Text("Vecka \(poll.weekNumber) (\(poll.weekYear))").tag(Optional(poll.id))
                    }
                }

                Picker("Dag", selection: $selectedInviteDayId) {
                    Text("Välj dag").tag(Optional<UUID>.none)
                    ForEach(inviteDays) { day in
                        Text(parsedDate(day.date)).tag(Optional(day.id))
                    }
                }
                .onChange(of: selectedInviteDayId) { _, newDayId in
                    guard let day = inviteDays.first(where: { $0.id == newDayId }) else { return }
                    inviteDate = day.date
                }

                TextField("Datum (YYYY-MM-DD)", text: $inviteDate)
                TextField("Starttid (HH:MM)", text: $inviteStartTime)
                TextField("Sluttid (HH:MM)", text: $inviteEndTime)
                TextField("Plats", text: $inviteLocation)
                TextField("Titel", text: $inviteTitle)

                Picker("Åtgärd", selection: $inviteAction) {
                    Text("Skapa").tag("create")
                    Text("Uppdatera").tag("update")
                    Text("Avboka").tag("cancel")
                }

                Text("Mottagare")
                    .font(.subheadline.weight(.semibold))
                ForEach(viewModel.players.filter { $0.isRegular }) { player in
                    Toggle(player.profileName, isOn: Binding(
                        get: { selectedInvitees.contains(player.id) },
                        set: { enabled in
                            if enabled { selectedInvitees.insert(player.id) }
                            else { selectedInvitees.remove(player.id) }
                        }
                    ))
                }

                Button(viewModel.isScheduleActionRunning ? "Skickar…" : "Skicka kalenderinbjudan") {
                    Task {
                        await viewModel.sendCalendarInvite(
                            pollId: selectedInvitePollId,
                            date: inviteDate,
                            startTime: inviteStartTime,
                            endTime: inviteEndTime,
                            location: inviteLocation.isEmpty ? nil : inviteLocation,
                            inviteeProfileIds: Array(selectedInvitees),
                            action: inviteAction,
                            title: inviteTitle.isEmpty ? nil : inviteTitle
                        )
                    }
                }
                .buttonStyle(.borderedProminent)
                .disabled(selectedInvitees.isEmpty || inviteDate.isEmpty || !isValidTime(inviteStartTime) || !isValidTime(inviteEndTime))

                Text("Note for non-coders: dagväljaren minskar fel genom att återanvända datum direkt från omröstningen istället för fri inmatning.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private var scheduledGamesSection: some View {
        Section("Schemalagda matcher") {
            if viewModel.schedule.isEmpty {
                Text("Inga matcher schemalagda ännu.")
                    .foregroundStyle(.secondary)
            } else {
                ForEach(viewModel.schedule) { game in
                    VStack(alignment: .leading, spacing: 6) {
                        Text(game.description)
                            .font(.headline)
                        Text(game.location)
                        Text(gameFormatter.string(from: game.startsAt))
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    .padding(.vertical, 4)
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
        Text(poll.status == .open ? "Öppen" : "Stängd")
            .font(.caption.weight(.semibold))
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(poll.status == .open ? Color.green.opacity(0.18) : Color.gray.opacity(0.18), in: Capsule())
    }

    private func syncExpandedPollDefaults() {
        for (index, poll) in viewModel.polls.enumerated() where expandedPolls[poll.id] == nil {
            // Note for non-coders: like web, the first open poll expands by default while others stay collapsed.
            expandedPolls[poll.id] = index == 0 && poll.status == .open
        }
    }

    private func voterRows(for day: AvailabilityPollDay) -> [(id: UUID, name: String, slots: String)] {
        let dedupedVotes = Dictionary(grouping: day.votes ?? [], by: { $0.profileId }).compactMap { $0.value.last }
        return dedupedVotes.map { vote in
            let name = viewModel.players.first(where: { $0.id == vote.profileId })?.profileName
            ?? viewModel.players.first(where: { $0.id == vote.profileId })?.fullName
            ?? "Unknown"

            let slotText: String
            if let multi = vote.slotPreferences, !multi.isEmpty {
                slotText = multi.map(\.displayName).joined(separator: "/")
            } else if let single = vote.slot {
                slotText = single.displayName
            } else {
                slotText = "Hela dagen"
            }
            return (vote.profileId, name, slotText)
        }
        .sorted { $0.name < $1.name }
    }

    private func isValidTime(_ value: String) -> Bool {
        let parts = value.split(separator: ":")
        guard parts.count == 2, let h = Int(parts[0]), let m = Int(parts[1]) else { return false }
        return (0...23).contains(h) && (0...59).contains(m)
    }

    private func prefillInviteDateIfNeeded() {
        guard inviteDate.isEmpty else { return }
        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withFullDate]
        inviteDate = iso.string(from: .now)
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
