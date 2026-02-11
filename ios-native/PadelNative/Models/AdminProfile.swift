import Foundation

struct AdminProfile: Identifiable, Codable {
    let id: UUID
    let fullName: String
    let elo: Int
    let isAdmin: Bool
    let isRegular: Bool
    let isApproved: Bool
    let isDeleted: Bool

    enum CodingKeys: String, CodingKey {
        case id
        case fullName = "full_name"
        case elo
        case isAdmin = "is_admin"
        case isRegular = "is_regular"
        case isApproved = "is_approved"
        case isDeleted = "is_deleted"
    }

    // Note for non-coders:
    // Admin tools need extra fields (approved/deleted) that are not required in the
    // regular leaderboard model, so this separate model keeps those controls explicit.
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        fullName = try container.decode(String.self, forKey: .fullName)
        elo = try container.decodeIfPresent(Int.self, forKey: .elo) ?? 1200
        isAdmin = try container.decodeIfPresent(Bool.self, forKey: .isAdmin) ?? false
        isRegular = try container.decodeIfPresent(Bool.self, forKey: .isRegular) ?? true
        isApproved = try container.decodeIfPresent(Bool.self, forKey: .isApproved) ?? false
        isDeleted = try container.decodeIfPresent(Bool.self, forKey: .isDeleted) ?? false
    }

    init(id: UUID, fullName: String, elo: Int, isAdmin: Bool, isRegular: Bool, isApproved: Bool, isDeleted: Bool) {
        self.id = id
        self.fullName = fullName
        self.elo = elo
        self.isAdmin = isAdmin
        self.isRegular = isRegular
        self.isApproved = isApproved
        self.isDeleted = isDeleted
    }

}
