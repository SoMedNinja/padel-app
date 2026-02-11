import Foundation

struct ScheduleEntry: Identifiable, Codable {
    let id: UUID
    let startsAt: Date
    let location: String
    let description: String

    enum CodingKeys: String, CodingKey {
        case id
        case startsAt = "starts_at"
        case location
        case description
    }
}
