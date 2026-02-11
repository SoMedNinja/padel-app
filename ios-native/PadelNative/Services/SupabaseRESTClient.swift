import Foundation

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
        try await request(path: "/rest/v1/profiles", query: "select=id,full_name,elo,is_admin,is_regular&order=elo.desc")
    }

    func fetchAdminProfiles() async throws -> [AdminProfile] {
        try await request(
            path: "/rest/v1/profiles",
            query: "select=id,name,is_admin,is_approved,is_regular,is_deleted&is_deleted=is.false&order=name.asc"
        )
    }

    func fetchRecentMatches(limit: Int = 20) async throws -> [Match] {
        try await request(
            path: "/rest/v1/matches",
            query: "select=id,created_at,team1,team2,team1_sets,team2_sets,team1_ids,team2_ids,score_type,score_target,source_tournament_id,source_tournament_type,team1_serves_first&order=created_at.desc&limit=\(limit)"
        )
    }

    func fetchSchedule() async throws -> [ScheduleEntry] {
        try await request(
            path: "/rest/v1/availability_scheduled_games",
            query: "select=id,starts_at,location,description&order=starts_at.asc"
        )
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

    func fetchActiveTournament() async throws -> Tournament? {
        // Note for non-coders:
        // "Active" means the latest tournament that is still running (in progress or draft).
        let tournaments: [Tournament] = try await request(
            path: "/rest/v1/mexicana_tournaments",
            query: "select=*&status=in.(in_progress,draft)&order=created_at.desc&limit=1"
        )
        return tournaments.first
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
}
