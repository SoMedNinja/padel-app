import Foundation

// Note for non-coders:
// Generated contract models define the exact API shape, and this file keeps app-specific rules separate.
enum ContractTransforms {
    static func toContractMatchRequest(from submission: MatchSubmission) throws -> ContractMatchCreateRequest {
        let mode = submission.matchMode ?? inferredMode(team1Count: submission.teamAName.count, team2Count: submission.teamBName.count)
        try validate(teamCount: submission.teamAName.count, mode: mode, label: "Team A")
        try validate(teamCount: submission.teamBName.count, mode: mode, label: "Team B")

        return ContractMatchCreateRequest(
            team1: submission.teamAName,
            team2: submission.teamBName,
            team1IDs: submission.teamAPlayerIds.map { id in id.flatMap(UUID.init(uuidString:)) },
            team2IDs: submission.teamBPlayerIds.map { id in id.flatMap(UUID.init(uuidString:)) },
            team1Sets: submission.teamAScore,
            team2Sets: submission.teamBScore,
            createdBy: submission.createdBy,
            sourceTournamentId: submission.sourceTournamentId,
            matchMode: mode
        )
    }

    static func toContractVote(dayId: UUID, profileId: UUID, slotPreferences: [AvailabilitySlot]) throws -> ContractScheduleVoteRequest {
        if slotPreferences.isEmpty {
            throw APIError.requestFailed(statusCode: 400)
        }
        return ContractScheduleVoteRequest(
            pollDayId: dayId,
            profileId: profileId,
            slotPreferences: slotPreferences.map(\.contractValue)
        )
    }

    private static func inferredMode(team1Count: Int, team2Count: Int) -> ContractMatchMode {
        (team1Count == 1 && team2Count == 1) ? .oneVsOne : .twoVsTwo
    }

    private static func validate(teamCount: Int, mode: ContractMatchMode, label: String) throws {
        let expectedCount = mode == .oneVsOne ? 1 : 2
        if teamCount != expectedCount {
            throw NSError(domain: "ContractTransforms", code: 1, userInfo: [NSLocalizedDescriptionKey: "\(label) must have \(expectedCount) players for mode \(mode.rawValue)."])
        }
    }
}

private extension AvailabilitySlot {
    var contractValue: ContractAvailabilitySlot {
        switch self {
        case .morning: return .morning
        case .day: return .day
        case .evening: return .evening
        }
    }
}
