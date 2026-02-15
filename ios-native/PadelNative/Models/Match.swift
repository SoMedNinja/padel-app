import Foundation
import SwiftUI
import CoreTransferable
import UniformTypeIdentifiers

struct Match: Identifiable, Codable {
    let id: UUID
    let createdBy: UUID?
    let playedAt: Date
    let teamAName: String
    let teamBName: String
    let teamANames: [String]
    let teamBNames: [String]
    let teamAScore: Int
    let teamBScore: Int
    let teamAPlayerIds: [String?]
    let teamBPlayerIds: [String?]
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
    private static func decodeTeamNames(from container: KeyedDecodingContainer<CodingKeys>, key: CodingKeys) throws -> [String] {
        if let names = try container.decodeIfPresent([String].self, forKey: key) {
            return names.map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
        }
        if let name = try container.decodeIfPresent(String.self, forKey: key) {
            return [name.trimmingCharacters(in: .whitespacesAndNewlines)]
        }
        return []
    }

    private static func decodePlayerIds(from container: KeyedDecodingContainer<CodingKeys>, key: CodingKeys) throws -> [String?] {
        guard let rawValues = try container.decodeIfPresent([String?].self, forKey: key) else {
            return []
        }
        return rawValues.map { val in
            guard let val = val, !val.isEmpty else { return nil }
            return val
        }
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        createdBy = try container.decodeIfPresent(UUID.self, forKey: .createdBy)
        playedAt = try container.decodeIfPresent(Date.self, forKey: .playedAt) ?? .distantPast

        let tANames = try Self.decodeTeamNames(from: container, key: .teamAName)
        let tBNames = try Self.decodeTeamNames(from: container, key: .teamBName)
        teamANames = tANames
        teamBNames = tBNames
        teamAName = tANames.filter { !$0.isEmpty }.joined(separator: " & ")
        teamBName = tBNames.filter { !$0.isEmpty }.joined(separator: " & ")

        teamAScore = try container.decodeIfPresent(Int.self, forKey: .teamAScore) ?? 0
        teamBScore = try container.decodeIfPresent(Int.self, forKey: .teamBScore) ?? 0
        teamAPlayerIds = try Self.decodePlayerIds(from: container, key: .teamAPlayerIds)
        teamBPlayerIds = try Self.decodePlayerIds(from: container, key: .teamBPlayerIds)
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
        teamAPlayerIds: [String?] = [],
        teamBPlayerIds: [String?] = [],
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
        self.teamANames = teamAName.split(separator: "&").map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
        self.teamBNames = teamBName.split(separator: "&").map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
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
        try container.encode(teamANames, forKey: .teamAName)
        try container.encode(teamBNames, forKey: .teamBName)
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

extension Match: Transferable {
    static var transferRepresentation: some TransferRepresentation {
        ProxyRepresentation(exporting: \.shareText)

        DataRepresentation(exportedContentType: .text) { match in
            match.shareText.data(using: .utf8) ?? Data()
        }

        // Suggestion 6: Adding image support for rich previews
        DataRepresentation(exportedContentType: .png) { match in
            guard let url = try? match.createShareCardImage(title: match.shareTitle, fileNamePrefix: "match") else {
                return Data()
            }
            return try Data(contentsOf: url)
        }
        .suggestedFileName { match in
            "padel-match-\(match.id.uuidString.lowercased())"
        }
    }

    var shareTitle: String {
        "🎾 \(teamAName) vs \(teamBName)"
    }

    var shareSummary: String {
        "Resultat: \(teamAScore)-\(teamBScore) • \(Self.shareDateFormatter.string(from: playedAt))"
    }

    var shareText: String {
        "\(shareTitle)\n\(shareSummary)"
    }

    // Note for non-coders:
    // A share card is the branded image attached to chats/mail so the match looks visual.
    func createShareCardImage(title: String? = nil, fileNamePrefix: String = "match") throws -> URL {
        let lines = [
            "\(teamAName) vs \(teamBName)",
            "Resultat: \(teamAScore)-\(teamBScore)",
            "Spelad: \(Self.shareDateFormatter.string(from: playedAt))"
        ]

        return try ShareCardService.createShareImageFile(
            title: title ?? shareTitle,
            bodyLines: lines,
            fileNamePrefix: fileNamePrefix
        )
    }

    private static let shareDateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = AppConfig.swedishLocale
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter
    }()
}
