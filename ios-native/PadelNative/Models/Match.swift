import Foundation

struct Match: Identifiable, Codable {
    let id: UUID
    let createdBy: UUID?
    let playedAt: Date
    let teamAName: String
    let teamBName: String
    let teamAScore: Int
    let teamBScore: Int
    let teamAPlayerIds: [UUID?]
    let teamBPlayerIds: [UUID?]
    let scoreType: String?
    let scoreTarget: Int?
    let sourceTournamentId: UUID?
    let sourceTournamentType: String?
    let teamAServesFirst: Bool?

    enum CodingKeys: String, CodingKey {
        case id
        case createdBy = "created_by"
        case playedAt = "created_at"
        case teamAName = "team1"
        case teamBName = "team2"
        case teamAScore = "team1_sets"
        case teamBScore = "team2_sets"
        case teamAPlayerIds = "team1_ids"
        case teamBPlayerIds = "team2_ids"
        case scoreType = "score_type"
        case scoreTarget = "score_target"
        case sourceTournamentId = "source_tournament_id"
        case sourceTournamentType = "source_tournament_type"
        case teamAServesFirst = "team1_serves_first"
    }

    // Note for non-coders:
    // The web app stores team names as arrays (for doubles) while old iOS code used one string.
    // This helper keeps iOS screens readable by turning either format into "Name 1 & Name 2".
    private static func decodeTeamName(from container: KeyedDecodingContainer<CodingKeys>, key: CodingKeys) throws -> String {
        if let names = try container.decodeIfPresent([String].self, forKey: key) {
            return names.filter { !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }.joined(separator: " & ")
        }
        if let name = try container.decodeIfPresent(String.self, forKey: key) {
            return name
        }
        return ""
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        createdBy = try container.decodeIfPresent(UUID.self, forKey: .createdBy)
        playedAt = try container.decodeIfPresent(Date.self, forKey: .playedAt) ?? .distantPast
        teamAName = try Self.decodeTeamName(from: container, key: .teamAName)
        teamBName = try Self.decodeTeamName(from: container, key: .teamBName)
        teamAScore = try container.decodeIfPresent(Int.self, forKey: .teamAScore) ?? 0
        teamBScore = try container.decodeIfPresent(Int.self, forKey: .teamBScore) ?? 0
        teamAPlayerIds = try container.decodeIfPresent([UUID?].self, forKey: .teamAPlayerIds) ?? []
        teamBPlayerIds = try container.decodeIfPresent([UUID?].self, forKey: .teamBPlayerIds) ?? []
        scoreType = try container.decodeIfPresent(String.self, forKey: .scoreType)
        scoreTarget = try container.decodeIfPresent(Int.self, forKey: .scoreTarget)
        sourceTournamentId = try container.decodeIfPresent(UUID.self, forKey: .sourceTournamentId)
        sourceTournamentType = try container.decodeIfPresent(String.self, forKey: .sourceTournamentType)
        teamAServesFirst = try container.decodeIfPresent(Bool.self, forKey: .teamAServesFirst)
    }

    init(
        id: UUID,
        createdBy: UUID? = nil,
        playedAt: Date,
        teamAName: String,
        teamBName: String,
        teamAScore: Int,
        teamBScore: Int,
        teamAPlayerIds: [UUID?] = [],
        teamBPlayerIds: [UUID?] = [],
        scoreType: String? = "sets",
        scoreTarget: Int? = nil,
        sourceTournamentId: UUID? = nil,
        sourceTournamentType: String? = "standalone",
        teamAServesFirst: Bool? = true
    ) {
        self.id = id
        self.createdBy = createdBy
        self.playedAt = playedAt
        self.teamAName = teamAName
        self.teamBName = teamBName
        self.teamAScore = teamAScore
        self.teamBScore = teamBScore
        self.teamAPlayerIds = teamAPlayerIds
        self.teamBPlayerIds = teamBPlayerIds
        self.scoreType = scoreType
        self.scoreTarget = scoreTarget
        self.sourceTournamentId = sourceTournamentId
        self.sourceTournamentType = sourceTournamentType
        self.teamAServesFirst = teamAServesFirst
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encodeIfPresent(createdBy, forKey: .createdBy)
        try container.encode(playedAt, forKey: .playedAt)
        try container.encode(teamAName.split(separator: "&").map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }, forKey: .teamAName)
        try container.encode(teamBName.split(separator: "&").map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }, forKey: .teamBName)
        try container.encode(teamAScore, forKey: .teamAScore)
        try container.encode(teamBScore, forKey: .teamBScore)
        try container.encode(teamAPlayerIds, forKey: .teamAPlayerIds)
        try container.encode(teamBPlayerIds, forKey: .teamBPlayerIds)
        try container.encodeIfPresent(scoreType, forKey: .scoreType)
        try container.encodeIfPresent(scoreTarget, forKey: .scoreTarget)
        try container.encodeIfPresent(sourceTournamentId, forKey: .sourceTournamentId)
        try container.encodeIfPresent(sourceTournamentType, forKey: .sourceTournamentType)
        try container.encodeIfPresent(teamAServesFirst, forKey: .teamAServesFirst)
    }
}
