import Foundation

struct RotationRound: Identifiable {
    let id = UUID()
    let roundNumber: Int
    let teamA: [UUID]
    let teamB: [UUID]
    let rest: [UUID]
    let fairness: Int
    let winProbability: Double
}

struct RotationSchedule {
    let rounds: [RotationRound]
    let averageFairness: Int
    let targetGames: Double
}

enum RotationService {
    static func getTeamAverageElo(team: [UUID], eloMap: [UUID: Int]) -> Double {
        var total = 0
        var count = 0
        for id in team {
            total += eloMap[id] ?? EloService.eloBaseline
            count += 1
        }
        if count == 0 { return Double(EloService.eloBaseline) }
        return Double(total) / Double(count)
    }

    static func getFairnessScore(winProbability: Double) -> Int {
        let score = max(0, min(100, Int(round((1 - abs(0.5 - winProbability) * 2) * 100))))
        return score
    }

    static func getRotationRounds(playerCount: Int) -> Int {
        let roundMap: [Int: Int] = [
            5: 5,
            6: 3,
            7: 7,
            8: 4
        ]
        return roundMap[playerCount] ?? Int(ceil(Double(playerCount) / 2.0))
    }

    static func buildRotationSchedule(pool: [UUID], eloMap: [UUID: Int]) -> RotationSchedule {
        let players = pool
        let roundCount = getRotationRounds(playerCount: players.count)
        let targetGames = (4.0 * Double(roundCount)) / Double(players.count)
        var games: [UUID: Int] = [:]
        for id in players { games[id] = 0 }

        var teammateCounts: [String: Int] = [:]
        var opponentCounts: [String: Int] = [:]

        func pairKey(_ a: UUID, _ b: UUID) -> String {
            return [a.uuidString, b.uuidString].sorted().joined(separator: "|")
        }

        func getPairCount(_ map: [String: Int], _ a: UUID, _ b: UUID) -> Int {
            return map[pairKey(a, b)] ?? 0
        }

        func addPairCount(_ map: inout [String: Int], _ a: UUID, _ b: UUID) {
            let key = pairKey(a, b)
            map[key] = (map[key] ?? 0) + 1
        }

        func buildCombos(arr: [UUID], size: Int) -> [[UUID]] {
            var result: [[UUID]] = []
            func helper(start: Int, combo: inout [UUID]) {
                if combo.count == size {
                    result.append(combo)
                    return
                }
                if start >= arr.count { return }
                for i in start...max(start, arr.count - (size - combo.count)) {
                    combo.append(arr[i])
                    helper(start: i + 1, combo: &combo)
                    combo.removeLast()
                }
            }
            var combo: [UUID] = []
            helper(start: 0, combo: &combo)
            return result
        }

        func teamSplits(fourPlayers: [UUID]) -> [(teamA: [UUID], teamB: [UUID])] {
            let p1 = fourPlayers[0]
            let p2 = fourPlayers[1]
            let p3 = fourPlayers[2]
            let p4 = fourPlayers[3]
            return [
                (teamA: [p1, p2], teamB: [p3, p4]),
                (teamA: [p1, p3], teamB: [p2, p4]),
                (teamA: [p1, p4], teamB: [p2, p3])
            ]
        }

        var rounds: [RotationRound] = []
        let combos = buildCombos(arr: players, size: 4)

        struct Candidate {
            let score: Double
            let fairness: Int
            let winProbability: Double
            let teamA: [UUID]
            let teamB: [UUID]
            let rest: [UUID]
        }

        func pickCandidate(strictGames: Bool) -> Candidate? {
            var best: Candidate?
            var bestScore: Double = -Double.greatestFiniteMagnitude

            for combo in combos {
                let restPlayers = players.filter { !combo.contains($0) }
                let splits = teamSplits(fourPlayers: combo)
                for split in splits {
                    if strictGames {
                        let allParticipating = split.teamA + split.teamB
                        if allParticipating.contains(where: { Double(games[$0] ?? 0) >= targetGames }) {
                            continue
                        }
                    }

                    let teamAElo = getTeamAverageElo(team: split.teamA, eloMap: eloMap)
                    let teamBElo = getTeamAverageElo(team: split.teamB, eloMap: eloMap)
                    let winProbability = EloService.getWinProbability(rating: teamAElo, opponentRating: teamBElo)
                    let fairness = getFairnessScore(winProbability: winProbability)

                    let teammatePenalty = Double(
                        getPairCount(teammateCounts, split.teamA[0], split.teamA[1]) +
                        getPairCount(teammateCounts, split.teamB[0], split.teamB[1])
                    )
                    var opponentPenalty: Double = 0
                    for aId in split.teamA {
                        for bId in split.teamB {
                            opponentPenalty += Double(getPairCount(opponentCounts, aId, bId))
                        }
                    }
                    var gamePenalty: Double = 0
                    for id in (split.teamA + split.teamB) {
                        gamePenalty += Double(games[id] ?? 0)
                    }
                    var restPenalty: Double = 0
                    for id in restPlayers {
                        restPenalty += max(0, targetGames - Double(games[id] ?? 0))
                    }

                    let score = Double(fairness) * 2.0 -
                        teammatePenalty * 15.0 -
                        opponentPenalty * 6.0 -
                        gamePenalty * 4.0 -
                        restPenalty * 2.0

                    if best == nil || score > bestScore {
                        bestScore = score
                        best = Candidate(
                            score: score,
                            fairness: fairness,
                            winProbability: winProbability,
                            teamA: split.teamA,
                            teamB: split.teamB,
                            rest: restPlayers
                        )
                    }
                }
            }
            return best
        }

        for r in 0..<roundCount {
            guard let candidate = pickCandidate(strictGames: true) ?? pickCandidate(strictGames: false) else {
                break
            }
            rounds.append(RotationRound(
                roundNumber: r + 1,
                teamA: candidate.teamA,
                teamB: candidate.teamB,
                rest: candidate.rest,
                fairness: candidate.fairness,
                winProbability: candidate.winProbability
            ))

            for id in (candidate.teamA + candidate.teamB) {
                games[id] = (games[id] ?? 0) + 1
            }
            addPairCount(&teammateCounts, candidate.teamA[0], candidate.teamA[1])
            addPairCount(&teammateCounts, candidate.teamB[0], candidate.teamB[1])

            for aId in candidate.teamA {
                for bId in candidate.teamB {
                    addPairCount(&opponentCounts, aId, bId)
                }
            }
        }

        let totalFairness = rounds.reduce(0) { $0 + $1.fairness }
        let averageFairness = rounds.isEmpty ? 0 : Int(round(Double(totalFairness) / Double(rounds.count)))

        return RotationSchedule(rounds: rounds, averageFairness: averageFairness, targetGames: targetGames)
    }
}
