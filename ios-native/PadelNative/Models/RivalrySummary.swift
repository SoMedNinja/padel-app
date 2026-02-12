import Foundation

struct RivalrySummary: Identifiable {
    let id: UUID
    let opponentName: String
    let opponentAvatarURL: String?
    let matchesPlayed: Int
    let wins: Int
    let losses: Int
    let lastMatchResult: String
    let lastMatchDate: Date
    let eloDelta: Int

    var winRate: Double {
        guard matchesPlayed > 0 else { return 0 }
        return Double(wins) / Double(matchesPlayed)
    }
}
