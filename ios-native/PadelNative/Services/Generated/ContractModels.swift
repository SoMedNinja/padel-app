// AUTO-GENERATED FILE. Do not edit manually.
// Note for non-coders: this file is generated from one shared contract file so web + iOS use the same data shape.
import Foundation

enum ContractSchema {
    static let hash = "952165fb97272110d3a992e381312242f5753a2cd567f12b06c00bca0e67322e"
}

enum ContractMatchMode: String, Codable {
    case oneVsOne = "1v1"
    case twoVsTwo = "2v2"
}

enum ContractAvailabilitySlot: String, Codable {
    case morning
    case day
    case evening
}

struct ContractAuthPasswordRequest: Encodable {
    let email: String
    let password: String
}

struct ContractAuthRefreshRequest: Encodable {
    let refreshToken: String

    enum CodingKeys: String, CodingKey {
        case refreshToken = "refresh_token"
    }
}

struct ContractAuthSessionResponse: Decodable {
    let accessToken: String
    let refreshToken: String
    let expiresAt: TimeInterval
    let user: User

    struct User: Decodable {
        let id: UUID
        let email: String?
    }

    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case refreshToken = "refresh_token"
        case expiresAt = "expires_at"
        case user
    }
}

struct ContractScheduleVoteRequest: Encodable {
    let pollDayId: UUID
    let profileId: UUID
    let slotPreferences: [ContractAvailabilitySlot]

    enum CodingKeys: String, CodingKey {
        case pollDayId = "poll_day_id"
        case profileId = "profile_id"
        case slotPreferences = "slot_preferences"
    }
}

struct ContractMatchCreateRequest: Encodable {
    let team1: [String]
    let team2: [String]
    let team1IDs: [UUID?]?
    let team2IDs: [UUID?]?
    let team1Sets: Int
    let team2Sets: Int
    let createdBy: UUID
    let sourceTournamentId: UUID?
    let matchMode: ContractMatchMode

    enum CodingKeys: String, CodingKey {
        case team1
        case team2
        case team1IDs = "team1_ids"
        case team2IDs = "team2_ids"
        case team1Sets = "team1_sets"
        case team2Sets = "team2_sets"
        case createdBy = "created_by"
        case sourceTournamentId = "source_tournament_id"
        case matchMode = "match_mode"
    }
}
