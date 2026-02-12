import Foundation

enum EloService {
    static let baseK: Double = 20
    static let highK: Double = 40
    static let midK: Double = 30
    static let maxMarginMultiplier: Double = 1.2
    static let maxPlayerWeight: Double = 1.25
    static let minPlayerWeight: Double = 0.75
    static let expectedScoreDivisor: Double = 300
    static let playerWeightDivisor: Double = 800
    static let eloBaseline: Int = 1000
    static let shortSetMax: Int = 3
    static let longSetMin: Int = 6
    static let shortPointsMax: Int = 15
    static let midPointsMax: Int = 21
    static let shortMatchWeight: Double = 0.5
    static let midMatchWeight: Double = 0.5
    static let longMatchWeight: Double = 1.0
    static let singlesMatchWeight: Double = 0.5

    static func getKFactor(games: Int) -> Double {
        if games < 10 { return highK }
        if games < 30 { return midK }
        return baseK
    }

    static func getExpectedScore(rating: Double, opponentRating: Double) -> Double {
        return 1 / (1 + pow(10, (opponentRating - rating) / expectedScoreDivisor))
    }

    static func getWinProbability(rating: Double, opponentRating: Double) -> Double {
        return getExpectedScore(rating: rating, opponentRating: opponentRating)
    }

    static func getMarginMultiplier(team1Sets: Int, team2Sets: Int) -> Double {
        let diff = abs(team1Sets - team2Sets)
        // User request: 2 set difference should have same impact as 1 set difference (1.1x).
        let margin: Double = diff > 2 ? 2 : (diff > 0 ? 1 : 0)
        return 1 + min(maxMarginMultiplier - 1, margin * 0.1)
    }

    static func getPlayerWeight(playerElo: Double, teamAverageElo: Double) -> Double {
        let adjustment = 1 + (teamAverageElo - playerElo) / playerWeightDivisor
        return max(minPlayerWeight, min(maxPlayerWeight, adjustment))
    }

    static func getMatchWeight(match: Match) -> Double {
        if match.sourceTournamentId != nil { return longMatchWeight }
        let scoreType = match.scoreType ?? "sets"
        if scoreType == "sets" {
            let maxSets = max(match.teamAScore, match.teamBScore)
            if maxSets <= shortSetMax { return shortMatchWeight }
            if maxSets >= longSetMin { return longMatchWeight }
            return midMatchWeight
        }
        if scoreType == "points" {
            let target = match.scoreTarget ?? 0
            if target <= shortPointsMax { return shortMatchWeight }
            if target <= midPointsMax { return midMatchWeight }
            return longMatchWeight
        }
        return midMatchWeight
    }

    static func getSinglesAdjustedMatchWeight(match: Match, isSinglesMatch: Bool) -> Double {
        return getMatchWeight(match: match) * (isSinglesMatch ? singlesMatchWeight : 1.0)
    }

    static func buildPlayerDelta(
        playerElo: Double,
        playerGames: Int,
        teamAverageElo: Double,
        expectedScore: Double,
        didWin: Bool,
        marginMultiplier: Double,
        matchWeight: Double
    ) -> Int {
        let playerK = getKFactor(games: playerGames)
        let weight = getPlayerWeight(playerElo: playerElo, teamAverageElo: teamAverageElo)
        let effectiveWeight = didWin ? weight : 1 / weight
        let delta = playerK * marginMultiplier * matchWeight * effectiveWeight * ((didWin ? 1.0 : 0.0) - expectedScore)
        return Int(round(delta))
    }

    static func getEloExplanation(
        delta: Int,
        playerElo: Int,
        teamAverageElo: Double,
        opponentAverageElo: Double,
        matchWeight: Double,
        didWin: Bool,
        games: Int
    ) -> String {
        if delta == 0 { return "Ingen ELO-förändring." }

        let expected = getExpectedScore(rating: teamAverageElo, opponentRating: opponentAverageElo)
        let prob = Int(round((expected.isFinite ? expected : 0.5) * 100))
        let weight = getPlayerWeight(playerElo: Double(playerElo), teamAverageElo: teamAverageElo)
        let k = getKFactor(games: games)

        var lines = [
            "Resultat: \(didWin ? "Vinst" : "Förlust") (\(delta > 0 ? "+" : "")\(delta) ELO)",
            "Vinstchans: \(prob)%",
            "Matchvikt: \(String(format: "%.1f", matchWeight))x (K=\(Int(k)))",
            "Spelarvikt: \(String(format: "%.2f", weight))x (relativt laget)"
        ]

        if didWin && prob < 40 { lines.append("💪 Bonus för vinst mot starkare motstånd!") }
        if !didWin && prob > 60 { lines.append("⚠️ Större avdrag vid förlust som favorit.") }

        return lines.joined(separator: "\n")
    }
}
