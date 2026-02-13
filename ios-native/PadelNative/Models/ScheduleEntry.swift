import Foundation

struct ScheduleEntry: Identifiable, Codable {
    let id: UUID
    let date: String
    let startTime: String
    let location: String
    let description: String

    enum CodingKeys: String, CodingKey {
        case id
        case date
        case startTime = "start_time"
        case location
        case description = "title"
    }

    var startsAt: Date {
        // Database 'date' is YYYY-MM-DD, 'start_time' is HH:mm:ss
        let combined = "\(date)T\(startTime)"
        return Self.isoFormatter.date(from: combined) ?? .distantPast
    }

    private static let isoFormatter: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withFullDate, .withTime, .withDashSeparatorInDate, .withColonSeparatorInTime]
        return formatter
    }()
}
