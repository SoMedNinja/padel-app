import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

enum APIError: LocalizedError {
    case missingConfiguration
    case badURL
    case requestFailed(statusCode: Int)

    var errorDescription: String? {
        switch self {
        case .missingConfiguration:
            return "Supabase configuration is missing."
        case .badURL:
            return "Invalid request URL."
        case .requestFailed(let statusCode):
            return "Request failed with status code \(statusCode)."
        }
    }
}

struct MatchSubmission: Encodable {
    let teamAName: [String]
    let teamBName: [String]
    let teamAPlayerIds: [UUID?]
    let teamBPlayerIds: [UUID?]
    let teamAScore: Int
    let teamBScore: Int
    let scoreType: String
    let scoreTarget: Int?
    let sourceTournamentId: UUID?
    let sourceTournamentType: String
    let teamAServesFirst: Bool
    let playedAt: Date

    enum CodingKeys: String, CodingKey {
        case teamAName = "team1"
        case teamBName = "team2"
        case teamAPlayerIds = "team1_ids"
        case teamBPlayerIds = "team2_ids"
        case teamAScore = "team1_sets"
        case teamBScore = "team2_sets"
        case scoreType = "score_type"
        case scoreTarget = "score_target"
        case sourceTournamentId = "source_tournament_id"
        case sourceTournamentType = "source_tournament_type"
        case teamAServesFirst = "team1_serves_first"
        case playedAt = "created_at"
    }
}

struct MatchUpdatePatch: Encodable {
    let playedAt: Date?
    let teamAScore: Int
    let teamBScore: Int
    let scoreType: String?
    let scoreTarget: Int?

    enum CodingKeys: String, CodingKey {
        case playedAt = "created_at"
        case teamAScore = "team1_sets"
        case teamBScore = "team2_sets"
        case scoreType = "score_type"
        case scoreTarget = "score_target"
    }
}

struct CalendarInviteResult: Decodable {
    let success: Bool
    let sent: Int
    let total: Int
    let error: String?
}



struct TournamentRoundScoreUpdate: Encodable {
    let team1Score: Int
    let team2Score: Int

    enum CodingKeys: String, CodingKey {
        case team1Score = "team1_score"
        case team2Score = "team2_score"
    }
}

struct TournamentResultSubmission: Encodable {
    let tournamentId: UUID
    let profileId: UUID
    let rank: Int
    let pointsFor: Int
    let pointsAgainst: Int
    let matchesPlayed: Int
    let wins: Int
    let losses: Int

    enum CodingKeys: String, CodingKey {
        case tournamentId = "tournament_id"
        case profileId = "profile_id"
        case rank
        case pointsFor = "points_for"
        case pointsAgainst = "points_against"
        case matchesPlayed = "matches_played"
        case wins
        case losses
    }
}

struct TournamentCreationRequest: Encodable {
    let name: String
    let status: String
    let tournamentType: String
    let scheduledAt: Date?
    let location: String?
    let scoreTarget: Int?

    enum CodingKeys: String, CodingKey {
        case name
        case status
        case tournamentType = "tournament_type"
        case scheduledAt = "scheduled_at"
        case location
        case scoreTarget = "score_target"
    }
}

struct AdminProfile: Identifiable, Decodable {
    let id: UUID
    let name: String
    let isAdmin: Bool
    let isApproved: Bool
    let isRegular: Bool
    let isDeleted: Bool

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case isAdmin = "is_admin"
        case isApproved = "is_approved"
        case isRegular = "is_regular"
        case isDeleted = "is_deleted"
    }

    // Note for non-coders:
    // Admin rows can come from older records that miss one of the boolean flags.
    // We default to the safest behavior so unapproved/deleted states are not hidden.
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        name = try container.decodeIfPresent(String.self, forKey: .name) ?? "Unknown player"
        isAdmin = try container.decodeIfPresent(Bool.self, forKey: .isAdmin) ?? false
        isApproved = try container.decodeIfPresent(Bool.self, forKey: .isApproved) ?? false
        isRegular = try container.decodeIfPresent(Bool.self, forKey: .isRegular) ?? false
        isDeleted = try container.decodeIfPresent(Bool.self, forKey: .isDeleted) ?? false
    }
}

private struct AdminProfilePatch: Encodable {
    let isAdmin: Bool?
    let isApproved: Bool?
    let isRegular: Bool?

    enum CodingKeys: String, CodingKey {
        case isAdmin = "is_admin"
        case isApproved = "is_approved"
        case isRegular = "is_regular"
    }
}

private struct AdminDeactivatePatch: Encodable {
    let name: String
    let isDeleted: Bool
    let isApproved: Bool
    let isAdmin: Bool
    let isRegular: Bool
    let avatarURL: String?

    enum CodingKeys: String, CodingKey {
        case name
        case isDeleted = "is_deleted"
        case isApproved = "is_approved"
        case isAdmin = "is_admin"
        case isRegular = "is_regular"
        case avatarURL = "avatar_url"
    }
}

private struct ProfileUpdatePatch: Encodable {
    let fullName: String?
    let profileName: String?
    let avatarURL: String?
    let featuredBadgeId: String?

    enum CodingKeys: String, CodingKey {
        case fullName = "full_name"
        case profileName = "name"
        case avatarURL = "avatar_url"
        case featuredBadgeId = "featured_badge_id"
    }
}

struct SupabaseRESTClient {
    private let decoder: JSONDecoder = {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return decoder
    }()

    private let encoder: JSONEncoder = {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        return encoder
    }()

    func fetchLeaderboard() async throws -> [Player] {
        try await request(path: "/rest/v1/profiles", query: "select=id,full_name,name,elo,is_admin,is_regular,avatar_url,featured_badge_id&order=elo.desc")
    }

    func fetchAdminProfiles() async throws -> [AdminProfile] {
        try await request(
            path: "/rest/v1/profiles",
            query: "select=id,name,is_admin,is_approved,is_regular,is_deleted&is_deleted=is.false&order=name.asc"
        )
    }

    func fetchRecentMatches(limit: Int = 60) async throws -> [Match] {
        try await fetchMatchesPage(limit: limit, offset: 0)
    }

    // Note for non-coders:
    // History can be very long, so this endpoint supports loading it in chunks
    // (pagination) and optional filters just like the web app history screen.
    func fetchMatchesPage(
        limit: Int,
        offset: Int,
        startDate: Date? = nil,
        endDate: Date? = nil,
        scoreType: String? = nil,
        tournamentOnly: Bool = false
    ) async throws -> [Match] {
        var query = "select=id,created_by,created_at,team1,team2,team1_sets,team2_sets,team1_ids,team2_ids,score_type,score_target,source_tournament_id,source_tournament_type,team1_serves_first&order=created_at.desc&limit=\(limit)&offset=\(offset)"

        if let startDate {
            query += "&created_at=gte.\(Self.isoDateTimeFormatter.string(from: startDate))"
        }
        if let endDate {
            query += "&created_at=lte.\(Self.isoDateTimeFormatter.string(from: endDate))"
        }
        if let scoreType, !scoreType.isEmpty {
            query += "&score_type=eq.\(scoreType)"
        }
        if tournamentOnly {
            query += "&source_tournament_id=not.is.null"
        }

        return try await request(path: "/rest/v1/matches", query: query)
    }

    // Note for non-coders:
    // Admin reports often need more history than the dashboard cards.
    // This endpoint loads a larger match range for report generation.
    func fetchMatchesForAdminReports(limit: Int = 500) async throws -> [Match] {
        try await request(
            path: "/rest/v1/matches",
            query: "select=id,created_by,created_at,team1,team2,team1_sets,team2_sets,team1_ids,team2_ids,score_type,score_target,source_tournament_id,source_tournament_type,team1_serves_first&order=created_at.desc&limit=\(limit)"
        )
    }

    func fetchSchedule() async throws -> [ScheduleEntry] {
        try await request(
            path: "/rest/v1/availability_scheduled_games",
            query: "select=id,starts_at,location,description&order=starts_at.asc"
        )
    }

    func fetchAvailabilityPolls() async throws -> [AvailabilityPoll] {
        let polls: [AvailabilityPoll] = try await request(
            path: "/rest/v1/availability_polls",
            query: "select=*,days:availability_poll_days(*,votes:availability_votes(*)),mail_logs:availability_poll_mail_log(id,poll_id,sent_by,sent_at,created_at)&order=week_year.asc&order=week_number.asc"
        )

        let nowDate = Self.dateOnlyFormatter.string(from: .now)
        return polls.map { poll in
            var normalized = poll
            if normalized.status == .open && normalized.endDate < nowDate {
                normalized.status = .closed
            }
            normalized.days = (normalized.days ?? []).sorted(by: { $0.date < $1.date })
            normalized.mailLogs = (normalized.mailLogs ?? []).sorted(by: { $0.sentAt > $1.sentAt })
            return normalized
        }
    }

    // Note for non-coders:
    // This mirrors the web flow: first try one database function (RPC) so poll+days
    // are saved atomically, then fallback to direct table inserts if needed.
    func createAvailabilityPoll(weekYear: Int, weekNumber: Int, createdBy: UUID) async throws -> AvailabilityPoll {
        let range = Self.isoWeekRange(week: weekNumber, year: weekYear)

        struct PollRPCPayload: Encodable {
            let weekYear: Int
            let weekNumber: Int
            let startDate: String
            let endDate: String

            enum CodingKeys: String, CodingKey {
                case weekYear = "p_week_year"
                case weekNumber = "p_week_number"
                case startDate = "p_start_date"
                case endDate = "p_end_date"
            }
        }

        do {
            let data = try await sendPostForData(
                path: "/rest/v1/rpc/create_availability_poll_with_days",
                body: PollRPCPayload(weekYear: weekYear, weekNumber: weekNumber, startDate: range.start, endDate: range.end),
                preferHeader: "return=representation"
            )

            if let row = try? decoder.decode(AvailabilityPoll.self, from: data) {
                return row
            }
            if let rows = try? decoder.decode([AvailabilityPoll].self, from: data), let row = rows.first {
                return row
            }
        } catch {
            // Note for non-coders:
            // Some deployments may not yet expose the RPC in Supabase schema cache.
            // In that case we fallback to direct inserts below.
        }

        struct PollInsertPayload: Encodable {
            let createdBy: UUID
            let weekYear: Int
            let weekNumber: Int
            let startDate: String
            let endDate: String

            enum CodingKeys: String, CodingKey {
                case createdBy = "created_by"
                case weekYear = "week_year"
                case weekNumber = "week_number"
                case startDate = "start_date"
                case endDate = "end_date"
            }
        }

        let insertedPollData = try await sendPostForData(
            path: "/rest/v1/availability_polls",
            body: [PollInsertPayload(createdBy: createdBy, weekYear: weekYear, weekNumber: weekNumber, startDate: range.start, endDate: range.end)],
            preferHeader: "return=representation"
        )
        guard let poll = try decoder.decode([AvailabilityPoll].self, from: insertedPollData).first else {
            throw APIError.requestFailed(statusCode: -1)
        }

        struct PollDayInsertPayload: Encodable {
            let pollId: UUID
            let date: String

            enum CodingKeys: String, CodingKey {
                case pollId = "poll_id"
                case date
            }
        }

        let dayRows = (0..<7).map { offset -> PollDayInsertPayload in
            let nextDate = Calendar(identifier: .iso8601).date(byAdding: .day, value: offset, to: range.startDateValue) ?? range.startDateValue
            return PollDayInsertPayload(pollId: poll.id, date: Self.dateOnlyFormatter.string(from: nextDate))
        }
        try await sendPost(path: "/rest/v1/availability_poll_days", body: dayRows)
        return poll
    }

    func closeAvailabilityPoll(pollId: UUID) async throws {
        struct ClosePollPayload: Encodable {
            let status: String
            let closedAt: Date

            enum CodingKeys: String, CodingKey {
                case status
                case closedAt = "closed_at"
            }
        }

        try await sendPatch(
            path: "/rest/v1/availability_polls",
            query: "id=eq.\(pollId.uuidString)",
            body: ClosePollPayload(status: "closed", closedAt: .now)
        )
    }

    func deleteAvailabilityPoll(pollId: UUID) async throws {
        try await sendDelete(path: "/rest/v1/availability_polls", query: "id=eq.\(pollId.uuidString)")
    }

    func upsertAvailabilityVote(dayId: UUID, profileId: UUID, slotPreferences: [AvailabilitySlot]) async throws {
        struct VoteUpsertPayload: Encodable {
            let pollDayId: UUID
            let profileId: UUID
            let slot: AvailabilitySlot?
            let slotPreferences: [AvailabilitySlot]?

            enum CodingKeys: String, CodingKey {
                case pollDayId = "poll_day_id"
                case profileId = "profile_id"
                case slot
                case slotPreferences = "slot_preferences"
            }
        }

        let normalized = slotPreferences.isEmpty ? nil : slotPreferences
        let payload = [VoteUpsertPayload(
            pollDayId: dayId,
            profileId: profileId,
            slot: normalized?.count == 1 ? normalized?.first : nil,
            slotPreferences: normalized
        )]
        try await sendPost(path: "/rest/v1/availability_votes?on_conflict=poll_day_id,profile_id", body: payload, preferHeader: "resolution=merge-duplicates")
    }

    func removeAvailabilityVote(dayId: UUID, profileId: UUID) async throws {
        try await sendDelete(
            path: "/rest/v1/availability_votes",
            query: "poll_day_id=eq.\(dayId.uuidString)&profile_id=eq.\(profileId.uuidString)"
        )
    }

    func sendAvailabilityPollReminder(pollId: UUID, onlyMissingVotes: Bool) async throws -> PollReminderResult {
        struct ReminderPayload: Encodable {
            let pollId: UUID
            let testRecipientEmail: String?
            let onlyMissingVotes: Bool

            enum CodingKeys: String, CodingKey {
                case pollId
                case testRecipientEmail
                case onlyMissingVotes
            }
        }

        let data = try await sendFunctionRequest(
            functionName: "availability-poll-mail",
            body: ReminderPayload(pollId: pollId, testRecipientEmail: nil, onlyMissingVotes: onlyMissingVotes)
        )
        let decoded = try decoder.decode(PollReminderResult.self, from: data)
        guard decoded.success else {
            throw APIError.requestFailed(statusCode: -1)
        }
        return decoded
    }



    // Note for non-coders:
    // This calls the same edge function as web admin when testing or sending weekly summary emails.
    func invokeWeeklySummary(
        accessToken: String,
        playerId: UUID?,
        timeframe: String,
        week: Int? = nil,
        year: Int? = nil
    ) async throws -> WeeklySummaryResponse {
        struct WeeklySummaryPayload: Encodable {
            let playerId: UUID?
            let timeframe: String
            let week: Int?
            let year: Int?
        }

        let data = try await sendFunctionRequest(
            functionName: "weekly-summary",
            body: WeeklySummaryPayload(playerId: playerId, timeframe: timeframe, week: week, year: year),
            accessToken: accessToken
        )
        return try decoder.decode(WeeklySummaryResponse.self, from: data)
    }

    // Note for non-coders:
    // This runs the tournament email queue processor used by the web admin tools.
    func invokeTournamentSummary(accessToken: String) async throws -> TournamentSummaryResponse {
        struct EmptyPayload: Encodable {}
        let data = try await sendFunctionRequest(
            functionName: "tournament-summary",
            body: EmptyPayload(),
            accessToken: accessToken
        )
        return try decoder.decode(TournamentSummaryResponse.self, from: data)
    }

    func submitMatch(_ match: MatchSubmission) async throws {
        guard AppConfig.isConfigured else { throw APIError.missingConfiguration }
        guard let url = URL(string: "\(AppConfig.supabaseURL)/rest/v1/matches") else {
            throw APIError.badURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue(AppConfig.supabaseAnonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(AppConfig.supabaseAnonKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("return=minimal", forHTTPHeaderField: "Prefer")
        request.httpBody = try encoder.encode([match])

        let (_, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.requestFailed(statusCode: -1)
        }
        guard (200...299).contains(httpResponse.statusCode) else {
            throw APIError.requestFailed(statusCode: httpResponse.statusCode)
        }
    }

    func updateMatch(
        matchId: UUID,
        playedAt: Date? = nil,
        teamAScore: Int,
        teamBScore: Int,
        scoreType: String? = nil,
        scoreTarget: Int? = nil
    ) async throws {
        try await sendPatch(
            path: "/rest/v1/matches",
            query: "id=eq.\(matchId.uuidString)",
            body: MatchUpdatePatch(
                playedAt: playedAt,
                teamAScore: teamAScore,
                teamBScore: teamBScore,
                scoreType: scoreType,
                scoreTarget: scoreTarget
            )
        )
    }

    // Note for non-coders:
    // This RPC replaces the full participant list in one transaction, so tournament
    // setup never ends up half-saved if the app closes mid-request.
    func replaceTournamentParticipants(tournamentId: UUID, participantIds: [UUID]) async throws {
        struct ReplaceParticipantsPayload: Encodable {
            let targetTournamentId: UUID
            let newProfileIds: [UUID]

            enum CodingKeys: String, CodingKey {
                case targetTournamentId = "target_tournament_id"
                case newProfileIds = "new_profile_ids"
            }
        }

        do {
            try await sendPost(
                path: "/rest/v1/rpc/replace_mexicana_participants",
                body: ReplaceParticipantsPayload(targetTournamentId: tournamentId, newProfileIds: participantIds)
            )
        } catch {
            // Note for non-coders:
            // If the RPC is not deployed yet, we fallback to delete+insert so setup still works.
            try await sendDelete(path: "/rest/v1/mexicana_participants", query: "tournament_id=eq.\(tournamentId.uuidString)")

            struct ParticipantInsert: Encodable {
                let tournamentId: UUID
                let profileId: UUID

                enum CodingKeys: String, CodingKey {
                    case tournamentId = "tournament_id"
                    case profileId = "profile_id"
                }
            }

            let payload = participantIds.map { ParticipantInsert(tournamentId: tournamentId, profileId: $0) }
            _ = try await sendPostForData(path: "/rest/v1/mexicana_participants", body: payload, preferHeader: "return=minimal")
        }
    }

    func deleteMatch(matchId: UUID) async throws {
        try await sendDelete(path: "/rest/v1/matches", query: "id=eq.\(matchId.uuidString)")
    }

    // Note for non-coders:
    // This calls the same calendar invite edge function as the web schedule page.
    func sendCalendarInvite(
        pollId: UUID?,
        date: String,
        startTime: String,
        endTime: String,
        location: String?,
        inviteeProfileIds: [UUID],
        action: String,
        title: String?
    ) async throws -> CalendarInviteResult {
        struct InvitePayload: Encodable {
            let pollId: UUID?
            let date: String
            let startTime: String
            let endTime: String
            let location: String?
            let inviteeProfileIds: [UUID]
            let action: String
            let title: String?
        }

        let data = try await sendFunctionRequest(
            functionName: "availability-calendar-invite",
            body: InvitePayload(
                pollId: pollId,
                date: date,
                startTime: startTime,
                endTime: endTime,
                location: location,
                inviteeProfileIds: inviteeProfileIds,
                action: action,
                title: title
            )
        )
        return try decoder.decode(CalendarInviteResult.self, from: data)
    }

    func fetchActiveTournament() async throws -> Tournament? {
        // Note for non-coders:
        // "Active" means the latest tournament that is still running (in progress or draft).
        let tournaments: [Tournament] = try await request(
            path: "/rest/v1/mexicana_tournaments",
            query: "select=*&status=in.(in_progress,draft)&order=created_at.desc&limit=1"
        )
        return tournaments.first
    }

    func fetchTournaments() async throws -> [Tournament] {
        try await request(
            path: "/rest/v1/mexicana_tournaments",
            query: "select=*&order=created_at.desc"
        )
    }

    func fetchTournamentRounds(tournamentId: UUID) async throws -> [TournamentRound] {
        try await request(
            path: "/rest/v1/mexicana_rounds",
            query: "select=*&tournament_id=eq.\(tournamentId.uuidString)&order=round_number.asc"
        )
    }

    func fetchTournamentStandings(tournamentId: UUID) async throws -> [TournamentResult] {
        try await request(
            path: "/rest/v1/mexicana_results",
            query: "select=*&tournament_id=eq.\(tournamentId.uuidString)&order=rank.asc"
        )
    }

    func createTournament(_ requestPayload: TournamentCreationRequest) async throws -> Tournament {
        let rows: [Tournament] = try await sendPostForDecodableArray(
            path: "/rest/v1/mexicana_tournaments",
            body: [requestPayload],
            preferHeader: "return=representation"
        )
        guard let inserted = rows.first else {
            throw APIError.requestFailed(statusCode: -1)
        }
        return inserted
    }

    func updateTournamentStatus(tournamentId: UUID, status: String) async throws {
        struct TournamentStatusUpdate: Encodable {
            let status: String
        }

        try await sendPatch(
            path: "/rest/v1/mexicana_tournaments",
            query: "id=eq.\(tournamentId.uuidString)",
            body: TournamentStatusUpdate(status: status)
        )
    }

    func deleteTournament(tournamentId: UUID) async throws {
        struct DeleteTournamentRPCPayload: Encodable {
            let targetTournamentId: UUID

            enum CodingKeys: String, CodingKey {
                case targetTournamentId = "target_tournament_id"
            }
        }

        do {
            try await sendPost(
                path: "/rest/v1/rpc/delete_mexicana_tournament",
                body: DeleteTournamentRPCPayload(targetTournamentId: tournamentId)
            )
            return
        } catch {
            // Note for non-coders:
            // Some Supabase projects may not have the helper function installed yet.
            // We fallback to manual child-row deletes so users can still remove tournaments.
        }

        try await sendDelete(path: "/rest/v1/mexicana_participants", query: "tournament_id=eq.\(tournamentId.uuidString)")
        try await sendDelete(path: "/rest/v1/mexicana_rounds", query: "tournament_id=eq.\(tournamentId.uuidString)")
        try await sendDelete(path: "/rest/v1/mexicana_results", query: "tournament_id=eq.\(tournamentId.uuidString)")
        try await sendDelete(path: "/rest/v1/mexicana_tournaments", query: "id=eq.\(tournamentId.uuidString)")
    }

    func fetchCompletedTournamentResults(limit: Int = 50) async throws -> [TournamentResult] {
        try await request(
            path: "/rest/v1/mexicana_results",
            query: "select=*&order=created_at.desc&limit=\(limit)"
        )
    }

    struct TournamentLiveMarker: Equatable {
        let tournamentState: String
        let latestRoundState: String
        let latestResultState: String
    }

    // Note for non-coders:
    // This lightweight probe gives us "has tournament data changed?" without downloading
    // every tournament round/result on each background sync cycle.
    func fetchTournamentLiveMarker() async throws -> TournamentLiveMarker {
        struct TournamentProbeRow: Decodable {
            let id: UUID
            let status: String
            let createdAt: Date?

            enum CodingKeys: String, CodingKey {
                case id
                case status
                case createdAt = "created_at"
            }
        }

        struct RoundProbeRow: Decodable {
            let id: UUID
            let team1Score: Int?
            let team2Score: Int?
            let createdAt: Date?

            enum CodingKeys: String, CodingKey {
                case id
                case team1Score = "team1_score"
                case team2Score = "team2_score"
                case createdAt = "created_at"
            }
        }

        struct ResultProbeRow: Decodable {
            let id: UUID
            let createdAt: Date?

            enum CodingKeys: String, CodingKey {
                case id
                case createdAt = "created_at"
            }
        }

        async let latestTournamentTask: [TournamentProbeRow] = request(
            path: "/rest/v1/mexicana_tournaments",
            query: "select=id,status,created_at&order=created_at.desc&limit=1"
        )
        async let latestRoundTask: [RoundProbeRow] = request(
            path: "/rest/v1/mexicana_rounds",
            query: "select=id,team1_score,team2_score,created_at&order=created_at.desc&limit=1"
        )
        async let latestResultTask: [ResultProbeRow] = request(
            path: "/rest/v1/mexicana_results",
            query: "select=id,created_at&order=created_at.desc&limit=1"
        )

        let latestTournament = try await latestTournamentTask.first
        let latestRound = try await latestRoundTask.first
        let latestResult = try await latestResultTask.first

        let tournamentState = latestTournament.map {
            "\($0.id.uuidString)|\($0.status)|\($0.createdAt?.timeIntervalSince1970 ?? 0)"
        } ?? "none"
        let latestRoundState = latestRound.map {
            "\($0.id.uuidString)|\($0.team1Score ?? -1)|\($0.team2Score ?? -1)|\($0.createdAt?.timeIntervalSince1970 ?? 0)"
        } ?? "none"
        let latestResultState = latestResult.map {
            "\($0.id.uuidString)|\($0.createdAt?.timeIntervalSince1970 ?? 0)"
        } ?? "none"

        return TournamentLiveMarker(
            tournamentState: tournamentState,
            latestRoundState: latestRoundState,
            latestResultState: latestResultState
        )
    }

    func saveTournamentRoundScore(roundId: UUID, team1Score: Int, team2Score: Int) async throws {
        try await sendPatch(
            path: "/rest/v1/mexicana_rounds",
            query: "id=eq.\(roundId.uuidString)",
            body: TournamentRoundScoreUpdate(team1Score: team1Score, team2Score: team2Score)
        )
    }

    func saveTournamentStandings(_ standings: [TournamentResultSubmission]) async throws {
        guard !standings.isEmpty else { return }
        try await sendPost(path: "/rest/v1/mexicana_results", body: standings, preferHeader: "resolution=merge-duplicates")
    }

    func completeTournament(tournamentId: UUID) async throws {
        struct TournamentCompletionUpdate: Encodable {
            let status: String
            let completedAt: Date

            enum CodingKeys: String, CodingKey {
                case status
                case completedAt = "completed_at"
            }
        }

        let payload = TournamentCompletionUpdate(status: "completed", completedAt: .now)
        try await sendPatch(
            path: "/rest/v1/mexicana_tournaments",
            query: "id=eq.\(tournamentId.uuidString)",
            body: payload
        )
    }

    func updateProfileAdminFlags(
        profileId: UUID,
        isAdmin: Bool? = nil,
        isApproved: Bool? = nil,
        isRegular: Bool? = nil
    ) async throws {
        try await sendPatch(
            path: "/rest/v1/profiles",
            query: "id=eq.\(profileId.uuidString)",
            body: AdminProfilePatch(isAdmin: isAdmin, isApproved: isApproved, isRegular: isRegular)
        )
    }

    func deactivateProfile(profileId: UUID) async throws {
        try await sendPatch(
            path: "/rest/v1/profiles",
            query: "id=eq.\(profileId.uuidString)",
            body: AdminDeactivatePatch(
                name: "deleted user",
                isDeleted: true,
                isApproved: false,
                isAdmin: false,
                isRegular: false,
                avatarURL: nil
            )
        )
    }

    // Note for non-coders:
    // This updates the same profile columns as web profile setup (name, avatar, featured badge).
    // We patch only the signed-in user's own row, so profile edits stay scoped to that person.
    func updateOwnProfile(
        profileId: UUID,
        fullName: String? = nil,
        profileName: String? = nil,
        avatarURL: String? = nil,
        featuredBadgeId: String? = nil
    ) async throws {
        try await sendPatch(
            path: "/rest/v1/profiles",
            query: "id=eq.\(profileId.uuidString)",
            body: ProfileUpdatePatch(
                fullName: fullName,
                profileName: profileName,
                avatarURL: avatarURL,
                featuredBadgeId: featuredBadgeId
            )
        )
    }

    func callAdminRPC<T: Encodable>(functionName: String, body: T) async throws {
        try await sendPost(path: "/rest/v1/rpc/\(functionName)", body: body)
    }

    private func sendPost<T: Encodable>(path: String, body: T, preferHeader: String = "return=minimal") async throws {
        guard AppConfig.isConfigured else { throw APIError.missingConfiguration }
        guard let url = URL(string: "\(AppConfig.supabaseURL)\(path)") else {
            throw APIError.badURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue(AppConfig.supabaseAnonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(AppConfig.supabaseAnonKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(preferHeader, forHTTPHeaderField: "Prefer")
        request.httpBody = try encoder.encode(body)

        try await perform(request)
    }

    private func sendPostForData<T: Encodable>(path: String, body: T, preferHeader: String = "return=minimal") async throws -> Data {
        guard AppConfig.isConfigured else { throw APIError.missingConfiguration }
        guard let url = URL(string: "\(AppConfig.supabaseURL)\(path)") else {
            throw APIError.badURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue(AppConfig.supabaseAnonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(AppConfig.supabaseAnonKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(preferHeader, forHTTPHeaderField: "Prefer")
        request.httpBody = try encoder.encode(body)

        return try await performForData(request)
    }

    private func sendPatch<T: Encodable>(path: String, query: String, body: T) async throws {
        guard AppConfig.isConfigured else { throw APIError.missingConfiguration }
        guard let url = URL(string: "\(AppConfig.supabaseURL)\(path)?\(query)") else {
            throw APIError.badURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "PATCH"
        request.setValue(AppConfig.supabaseAnonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(AppConfig.supabaseAnonKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("return=minimal", forHTTPHeaderField: "Prefer")
        request.httpBody = try encoder.encode(body)

        try await perform(request)
    }

    private func perform(_ request: URLRequest) async throws {
        let (_, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.requestFailed(statusCode: -1)
        }
        guard (200...299).contains(httpResponse.statusCode) else {
            throw APIError.requestFailed(statusCode: httpResponse.statusCode)
        }
    }

    private func performForData(_ request: URLRequest) async throws -> Data {
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.requestFailed(statusCode: -1)
        }
        guard (200...299).contains(httpResponse.statusCode) else {
            throw APIError.requestFailed(statusCode: httpResponse.statusCode)
        }
        return data
    }

    private func sendDelete(path: String, query: String) async throws {
        guard AppConfig.isConfigured else { throw APIError.missingConfiguration }
        guard let url = URL(string: "\(AppConfig.supabaseURL)\(path)?\(query)") else {
            throw APIError.badURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        request.setValue(AppConfig.supabaseAnonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(AppConfig.supabaseAnonKey)", forHTTPHeaderField: "Authorization")

        try await perform(request)
    }

    private func sendFunctionRequest<T: Encodable>(functionName: String, body: T, accessToken: String? = nil) async throws -> Data {
        guard AppConfig.isConfigured else { throw APIError.missingConfiguration }
        guard let url = URL(string: "\(AppConfig.supabaseURL)/functions/v1/\(functionName)") else {
            throw APIError.badURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue(AppConfig.supabaseAnonKey, forHTTPHeaderField: "apikey")
        let bearerToken = accessToken ?? AppConfig.supabaseAnonKey
        request.setValue("Bearer \(bearerToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try encoder.encode(body)

        return try await performForData(request)
    }


    private func request<T: Decodable>(path: String, query: String) async throws -> [T] {
        guard AppConfig.isConfigured else { throw APIError.missingConfiguration }
        guard let url = URL(string: "\(AppConfig.supabaseURL)\(path)?\(query)") else {
            throw APIError.badURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue(AppConfig.supabaseAnonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(AppConfig.supabaseAnonKey)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.requestFailed(statusCode: -1)
        }
        guard (200...299).contains(httpResponse.statusCode) else {
            throw APIError.requestFailed(statusCode: httpResponse.statusCode)
        }

        return try decoder.decode([T].self, from: data)
    }

    private func sendPostForDecodableArray<T: Decodable, Body: Encodable>(
        path: String,
        body: Body,
        preferHeader: String
    ) async throws -> [T] {
        let data = try await sendPostForData(path: path, body: body, preferHeader: preferHeader)
        return try decoder.decode([T].self, from: data)
    }
}



struct WeeklySummaryResponse: Decodable {
    let success: Bool?
    let message: String?
    let sent: Int?
    let total: Int?
    let error: String?
    let hint: String?
}

struct TournamentSummaryResponse: Decodable {
    let success: Bool?
    let message: String?
    let sent: Int?
    let skipped: Int?
    let error: String?
}

struct PollReminderResult: Decodable {
    let success: Bool
    let sent: Int
    let total: Int
    let totalBeforeVoteFilter: Int?
    let votedProfileCount: Int?
    let onlyMissingVotes: Bool?
    let mode: String?
    let error: String?

    enum CodingKeys: String, CodingKey {
        case success
        case sent
        case total
        case totalBeforeVoteFilter = "totalBeforeVoteFilter"
        case votedProfileCount = "votedProfileCount"
        case onlyMissingVotes = "onlyMissingVotes"
        case mode
        case error
    }
}

private extension SupabaseRESTClient {
    static let dateOnlyFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .iso8601)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()

    static func isoWeekRange(week: Int, year: Int) -> (start: String, end: String, startDateValue: Date) {
        var calendar = Calendar(identifier: .iso8601)
        calendar.timeZone = TimeZone(secondsFromGMT: 0)!

        var components = DateComponents()
        components.weekOfYear = week
        components.yearForWeekOfYear = year
        components.weekday = 2
        let start = calendar.date(from: components) ?? .now
        let end = calendar.date(byAdding: .day, value: 6, to: start) ?? start
        return (
            start: dateOnlyFormatter.string(from: start),
            end: dateOnlyFormatter.string(from: end),
            startDateValue: start
        )
    }

    static let isoDateTimeFormatter: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        return formatter
    }()
}
