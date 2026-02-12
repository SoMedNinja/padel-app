import Foundation

struct Tournament: Identifiable, Codable {
    let id: UUID
    let name: String
    let status: String
    let tournamentType: String
    let scheduledAt: Date?
    let completedAt: Date?
    let location: String?
    let scoreTarget: Int?
    let createdAt: Date?

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case status
        case tournamentType = "tournament_type"
        case scheduledAt = "scheduled_at"
        case completedAt = "completed_at"
        case location
        case scoreTarget = "score_target"
        case createdAt = "created_at"
    }
}

struct TournamentRound: Identifiable, Codable {
    let id: UUID
    let tournamentId: UUID
    let roundNumber: Int
    let team1Ids: [UUID]
    let team2Ids: [UUID]
    let restingIds: [UUID]
    let team1Score: Int?
    let team2Score: Int?
    let mode: String?
    let createdAt: Date?

    enum CodingKeys: String, CodingKey {
        case id
        case tournamentId = "tournament_id"
        case roundNumber = "round_number"
        case team1Ids = "team1_ids"
        case team2Ids = "team2_ids"
        case restingIds = "resting_ids"
        case team1Score = "team1_score"
        case team2Score = "team2_score"
        case mode
        case createdAt = "created_at"
    }

    // Note for non-coders:
    // Some older tournament rounds may not include resting players yet.
    // We decode that field with an empty array fallback so the app still loads.
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        tournamentId = try container.decode(UUID.self, forKey: .tournamentId)
        roundNumber = try container.decode(Int.self, forKey: .roundNumber)
        team1Ids = try container.decode([UUID].self, forKey: .team1Ids)
        team2Ids = try container.decode([UUID].self, forKey: .team2Ids)
        restingIds = try container.decodeIfPresent([UUID].self, forKey: .restingIds) ?? []
        team1Score = try container.decodeIfPresent(Int.self, forKey: .team1Score)
        team2Score = try container.decodeIfPresent(Int.self, forKey: .team2Score)
        mode = try container.decodeIfPresent(String.self, forKey: .mode)
        createdAt = try container.decodeIfPresent(Date.self, forKey: .createdAt)
    }

    init(
        id: UUID,
        tournamentId: UUID,
        roundNumber: Int,
        team1Ids: [UUID],
        team2Ids: [UUID],
        restingIds: [UUID],
        team1Score: Int?,
        team2Score: Int?,
        mode: String?,
        createdAt: Date?
    ) {
        self.id = id
        self.tournamentId = tournamentId
        self.roundNumber = roundNumber
        self.team1Ids = team1Ids
        self.team2Ids = team2Ids
        self.restingIds = restingIds
        self.team1Score = team1Score
        self.team2Score = team2Score
        self.mode = mode
        self.createdAt = createdAt
    }
}

struct TournamentResult: Identifiable, Codable {
    let id: UUID
    let tournamentId: UUID
    let profileId: UUID?
    let rank: Int
    let pointsFor: Int
    let pointsAgainst: Int
    let matchesPlayed: Int
    let wins: Int
    let losses: Int
    let createdAt: Date?
    let tournamentType: String?

    enum CodingKeys: String, CodingKey {
        case id
        case tournamentId = "tournament_id"
        case profileId = "profile_id"
        case rank
        case pointsFor = "points_for"
        case pointsAgainst = "points_against"
        case matchesPlayed = "matches_played"
        case wins
        case losses
        case createdAt = "created_at"
        case tournamentType = "tournament_type"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        tournamentId = try container.decode(UUID.self, forKey: .tournamentId)
        profileId = try container.decodeIfPresent(UUID.self, forKey: .profileId)
        rank = try container.decode(Int.self, forKey: .rank)
        pointsFor = try container.decode(Int.self, forKey: .pointsFor)
        pointsAgainst = try container.decode(Int.self, forKey: .pointsAgainst)
        matchesPlayed = try container.decode(Int.self, forKey: .matchesPlayed)
        wins = try container.decode(Int.self, forKey: .wins)
        losses = try container.decode(Int.self, forKey: .losses)
        createdAt = try container.decodeIfPresent(Date.self, forKey: .createdAt)

        // Handle potential nested tournament type from join
        if let type = try? container.decodeIfPresent(String.self, forKey: .tournamentType) {
            tournamentType = type
        } else {
            struct TournamentJoin: Decodable {
                let tournamentType: String?
                enum CodingKeys: String, CodingKey {
                    case tournamentType = "tournament_type"
                }
            }
            let join = try? container.decodeIfPresent(TournamentJoin.self, forKey: .tournamentType)
            tournamentType = join?.tournamentType
        }
    }
}

struct TournamentStanding: Identifiable {
    let id: UUID
    let profileId: UUID
    let playerName: String
    let rank: Int
    let pointsFor: Int
    let pointsAgainst: Int
    let wins: Int
    let losses: Int
    let matchesPlayed: Int

    var pointDiff: Int {
        pointsFor - pointsAgainst
    }
}

struct TournamentParticipant: Identifiable, Codable {
    let id: UUID
    let tournamentId: UUID
    let profileId: UUID
    let profileName: String
    let profileAvatarURL: String?

    enum CodingKeys: String, CodingKey {
        case id
        case tournamentId = "tournament_id"
        case profileId = "profile_id"
        case profile
    }

    private enum ProfileCodingKeys: String, CodingKey {
        case name
        case fullName = "full_name"
        case avatarURL = "avatar_url"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        tournamentId = try container.decode(UUID.self, forKey: .tournamentId)
        profileId = try container.decode(UUID.self, forKey: .profileId)

        if let profileContainer = try? container.nestedContainer(keyedBy: ProfileCodingKeys.self, forKey: .profile) {
            let fallbackName = try profileContainer.decodeIfPresent(String.self, forKey: .name)
            profileName = try profileContainer.decodeIfPresent(String.self, forKey: .fullName)
                ?? fallbackName
                ?? "Player"
            profileAvatarURL = try profileContainer.decodeIfPresent(String.self, forKey: .avatarURL)
        } else {
            profileName = "Player"
            profileAvatarURL = nil
        }
    }

    // Note for non-coders:
    // Codable means Swift can both read data from the backend (decode)
    // and also write it back out (encode). Because this model has custom
    // decoding logic, we also provide matching encoding logic.
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(tournamentId, forKey: .tournamentId)
        try container.encode(profileId, forKey: .profileId)

        var profileContainer = container.nestedContainer(keyedBy: ProfileCodingKeys.self, forKey: .profile)
        try profileContainer.encode(profileName, forKey: .fullName)
        try profileContainer.encodeIfPresent(profileAvatarURL, forKey: .avatarURL)
    }
}
