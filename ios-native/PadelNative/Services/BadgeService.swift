import Foundation

struct Badge: Identifiable, Hashable {
    let id: String
    let icon: String
    let tier: String
    let title: String
    let description: String
    let earned: Bool
    let group: String
    let groupOrder: Int
    let progress: BadgeProgress?
    let meta: String?
    let holderId: UUID?
    let holderValue: String?

    struct BadgeProgress: Hashable {
        let current: Double
        let target: Double
    }
}

struct EloHistoryEntry: Codable {
    let result: String // "W" or "L"
    let timestamp: Double
    let date: Date
    let delta: Int
    let elo: Int
    let matchId: UUID
}

struct PlayerBadgeStats {
    var matchesPlayed: Int = 0
    var wins: Int = 0
    var losses: Int = 0
    var currentWinStreak: Int = 0
    var bestWinStreak: Int = 0
    var firstWinVsHigherEloAt: Date?
    var biggestUpsetEloGap: Int = 0
    var currentElo: Int = EloService.eloBaseline
    var matchesLast30Days: Int = 0
    var marathonMatches: Int = 0
    var quickWins: Int = 0
    var closeWins: Int = 0
    var cleanSheets: Int = 0
    var nightOwlMatches: Int = 0
    var earlyBirdMatches: Int = 0
    var uniquePartners: Int = 0
    var uniqueOpponents: Int = 0
    var tournamentsPlayed: Int = 0
    var tournamentWins: Int = 0
    var tournamentPodiums: Int = 0
    var americanoWins: Int = 0
    var mexicanoWins: Int = 0
    var totalSetsWon: Int = 0
    var totalSetsLost: Int = 0
    var biggestEloLoss: Int = 0
    var currentLossStreak: Int = 0
    var bestLossStreak: Int = 0
    var guestPartners: Int = 0
    var eloHistory: [EloHistoryEntry] = []
    var recentResults: [String] = [] // Last results
}

enum BadgeService {
    private static let romanNumerals = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"]

    private static let metaDateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = AppConfig.swedishLocale
        formatter.dateStyle = .medium
        formatter.timeStyle = .none
        return formatter
    }()

    static func toRoman(_ index: Int) -> String {
        guard index >= 0 && index < romanNumerals.count else { return "\(index + 1)" }
        return romanNumerals[index]
    }

    struct BadgeDefinition {
        let idPrefix: String
        let icon: String
        let title: String
        let description: (Int) -> String
        let thresholds: [Int]
        let group: String
        let groupOrder: Int
    }

    static let definitions: [BadgeDefinition] = [
        BadgeDefinition(idPrefix: "matches", icon: "🏟️", title: "Matcher", description: { "Spela \($0) matcher" }, thresholds: [1, 5, 10, 25, 50, 75, 100, 150, 200], group: "Matcher", groupOrder: 1),
        BadgeDefinition(idPrefix: "wins", icon: "🏆", title: "Vinster", description: { "Vinn \($0) matcher" }, thresholds: [1, 5, 10, 25, 50, 75, 100, 150], group: "Vinster", groupOrder: 2),
        BadgeDefinition(idPrefix: "losses", icon: "🧱", title: "Förluster", description: { "Spela \($0) förluster" }, thresholds: [1, 5, 10, 25, 50, 75], group: "Förluster", groupOrder: 3),
        BadgeDefinition(idPrefix: "streak", icon: "🔥", title: "Vinststreak", description: { "Vinn \($0) matcher i rad" }, thresholds: [3, 5, 7, 10, 15], group: "Vinststreak", groupOrder: 4),
        BadgeDefinition(idPrefix: "activity", icon: "📅", title: "Aktivitet", description: { "Spela \($0) matcher senaste 30 dagarna" }, thresholds: [3, 6, 10, 15, 20], group: "Aktivitet", groupOrder: 5),
        BadgeDefinition(idPrefix: "elo", icon: "📈", title: "ELO", description: { "Nå \($0) ELO" }, thresholds: [1100, 1200, 1300, 1400, 1500], group: "ELO", groupOrder: 6),
        BadgeDefinition(idPrefix: "upset", icon: "🎯", title: "Skräll", description: { "Vinn mot \($0)+ ELO högre" }, thresholds: [25, 50, 100, 150, 200, 250], group: "Skräll", groupOrder: 7),
        BadgeDefinition(idPrefix: "win-rate", icon: "📊", title: "Vinstprocent", description: { "Ha minst \($0)% vinstprocent" }, thresholds: [50, 60, 70, 80, 90], group: "Vinstprocent", groupOrder: 8),
        BadgeDefinition(idPrefix: "elo-lift", icon: "🚀", title: "ELO-lyft", description: { "Öka \($0) ELO från \(EloService.eloBaseline)" }, thresholds: [50, 100], group: "ELO-lyft", groupOrder: 9),
        BadgeDefinition(idPrefix: "marathon", icon: "⏱️", title: "Maratonmatcher", description: { "Spela \($0) maratonmatcher" }, thresholds: [1, 3, 5, 10, 15], group: "Maraton", groupOrder: 10),
        BadgeDefinition(idPrefix: "fast-win", icon: "⚡", title: "Snabbsegrar", description: { "Vinn \($0) korta matcher" }, thresholds: [1, 3, 5, 8, 12], group: "Snabbsegrar", groupOrder: 11),
        BadgeDefinition(idPrefix: "clutch", icon: "🧊", title: "Nagelbitare", description: { "Vinn \($0) matcher med 1 set" }, thresholds: [1, 3, 5, 8, 12], group: "Nagelbitare", groupOrder: 12),
        BadgeDefinition(idPrefix: "partners", icon: "🤝", title: "Samarbeten", description: { "Spela med \($0) olika partners" }, thresholds: [2, 4, 6, 10, 15], group: "Samarbeten", groupOrder: 13),
        BadgeDefinition(idPrefix: "rivals", icon: "👀", title: "Rivaler", description: { "Möt \($0) olika motståndare" }, thresholds: [3, 5, 8, 12, 20], group: "Rivaler", groupOrder: 14),
        BadgeDefinition(idPrefix: "tournaments-played", icon: "🎲", title: "Turneringar", description: { "Spela \($0) turneringar" }, thresholds: [1, 3, 5, 8], group: "Turneringar", groupOrder: 15),
        BadgeDefinition(idPrefix: "tournaments-wins", icon: "🥇", title: "Turneringssegrar", description: { "Vinn \($0) turneringar" }, thresholds: [1, 2, 3], group: "Turneringar", groupOrder: 16),
        BadgeDefinition(idPrefix: "tournaments-podiums", icon: "🥉", title: "Pallplatser", description: { "Ta \($0) pallplatser" }, thresholds: [1, 3, 5], group: "Turneringar", groupOrder: 17),
        BadgeDefinition(idPrefix: "americano-wins", icon: "🇺🇸", title: "Americano-segrar", description: { "Vinn \($0) Americano-turneringar" }, thresholds: [1, 3, 5], group: "Turneringar", groupOrder: 18),
        BadgeDefinition(idPrefix: "mexicano-wins", icon: "🇲🇽", title: "Mexicano-segrar", description: { "Vinn \($0) Mexicano-turneringar" }, thresholds: [1, 3, 5], group: "Turneringar", groupOrder: 19),
        BadgeDefinition(idPrefix: "night-owl", icon: "🦉", title: "Nattugglan", description: { "Spela \($0) matcher efter kl 21:00" }, thresholds: [5, 10, 25], group: "Övrigt", groupOrder: 20),
        BadgeDefinition(idPrefix: "early-bird", icon: "🌅", title: "Morgonpigg", description: { "Spela \($0) matcher före kl 09:00" }, thresholds: [5, 10, 25], group: "Övrigt", groupOrder: 21),
        BadgeDefinition(idPrefix: "sets-won", icon: "🍽️", title: "Set-slukaren", description: { "Vinn totalt \($0) set" }, thresholds: [10, 25, 50, 100, 250], group: "Prestationer", groupOrder: 22),
        BadgeDefinition(idPrefix: "guest-helper", icon: "🤝", title: "Gästvänlig", description: { "Spela med \($0) gäster" }, thresholds: [1, 5, 10, 20], group: "Prestationer", groupOrder: 23),
        BadgeDefinition(idPrefix: "clean-sheets", icon: "🧹", title: "Nollan", description: { "Vinn \($0) matcher utan att tappa set" }, thresholds: [5, 10, 25, 50], group: "Vinster", groupOrder: 22),
        BadgeDefinition(idPrefix: "sets-lost", icon: "🎁", title: "Generösitet", description: { "Förlora totalt \($0) set" }, thresholds: [10, 25, 50, 100, 250], group: "Prestationer", groupOrder: 24)
    ]

    struct UniqueBadgeDefinition {
        let id: String
        let icon: String
        let title: String
        let description: String
        let group: String
        let groupOrder: Int
    }

    static let uniqueDefinitions: [UniqueBadgeDefinition] = [
        UniqueBadgeDefinition(id: "king-of-elo", icon: "👑", title: "Padelkungen", description: "Högst ELO just nu (minst 10 spelade matcher)", group: "Unika Meriter", groupOrder: 0),
        UniqueBadgeDefinition(id: "most-active", icon: "🐜", title: "Arbetsmyran", description: "Flest spelade matcher totalt", group: "Unika Meriter", groupOrder: 0),
        UniqueBadgeDefinition(id: "win-machine", icon: "🤖", title: "Vinstmaskinen", description: "Högst vinstprocent (minst 20 spelade matcher)", group: "Unika Meriter", groupOrder: 0),
        UniqueBadgeDefinition(id: "upset-king", icon: "⚡", title: "Skräll-mästaren", description: "Störst enskild ELO-skräll", group: "Unika Meriter", groupOrder: 0),
        UniqueBadgeDefinition(id: "marathon-pro", icon: "🏃", title: "Maraton-löparen", description: "Flest maratonmatcher (6+ set)", group: "Unika Meriter", groupOrder: 0),
        UniqueBadgeDefinition(id: "clutch-pro", icon: "🧊", title: "Clutch-specialisten", description: "Flest nagelbitare (vinster med 1 set)", group: "Unika Meriter", groupOrder: 0),
        UniqueBadgeDefinition(id: "social-butterfly", icon: "🦋", title: "Sociala fjärilen", description: "Flest unika partners", group: "Unika Meriter", groupOrder: 0),
        UniqueBadgeDefinition(id: "monthly-giant", icon: "🐘", title: "Månadens gigant", description: "Flest matcher senaste 30 dagarna", group: "Unika Meriter", groupOrder: 0),
        UniqueBadgeDefinition(id: "the-wall", icon: "🧱", title: "Väggen", description: "Flest vinster med noll insläppta set", group: "Unika Meriter", groupOrder: 0),
        UniqueBadgeDefinition(id: "loss-machine", icon: "🌪️", title: "Motvind", description: "Högst förlustprocent (minst 20 spelade matcher)", group: "Unika Meriter", groupOrder: 0),
        UniqueBadgeDefinition(id: "trough-dweller", icon: "🤿", title: "Bottenkänning", description: "Lägst ELO just nu (minst 10 spelade matcher)", group: "Unika Meriter", groupOrder: 0),
        UniqueBadgeDefinition(id: "biggest-fall", icon: "⚓", title: "Sänket", description: "Störst enskild ELO-förlust", group: "Unika Meriter", groupOrder: 0),
        UniqueBadgeDefinition(id: "hard-times", icon: "🩹", title: "Otursprenumerant", description: "Flest förluster totalt", group: "Unika Meriter", groupOrder: 0),
        UniqueBadgeDefinition(id: "most-generous", icon: "💝", title: "Generös", description: "Flest förlorade set totalt", group: "Unika Meriter", groupOrder: 0),
        UniqueBadgeDefinition(id: "cold-streak-pro", icon: "❄️", title: "Isvind", description: "Längst förluststreak", group: "Unika Meriter", groupOrder: 0)
    ]

    static func getBadgeIconById(_ badgeId: String?) -> String? {
        guard let badgeId, !badgeId.isEmpty else { return nil }

        if badgeId == "giant-slayer" || badgeId == "giant-slayer-pro" {
            return "⚔️"
        }

        if let uniqueIcon = uniqueDefinitions.first(where: { $0.id == badgeId })?.icon {
            return uniqueIcon
        }

        if let lastDashIndex = badgeId.lastIndex(of: "-") {
            let prefix = String(badgeId[..<lastDashIndex])
            return definitions.first(where: { $0.idPrefix == prefix })?.icon
        }

        return definitions.first(where: { $0.idPrefix == badgeId })?.icon
    }

    static func getBadgeTierLabelById(_ badgeId: String?) -> String? {
        guard let badgeId, !badgeId.isEmpty else { return nil }
        if badgeId == "giant-slayer" { return "I" }
        if badgeId == "giant-slayer-pro" { return "II" }

        guard let lastDashIndex = badgeId.lastIndex(of: "-") else { return nil }
        let prefix = String(badgeId[..<lastDashIndex])
        let targetStr = String(badgeId[badgeId.index(after: lastDashIndex)...])

        guard let target = Int(targetStr),
              let thresholds = definitions.first(where: { $0.idPrefix == prefix })?.thresholds,
              let index = thresholds.firstIndex(of: target) else {
            return nil
        }

        return toRoman(index)
    }

    static func getBadgeLabelById(_ badgeId: String?) -> String {
        let icon = getBadgeIconById(badgeId)
        guard let icon = icon else { return "" }
        let tier = getBadgeTierLabelById(badgeId)
        if let tier = tier {
            return "\(icon) \(tier)"
        }
        return icon
    }

    static func buildAllPlayersBadgeStats(
        matches: [Match],
        players: [Player],
        tournamentResults: [TournamentResult]
    ) -> [UUID: PlayerBadgeStats] {
        var statsMap: [UUID: PlayerBadgeStats] = [:]
        var partnerSets: [UUID: Set<UUID>] = [:]
        var opponentSets: [UUID: Set<UUID>] = [:]
        var eloMap: [UUID: (elo: Double, games: Int)] = [:]

        for player in players {
            statsMap[player.id] = PlayerBadgeStats()
            partnerSets[player.id] = Set()
            opponentSets[player.id] = Set()
            eloMap[player.id] = (Double(EloService.eloBaseline), 0)
        }

        // Optimization: Linear check for sort order (ASC or DESC) to avoid O(N log N)
        var isSortedAsc = true
        var isSortedDesc = true
        if matches.count > 1 {
            for i in 0..<matches.count - 1 {
                if matches[i].playedAt > matches[i+1].playedAt { isSortedAsc = false }
                if matches[i].playedAt < matches[i+1].playedAt { isSortedDesc = false }
                if !isSortedAsc && !isSortedDesc { break }
            }
        }
        let sortedMatches: [Match]
        if isSortedAsc {
            sortedMatches = matches
        } else if isSortedDesc {
            sortedMatches = Array(matches.reversed())
        } else {
            sortedMatches = matches.sorted { $0.playedAt < $1.playedAt }
        }

        let thirtyDaysAgo = Date().addingTimeInterval(-30 * 24 * 60 * 60)
        let calendar = Calendar.current

        // Optimization: Cache UUID parsing to avoid redundant work across thousands of matches
        var uuidCache: [String: UUID?] = [:]
        func parseUUID(_ s: String?) -> UUID? {
            guard let s = s, !s.isEmpty else { return nil }
            // Fix: Cache nil results too (e.g. for "guest")
            if let cached = uuidCache[s] { return cached }
            let u = UUID(uuidString: s)
            uuidCache[s] = u
            return u
        }

        for match in sortedMatches {
            let teamA = match.teamAPlayerIds.compactMap { parseUUID($0) }
            let teamB = match.teamBPlayerIds.compactMap { parseUUID($0) }

            if teamA.isEmpty || teamB.isEmpty { continue }

            let teamAAvgElo = teamA.reduce(0.0) { $0 + (eloMap[$1]?.elo ?? Double(EloService.eloBaseline)) } / Double(teamA.count)
            let teamBAvgElo = teamB.reduce(0.0) { $0 + (eloMap[$1]?.elo ?? Double(EloService.eloBaseline)) } / Double(teamB.count)

            let expectedA = EloService.getExpectedScore(rating: teamAAvgElo, opponentRating: teamBAvgElo)
            let teamAWon = match.teamAScore > match.teamBScore
            let marginMultiplier = EloService.getMarginMultiplier(team1Sets: match.teamAScore, team2Sets: match.teamBScore)
            let isSinglesMatch = teamA.count == 1 && teamB.count == 1
            let matchWeight = EloService.getSinglesAdjustedMatchWeight(match: match, isSinglesMatch: isSinglesMatch)

            let matchHour = calendar.component(.hour, from: match.playedAt)

            func updatePlayer(id: UUID, isTeamA: Bool) {
                if statsMap[id] == nil {
                    statsMap[id] = PlayerBadgeStats()
                    partnerSets[id] = Set()
                    opponentSets[id] = Set()
                    eloMap[id] = (Double(EloService.eloBaseline), 0)
                }

                var stats = statsMap[id]!
                let playerPreElo = eloMap[id]?.elo ?? Double(EloService.eloBaseline)
                let opponentAvg = isTeamA ? teamBAvgElo : teamAAvgElo
                let playerWon = (isTeamA && teamAWon) || (!isTeamA && !teamAWon)

                let myTeam = isTeamA ? teamA : teamB
                let otherTeam = isTeamA ? teamB : teamA

                for pId in myTeam where pId != id { partnerSets[id]?.insert(pId) }
                for oId in otherTeam { opponentSets[id]?.insert(oId) }

                let maxSets = max(match.teamAScore, match.teamBScore)
                let margin = abs(match.teamAScore - match.teamBScore)
                let scoreType = match.scoreType ?? "sets"

                if scoreType == "sets" {
                    if maxSets >= 6 { stats.marathonMatches += 1 }
                    if playerWon && maxSets <= 3 { stats.quickWins += 1 }
                    if playerWon && margin == 1 { stats.closeWins += 1 }
                    if playerWon && (isTeamA ? match.teamBScore == 0 : match.teamAScore == 0) {
                        stats.cleanSheets += 1
                    }
                }

                if match.playedAt >= thirtyDaysAgo { stats.matchesLast30Days += 1 }
                if matchHour >= 21 { stats.nightOwlMatches += 1 }
                if matchHour < 9 { stats.earlyBirdMatches += 1 }

                stats.matchesPlayed += 1
                stats.totalSetsWon += isTeamA ? match.teamAScore : match.teamBScore
                stats.totalSetsLost += isTeamA ? match.teamBScore : match.teamAScore

                let myTeamIdsWithGuests = isTeamA ? match.teamAPlayerIds : match.teamBPlayerIds
                // Note: Guest handling in PWA uses "guest" or "name:..."
                stats.guestPartners += myTeamIdsWithGuests.filter { id in
                    guard let id = id else { return true }
                    return id == "guest" || id.hasPrefix("name:") || parseUUID(id) == nil
                }.count

                if playerWon {
                    stats.wins += 1
                    stats.currentWinStreak += 1
                    stats.bestWinStreak = max(stats.bestWinStreak, stats.currentWinStreak)
                    stats.currentLossStreak = 0
                    if opponentAvg > playerPreElo {
                        if stats.firstWinVsHigherEloAt == nil { stats.firstWinVsHigherEloAt = match.playedAt }
                        stats.biggestUpsetEloGap = max(stats.biggestUpsetEloGap, Int(round(opponentAvg - playerPreElo)))
                    }
                } else {
                    stats.losses += 1
                    stats.currentWinStreak = 0
                    stats.currentLossStreak += 1
                    stats.bestLossStreak = max(stats.bestLossStreak, stats.currentLossStreak)
                }

                let playerK = EloService.getKFactor(games: eloMap[id]?.games ?? 0)
                let weight = EloService.getPlayerWeight(playerElo: playerPreElo, teamAverageElo: isTeamA ? teamAAvgElo : teamBAvgElo)
                let effectiveWeight = playerWon ? weight : 1 / weight
                let expected = isTeamA ? expectedA : (1 - expectedA)
                let delta = playerK * marginMultiplier * matchWeight * effectiveWeight * ((playerWon ? 1.0 : 0.0) - expected)
                let roundedDelta = Int(round(delta))

                if roundedDelta < 0 {
                    stats.biggestEloLoss = max(stats.biggestEloLoss, abs(roundedDelta))
                }

                let newElo = Int(round(playerPreElo + Double(roundedDelta)))
                eloMap[id] = (Double(newElo), (eloMap[id]?.games ?? 0) + 1)

                let result = playerWon ? "W" : "L"
                stats.recentResults.append(result)
                stats.eloHistory.append(EloHistoryEntry(
                    result: result,
                    timestamp: match.playedAt.timeIntervalSince1970 * 1000,
                    date: match.playedAt,
                    delta: roundedDelta,
                    elo: newElo,
                    matchId: match.id
                ))

                statsMap[id] = stats
            }

            for id in teamA { updatePlayer(id: id, isTeamA: true) }
            for id in teamB { updatePlayer(id: id, isTeamA: false) }
        }

        for id in statsMap.keys {
            var stats = statsMap[id]!
            stats.currentElo = Int(round(eloMap[id]?.elo ?? Double(EloService.eloBaseline)))
            stats.uniquePartners = partnerSets[id]?.count ?? 0
            stats.uniqueOpponents = opponentSets[id]?.count ?? 0

            let playerTournamentResults = tournamentResults.filter { $0.profileId == id }
            stats.tournamentsPlayed = Set(playerTournamentResults.map { $0.tournamentId }).count
            stats.tournamentWins = playerTournamentResults.filter { $0.rank == 1 }.count
            stats.tournamentPodiums = playerTournamentResults.filter { $0.rank <= 3 }.count
            stats.americanoWins = playerTournamentResults.filter { $0.rank == 1 && $0.tournamentType == "americano" }.count
            stats.mexicanoWins = playerTournamentResults.filter { $0.rank == 1 && $0.tournamentType == "mexicano" }.count

            statsMap[id] = stats
        }

        return statsMap
    }

    struct UniqueMeritHolder {
        let playerId: UUID
        let value: Double
        let formattedValue: String
    }

    static func buildUniqueMeritHolders(allPlayerStats: [UUID: PlayerBadgeStats]) -> [String: UniqueMeritHolder] {
        var holders: [String: UniqueMeritHolder] = [:]

        for def in uniqueDefinitions {
            var bestValue: Double = -1.0
            var bestPlayerId: UUID?

            for (pId, s) in allPlayerStats {
                var val: Double = -1.0
                switch def.id {
                case "king-of-elo": if s.matchesPlayed >= 10 { val = Double(s.currentElo) }
                case "most-active": val = Double(s.matchesPlayed)
                case "win-machine": if s.matchesPlayed >= 20 { val = Double(s.wins) / Double(s.matchesPlayed) }
                case "upset-king": val = Double(s.biggestUpsetEloGap)
                case "marathon-pro": val = Double(s.marathonMatches)
                case "clutch-pro": val = Double(s.closeWins)
                case "social-butterfly": val = Double(s.uniquePartners)
                case "monthly-giant": val = Double(s.matchesLast30Days)
                case "the-wall": val = Double(s.cleanSheets)
                case "loss-machine": if s.matchesPlayed >= 20 { val = Double(s.losses) / Double(s.matchesPlayed) }
                case "trough-dweller": if s.matchesPlayed >= 10 { val = 10000.0 - Double(s.currentElo) }
                case "biggest-fall": val = Double(s.biggestEloLoss)
                case "hard-times": val = Double(s.losses)
                case "most-generous": val = Double(s.totalSetsLost)
                case "cold-streak-pro": val = Double(s.bestLossStreak)
                default: break
                }

                if val > bestValue {
                    bestValue = val
                    bestPlayerId = pId
                }
            }

            if let holderId = bestPlayerId, bestValue >= 0 {
                var formattedValue = ""
                if def.id == "win-machine" || def.id == "loss-machine" {
                    formattedValue = "\(Int(round(bestValue * 100)))%"
                } else if def.id == "king-of-elo" {
                    formattedValue = "\(Int(round(bestValue))) ELO"
                } else if def.id == "trough-dweller" {
                    formattedValue = "\(10000 - Int(round(bestValue))) ELO"
                } else if def.id == "upset-king" {
                    formattedValue = "+\(Int(round(bestValue))) ELO"
                } else if def.id == "biggest-fall" {
                    formattedValue = "-\(Int(round(bestValue))) ELO"
                } else {
                    formattedValue = "\(Int(round(bestValue)))"
                }
                holders[def.id] = UniqueMeritHolder(playerId: holderId, value: bestValue, formattedValue: formattedValue)
            }
        }
        return holders
    }

    static func buildPlayerBadges(
        playerId: UUID,
        allPlayerStats: [UUID: PlayerBadgeStats],
        uniqueMeritHolders: [String: UniqueMeritHolder]? = nil
    ) -> [Badge] {
        guard let stats = allPlayerStats[playerId] else { return [] }

        var badges: [Badge] = []

        let winRate = stats.matchesPlayed > 0 ? Int(round(Double(stats.wins) / Double(stats.matchesPlayed) * 100)) : 0
        let eloLift = max(0, stats.currentElo - EloService.eloBaseline)

        let badgeValues: [String: Double] = [
            "matches": Double(stats.matchesPlayed),
            "wins": Double(stats.wins),
            "losses": Double(stats.losses),
            "streak": Double(stats.bestWinStreak),
            "activity": Double(stats.matchesLast30Days),
            "elo": Double(stats.currentElo),
            "upset": Double(stats.biggestUpsetEloGap),
            "win-rate": Double(winRate),
            "elo-lift": Double(eloLift),
            "marathon": Double(stats.marathonMatches),
            "fast-win": Double(stats.quickWins),
            "clutch": Double(stats.closeWins),
            "clean-sheets": Double(stats.cleanSheets),
            "night-owl": Double(stats.nightOwlMatches),
            "early-bird": Double(stats.earlyBirdMatches),
            "sets-won": Double(stats.totalSetsWon),
            "guest-helper": Double(stats.guestPartners),
            "partners": Double(stats.uniquePartners),
            "rivals": Double(stats.uniqueOpponents),
            "tournaments-played": Double(stats.tournamentsPlayed),
            "tournaments-wins": Double(stats.tournamentWins),
            "tournaments-podiums": Double(stats.tournamentPodiums),
            "americano-wins": Double(stats.americanoWins),
            "mexicano-wins": Double(stats.mexicanoWins),
            "sets-lost": Double(stats.totalSetsLost)
        ]

        for def in definitions {
            let value = badgeValues[def.idPrefix] ?? 0.0
            for (index, target) in def.thresholds.enumerated() {
                badges.append(Badge(
                    id: "\(def.idPrefix)-\(target)",
                    icon: def.icon,
                    tier: toRoman(index),
                    title: "\(def.title) \(target)",
                    description: def.description(target),
                    earned: value >= Double(target),
                    group: def.group,
                    groupOrder: def.groupOrder,
                    progress: Badge.BadgeProgress(current: min(value, Double(target)), target: Double(target)),
                    meta: nil,
                    holderId: nil,
                    holderValue: nil
                ))
            }
        }

        // Giant Slayer
        badges.append(Badge(
            id: "giant-slayer",
            icon: "⚔️",
            tier: "I",
            title: "Jättedödare",
            description: "Vinn mot ett lag med högre genomsnittlig ELO",
            earned: stats.firstWinVsHigherEloAt != nil,
            group: "Jättedödare",
            groupOrder: 25,
            progress: nil,
            meta: stats.firstWinVsHigherEloAt != nil ? "Upplåst!" : "Sikta på en seger mot högre ELO.",
            holderId: nil,
            holderValue: nil
        ))

        badges.append(Badge(
            id: "giant-slayer-pro",
            icon: "⚔️",
            tier: "II",
            title: "Stora Jättedödaren",
            description: "Vinn mot ett lag med 200+ högre genomsnittlig ELO",
            earned: stats.biggestUpsetEloGap >= 200,
            group: "Jättedödare",
            groupOrder: 26,
            progress: Badge.BadgeProgress(current: min(Double(stats.biggestUpsetEloGap), 200), target: 200),
            meta: "Största skräll: +\(stats.biggestUpsetEloGap) ELO",
            holderId: nil,
            holderValue: nil
        ))

        // Unique Merits - Optimized O(1) lookup
        let holders = uniqueMeritHolders ?? buildUniqueMeritHolders(allPlayerStats: allPlayerStats)

        for def in uniqueDefinitions {
            if let holder = holders[def.id] {
                let isEarned = holder.playerId == playerId
                badges.append(Badge(
                    id: def.id,
                    icon: def.icon,
                    tier: "Unique",
                    title: def.title,
                    description: def.description,
                    earned: isEarned,
                    group: def.group,
                    groupOrder: def.groupOrder,
                    progress: nil,
                    meta: nil,
                    holderId: isEarned ? nil : holder.playerId,
                    holderValue: isEarned ? nil : holder.formattedValue
                ))
            }
        }

        return badges
    }
}
