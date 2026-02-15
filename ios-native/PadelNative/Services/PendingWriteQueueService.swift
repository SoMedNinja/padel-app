import Foundation

enum PendingWriteSyncStatus: String, Codable {
    case synced
    case pending
    case failed
}

struct PendingWriteQueueSnapshot: Codable, Equatable {
    var pendingCount: Int
    var failedCount: Int
    var status: PendingWriteSyncStatus
    var lastError: String?
    var lastSyncedAt: Date?

    static let empty = PendingWriteQueueSnapshot(
        pendingCount: 0,
        failedCount: 0,
        status: .synced,
        lastError: nil,
        lastSyncedAt: nil
    )
}

struct PendingMatchSubmissionPayload: Codable {
    let submission: MatchSubmission
}

struct PendingTournamentCreationPayload: Codable {
    let request: TournamentCreationRequest
}

struct PendingTournamentStatusPayload: Codable {
    let tournamentId: UUID
    let status: String
}

struct PendingTournamentRoundScorePayload: Codable {
    let roundId: UUID
    let team1Score: Int
    let team2Score: Int
}

enum PendingWritePayload: Codable {
    case submitMatch(PendingMatchSubmissionPayload)
    case createTournament(PendingTournamentCreationPayload)
    case updateTournamentStatus(PendingTournamentStatusPayload)
    case saveTournamentRoundScore(PendingTournamentRoundScorePayload)

    private enum CodingKeys: String, CodingKey {
        case type
        case submitMatch
        case createTournament
        case updateTournamentStatus
        case saveTournamentRoundScore
    }

    private enum PayloadType: String, Codable {
        case submitMatch
        case createTournament
        case updateTournamentStatus
        case saveTournamentRoundScore
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        switch try container.decode(PayloadType.self, forKey: .type) {
        case .submitMatch:
            self = .submitMatch(try container.decode(PendingMatchSubmissionPayload.self, forKey: .submitMatch))
        case .createTournament:
            self = .createTournament(try container.decode(PendingTournamentCreationPayload.self, forKey: .createTournament))
        case .updateTournamentStatus:
            self = .updateTournamentStatus(try container.decode(PendingTournamentStatusPayload.self, forKey: .updateTournamentStatus))
        case .saveTournamentRoundScore:
            self = .saveTournamentRoundScore(try container.decode(PendingTournamentRoundScorePayload.self, forKey: .saveTournamentRoundScore))
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        switch self {
        case .submitMatch(let payload):
            try container.encode(PayloadType.submitMatch, forKey: .type)
            try container.encode(payload, forKey: .submitMatch)
        case .createTournament(let payload):
            try container.encode(PayloadType.createTournament, forKey: .type)
            try container.encode(payload, forKey: .createTournament)
        case .updateTournamentStatus(let payload):
            try container.encode(PayloadType.updateTournamentStatus, forKey: .type)
            try container.encode(payload, forKey: .updateTournamentStatus)
        case .saveTournamentRoundScore(let payload):
            try container.encode(PayloadType.saveTournamentRoundScore, forKey: .type)
            try container.encode(payload, forKey: .saveTournamentRoundScore)
        }
    }
}

struct PendingWriteMutation: Codable, Identifiable {
    let id: UUID
    let createdAt: Date
    var attempts: Int
    let payload: PendingWritePayload
}

@MainActor
final class PendingWriteQueueService {
    typealias Executor = (PendingWritePayload) async throws -> Void

    private let storageKey = "ios-pending-write-queue-v1"
    private let maxAutoAttempts = 3
    private let retryDelayNanoseconds: UInt64 = 12_000_000_000

    private let defaults: UserDefaults
    private var queue: [PendingWriteMutation] = []
    private var isProcessing = false
    private var retryTask: Task<Void, Never>?
    private var executor: Executor?
    private var lastSyncedAt: Date?
    private var lastError: String?

    var onSnapshotChange: ((PendingWriteQueueSnapshot) -> Void)?

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        self.queue = loadQueue()
        publishSnapshot()
    }

    // Note for non-coders:
    // AppViewModel plugs in one function here that knows how to send each queued write type.
    func setExecutor(_ executor: @escaping Executor) {
        self.executor = executor
    }

    func currentSnapshot() -> PendingWriteQueueSnapshot {
        let failedCount = queue.filter { $0.attempts >= maxAutoAttempts }.count
        let status: PendingWriteSyncStatus = failedCount > 0 ? .failed : (queue.isEmpty ? .synced : .pending)
        return PendingWriteQueueSnapshot(
            pendingCount: queue.count,
            failedCount: failedCount,
            status: status,
            lastError: lastError,
            lastSyncedAt: lastSyncedAt
        )
    }

    func enqueue(_ payload: PendingWritePayload) {
        queue.append(PendingWriteMutation(id: UUID(), createdAt: Date(), attempts: 0, payload: payload))
        persistQueue()
        lastError = nil
        publishSnapshot()
        scheduleRetry()
    }

    func flush() async {
        guard let executor else { return }
        await processQueue(using: executor)
    }

    private func processQueue(using executor: @escaping Executor) async {
        guard !isProcessing else { return }
        guard queue.isEmpty == false else {
            lastError = nil
            lastSyncedAt = Date()
            publishSnapshot()
            return
        }

        isProcessing = true
        defer { isProcessing = false }

        while let current = queue.first {
            do {
                try await executor(current.payload)
                queue.removeFirst()
                persistQueue()
                lastError = nil
                lastSyncedAt = Date()
                publishSnapshot()
            } catch {
                var failed = current
                failed.attempts += 1
                queue[0] = failed
                persistQueue()
                lastError = error.localizedDescription
                publishSnapshot()
                scheduleRetry()
                break
            }
        }
    }

    private func scheduleRetry() {
        guard let executor else { return }
        retryTask?.cancel()
        retryTask = Task { [weak self] in
            guard let self else { return }
            try? await Task.sleep(nanoseconds: retryDelayNanoseconds)
            await self.processQueue(using: executor)
        }
    }

    private func loadQueue() -> [PendingWriteMutation] {
        guard let data = defaults.data(forKey: storageKey) else { return [] }
        return (try? JSONDecoder().decode([PendingWriteMutation].self, from: data)) ?? []
    }

    private func persistQueue() {
        if queue.isEmpty {
            defaults.removeObject(forKey: storageKey)
            return
        }

        guard let data = try? JSONEncoder().encode(queue) else { return }
        defaults.set(data, forKey: storageKey)
    }

    private func publishSnapshot() {
        onSnapshotChange?(currentSnapshot())
    }
}
