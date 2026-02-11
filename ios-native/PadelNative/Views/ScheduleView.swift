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
                activePollsSection
                votingSection
                adminSection
                calendarInviteSection
                scheduledGamesSection
            }
            .navigationTitle("Schema")
            .padelLiquidGlassChrome()
            .task {
                await viewModel.refreshScheduleData()
                prefillInviteDateIfNeeded()
            }
            .refreshable {
                await viewModel.refreshScheduleData()
            }
        }
    }

    private var statusSection: some View {
        Section {
            Text("Note for non-coders: gäster kan inte rösta, ordinarie spelare kan rösta, och admins kan hantera omröstningar och inbjudningar.")
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

    private var activePollsSection: some View {
        Section("Aktiva omröstningar") {
            let activePolls = viewModel.polls.filter { $0.status == .open }

            if activePolls.isEmpty {
                Text("Inga aktiva omröstningar just nu.")
                    .foregroundStyle(.secondary)
            } else {
                ForEach(activePolls) { poll in
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Vecka \(poll.weekNumber) (\(poll.weekYear))")
                            .font(.headline)
                        Text("\((poll.days ?? []).count) dagar öppna för röster")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    .padding(.vertical, 4)
                }
            }
        }
    }

    private var votingSection: some View {
        Section("Röstning") {
            if !viewModel.canVoteInSchedulePolls {
                Text("Du behöver regular-medlemskap för att rösta.")
                    .foregroundStyle(.secondary)
            } else {
                let votablePolls = viewModel.polls.filter { $0.status == .open }
                if votablePolls.isEmpty {
                    Text("Inga öppna omröstningar att rösta i.")
                        .foregroundStyle(.secondary)
                } else {
                    ForEach(votablePolls) { poll in
                        if let days = poll.days {
                            ForEach(days) { day in
                                VStack(alignment: .leading, spacing: 10) {
                                    let summary = PollDayVoteSummary.evaluate(day: day)
                                    Text(parsedDate(day.date))
                                        .font(.headline)
                                    Text("Röster: \(summary.totalVoters) • \(summary.isGreen ? "Spelbar" : "Inte nog med överlapp än")")
                                        .font(.caption)
                                        .foregroundStyle(summary.isGreen ? .green : .secondary)

                                    Toggle("Jag kan spela denna dag", isOn: Binding(
                                        get: { viewModel.draftForDay(day).hasVote },
                                        set: { viewModel.setVoteEnabled($0, day: day) }
                                    ))

                                    if viewModel.draftForDay(day).hasVote {
                                        Toggle("Tillgänglig hela dagen", isOn: Binding(
                                            get: { viewModel.draftForDay(day).slots.isEmpty },
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
                                        .disabled(viewModel.isScheduleActionRunning)
                                        .buttonStyle(.borderedProminent)
                                    }
                                }
                                .padding(.vertical, 6)
                            }
                        }
                    }
                }
            }
        }
    }

    private var adminSection: some View {
        Section("Omröstningsadmin") {
            if !viewModel.canManageSchedulePolls {
                Text("Adminåtgärder visas bara för administratörer.")
                    .foregroundStyle(.secondary)
            } else {
                Picker("Vecka", selection: $viewModel.selectedScheduleWeekKey) {
                    ForEach(viewModel.scheduleWeekOptions) { option in
                        Text(option.label).tag(option.key)
                    }
                }

                Button(viewModel.isScheduleActionRunning ? "Skapar…" : "Skapa omröstning") {
                    Task { await viewModel.createAvailabilityPoll() }
                }
                .disabled(viewModel.isScheduleActionRunning)

                ForEach(viewModel.polls) { poll in
                    let reminder = viewModel.reminderAvailability(for: poll)

                    VStack(alignment: .leading, spacing: 8) {
                        Text("Vecka \(poll.weekNumber) (\(poll.weekYear)) • \(poll.status.rawValue.capitalized)")
                            .font(.subheadline)

                        Toggle("Skicka bara till de som inte röstat", isOn: Binding(
                            get: { viewModel.onlyMissingVotesByPoll[poll.id] == true },
                            set: { viewModel.onlyMissingVotesByPoll[poll.id] = $0 }
                        ))

                        Text(reminder.helper)
                            .font(.caption)
                            .foregroundStyle(.secondary)

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
                    .padding(.vertical, 4)
                }
            }
        }
    }

    private var calendarInviteSection: some View {
        Section("Kalenderinbjudan (admin)") {
            if !viewModel.canManageSchedulePolls {
                Text("Endast admin kan skicka kalenderinbjudningar.")
                    .foregroundStyle(.secondary)
            } else {
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
                            pollId: viewModel.deepLinkedPollId,
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
                .disabled(selectedInvitees.isEmpty || inviteDate.isEmpty)

                Text("Note for non-coders: detta använder samma e-postfunktion som webbappen för kalenderhändelser.")
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

    private func prefillInviteDateIfNeeded() {
        guard inviteDate.isEmpty else { return }
        inviteDate = DateFormatter.localizedString(from: .now, dateStyle: .short, timeStyle: .none)
        // Note for non-coders: API expects YYYY-MM-DD, so we normalize after showing a date quickly.
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
