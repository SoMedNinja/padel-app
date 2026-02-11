import SwiftUI

struct ScheduleView: View {
    @EnvironmentObject private var viewModel: AppViewModel

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
                scheduledGamesSection
            }
            .navigationTitle("Schedule")
            .padelLiquidGlassChrome()
            .task {
                await viewModel.refreshScheduleData()
            }
            .refreshable {
                await viewModel.refreshScheduleData()
            }
        }
    }

    private var statusSection: some View {
        Section {
            Text("Note for non-coders: this page follows the same permission model as web. Guests cannot vote, regular members can vote, and admins can manage polls.")
                .font(.footnote)
                .foregroundStyle(.secondary)

            if viewModel.isScheduleLoading {
                ProgressView("Loading schedule data…")
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
        Section("Active Polls") {
            let activePolls = viewModel.polls.filter { $0.status == .open }

            if activePolls.isEmpty {
                Text("No active polls right now.")
                    .foregroundStyle(.secondary)
            } else {
                ForEach(activePolls) { poll in
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Week \(poll.weekNumber) (\(poll.weekYear))")
                            .font(.headline)
                        Text("\((poll.days ?? []).count) days open for voting")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    .padding(.vertical, 4)
                }
            }
        }
    }

    private var votingSection: some View {
        Section("Poll Voting") {
            if !viewModel.canVoteInSchedulePolls {
                Text("You need regular member access to vote in schedule polls.")
                    .foregroundStyle(.secondary)
            } else {
                let votablePolls = viewModel.polls.filter { $0.status == .open }
                if votablePolls.isEmpty {
                    Text("No open polls to vote on.")
                        .foregroundStyle(.secondary)
                } else {
                    ForEach(votablePolls) { poll in
                        if let days = poll.days {
                            ForEach(days) { day in
                                VStack(alignment: .leading, spacing: 10) {
                                    let summary = PollDayVoteSummary.evaluate(day: day)
                                    Text(parsedDate(day.date))
                                        .font(.headline)
                                    Text("Votes: \(summary.totalVoters) • \(summary.isGreen ? "Playable" : "Not enough overlap yet")")
                                        .font(.caption)
                                        .foregroundStyle(summary.isGreen ? .green : .secondary)

                                    Toggle("I can play this day", isOn: Binding(
                                        get: { viewModel.draftForDay(day).hasVote },
                                        set: { viewModel.setVoteEnabled($0, day: day) }
                                    ))

                                    if viewModel.draftForDay(day).hasVote {
                                        Toggle("Available all day", isOn: Binding(
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

                                        Button(viewModel.isScheduleActionRunning ? "Saving…" : "Save vote") {
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
        Section("Poll Admin") {
            if !viewModel.canManageSchedulePolls {
                Text("Admin actions are only available to administrators.")
                    .foregroundStyle(.secondary)
            } else {
                Picker("Week", selection: $viewModel.selectedScheduleWeekKey) {
                    ForEach(viewModel.scheduleWeekOptions) { option in
                        Text(option.label).tag(option.key)
                    }
                }

                Button(viewModel.isScheduleActionRunning ? "Creating…" : "Create Poll") {
                    Task { await viewModel.createAvailabilityPoll() }
                }
                .disabled(viewModel.isScheduleActionRunning)

                ForEach(viewModel.polls) { poll in
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Week \(poll.weekNumber) (\(poll.weekYear)) • \(poll.status.rawValue.capitalized)")
                            .font(.subheadline)

                        Toggle("Send only to missing votes", isOn: Binding(
                            get: { viewModel.onlyMissingVotesByPoll[poll.id] == true },
                            set: { viewModel.onlyMissingVotesByPoll[poll.id] = $0 }
                        ))

                        HStack {
                            if poll.status == .open {
                                Button("Close") { Task { await viewModel.closeAvailabilityPoll(poll) } }
                                    .buttonStyle(.bordered)
                            }

                            Button("Send reminder") {
                                Task { await viewModel.sendAvailabilityReminder(for: poll) }
                            }
                            .buttonStyle(.bordered)

                            Button("Delete", role: .destructive) {
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

    private var scheduledGamesSection: some View {
        Section("Scheduled Games") {
            if viewModel.schedule.isEmpty {
                Text("No games scheduled yet.")
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
