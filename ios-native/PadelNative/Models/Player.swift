import Foundation

struct Player: Identifiable, Codable {
    let id: UUID
    let fullName: String
    let elo: Int
    let isAdmin: Bool

    enum CodingKeys: String, CodingKey {
        case id
        case fullName = "full_name"
        case elo
        case isAdmin = "is_admin"
    }
}
