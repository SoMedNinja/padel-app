import Foundation

enum AvailabilitySlot: String, Codable, CaseIterable, Identifiable {
    case morning
    case day
    case evening

    var id: String { rawValue }

    // Note for non-coders:
    // These labels are what users see in the app when choosing time windows.
    var displayName: String {
        switch self {
        case .morning: return "Morgon"
        case .day: return "Dag"
        case .evening: return "Kväll"
        }
    }
}

struct AvailabilityVote: Identifiable, Codable {
    let id: UUID
    let pollDayId: UUID
    let profileId: UUID
    let slot: AvailabilitySlot?
    let slotPreferences: [AvailabilitySlot]?
    let createdAt: Date?
    let updatedAt: Date?

    enum CodingKeys: String, CodingKey {
        case id
        case pollDayId = "poll_day_id"
        case profileId = "profile_id"
        case slot
        case slotPreferences = "slot_preferences"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

struct AvailabilityPollDay: Identifiable, Codable {
    let id: UUID
    let pollId: UUID
    let date: String
    let createdAt: Date?
    let votes: [AvailabilityVote]?

    enum CodingKeys: String, CodingKey {
        case id
        case pollId = "poll_id"
        case date
        case createdAt = "created_at"
        case votes
    }
}

struct AvailabilityPollMailLog: Identifiable, Codable {
    let id: UUID
    let pollId: UUID
    let sentBy: UUID
    let sentAt: Date
    let createdAt: Date?

    enum CodingKeys: String, CodingKey {
        case id
        case pollId = "poll_id"
        case sentBy = "sent_by"
        case sentAt = "sent_at"
        case createdAt = "created_at"
    }
}

struct AvailabilityPoll: Identifiable, Codable {
    enum PollStatus: String, Codable {
        case open
        case closed
    }

    let id: UUID
    let createdBy: UUID
    let weekYear: Int
    let weekNumber: Int
    let startDate: String
    let endDate: String
    var status: PollStatus
    let closedAt: Date?
    let createdAt: Date?
    var days: [AvailabilityPollDay]?
    var mailLogs: [AvailabilityPollMailLog]?

    enum CodingKeys: String, CodingKey {
        case id
        case createdBy = "created_by"
        case weekYear = "week_year"
        case weekNumber = "week_number"
        case startDate = "start_date"
        case endDate = "end_date"
        case status
        case closedAt = "closed_at"
        case createdAt = "created_at"
        case days
        case mailLogs = "mail_logs"
    }
}

struct PollDayVoteSummary {
    let totalVoters: Int
    let hasMinimumPlayers: Bool
    let isCompatible: Bool
    let isGreen: Bool
    let compatibleSlot: AvailabilitySlot?

    struct PollProgress {
        let readyDays: Int
        let totalDays: Int
        let percentage: Double
    }

    static func calculateProgress(for poll: AvailabilityPoll) -> PollProgress {
        let days = poll.days ?? []
        let total = days.count
        let ready = days.filter { evaluate(day: $0).isGreen }.count
        let percent = total > 0 ? Double(ready) / Double(total) : 0
        return PollProgress(readyDays: ready, totalDays: total, percentage: percent)
    }

    // Note for non-coders:
    // A "green" day means at least four people overlap in the same time window.
    static func evaluate(day: AvailabilityPollDay) -> PollDayVoteSummary {
        let uniqueVotes = Dictionary(grouping: day.votes ?? [], by: { $0.profileId })
            .compactMap { $0.value.last }

        var slotCounts: [AvailabilitySlot: Int] = [.morning: 0, .day: 0, .evening: 0]
        for vote in uniqueVotes {
            let slots: [AvailabilitySlot]
            if let multi = vote.slotPreferences, !multi.isEmpty {
                slots = multi
            } else if let single = vote.slot {
                slots = [single]
            } else {
                // Note for non-coders:
                // An empty slot list means "available all day", so it counts for every slot.
                slots = AvailabilitySlot.allCases
            }
            for slot in slots {
                slotCounts[slot, default: 0] += 1
            }
        }

        let compatibleSlot = AvailabilitySlot.allCases.first(where: { slotCounts[$0, default: 0] >= 4 })
        let totalVoters = uniqueVotes.count
        let hasMinimumPlayers = totalVoters >= 4
        let isCompatible = compatibleSlot != nil

        return PollDayVoteSummary(
            totalVoters: totalVoters,
            hasMinimumPlayers: hasMinimumPlayers,
            isCompatible: isCompatible,
            isGreen: hasMinimumPlayers && isCompatible,
            compatibleSlot: compatibleSlot
        )
    }
}

struct VoteDraft {
    var hasVote: Bool
    var slots: Set<AvailabilitySlot>
}
