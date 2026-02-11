import Foundation

struct Match: Identifiable, Codable {
    let id: UUID
    let playedAt: Date
    let teamAName: String
    let teamBName: String
    let teamAScore: Int
    let teamBScore: Int

    enum CodingKeys: String, CodingKey {
        case id
        case playedAt = "played_at"
        case teamAName = "team_a_name"
        case teamBName = "team_b_name"
        case teamAScore = "team_a_score"
        case teamBScore = "team_b_score"
    }
}
