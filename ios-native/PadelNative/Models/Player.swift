import Foundation

struct Player: Identifiable, Codable {
    let id: UUID
    let fullName: String
    let elo: Int
    let isAdmin: Bool
    let isRegular: Bool

    enum CodingKeys: String, CodingKey {
        case id
        case fullName = "full_name"
        case elo
        case isAdmin = "is_admin"
        case isRegular = "is_regular"
    }

    // Note for non-coders:
    // Some backend rows may not have the "is_regular" value yet.
    // This custom decoder gives those players a safe default of true so
    // regular members can still see schedule features.
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        fullName = try container.decode(String.self, forKey: .fullName)
        elo = try container.decode(Int.self, forKey: .elo)
        isAdmin = try container.decode(Bool.self, forKey: .isAdmin)
        isRegular = try container.decodeIfPresent(Bool.self, forKey: .isRegular) ?? true
    }

    init(id: UUID, fullName: String, elo: Int, isAdmin: Bool, isRegular: Bool) {
        self.id = id
        self.fullName = fullName
        self.elo = elo
        self.isAdmin = isAdmin
        self.isRegular = isRegular
    }
}
