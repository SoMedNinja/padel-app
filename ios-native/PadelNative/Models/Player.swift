import Foundation

struct Player: Identifiable, Codable {
    let id: UUID
    let fullName: String
    let elo: Int
    let isAdmin: Bool
    let isRegular: Bool
    let avatarURL: String?
    let featuredBadgeId: String?
    let profileName: String

    enum CodingKeys: String, CodingKey {
        case id
        case fullName = "full_name"
        case profileName = "name"
        case elo
        case isAdmin = "is_admin"
        case isRegular = "is_regular"
        case avatarURL = "avatar_url"
        case featuredBadgeId = "featured_badge_id"
    }

    // Note for non-coders:
    // Some backend rows may not have role flags yet.
    // We default missing values to false so we never grant extra permissions by accident.
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        let fallbackName = try container.decodeIfPresent(String.self, forKey: .profileName) ?? "Player"
        fullName = try container.decodeIfPresent(String.self, forKey: .fullName) ?? fallbackName
        profileName = fallbackName
        elo = try container.decode(Int.self, forKey: .elo)
        isAdmin = try container.decodeIfPresent(Bool.self, forKey: .isAdmin) ?? false
        isRegular = try container.decodeIfPresent(Bool.self, forKey: .isRegular) ?? false
        avatarURL = try container.decodeIfPresent(String.self, forKey: .avatarURL)
        featuredBadgeId = try container.decodeIfPresent(String.self, forKey: .featuredBadgeId)
    }

    init(
        id: UUID,
        fullName: String,
        elo: Int,
        isAdmin: Bool,
        isRegular: Bool,
        avatarURL: String? = nil,
        featuredBadgeId: String? = nil,
        profileName: String? = nil
    ) {
        self.id = id
        self.fullName = fullName
        self.elo = elo
        self.isAdmin = isAdmin
        self.isRegular = isRegular
        self.avatarURL = avatarURL
        self.featuredBadgeId = featuredBadgeId
        self.profileName = profileName ?? fullName
    }
}
