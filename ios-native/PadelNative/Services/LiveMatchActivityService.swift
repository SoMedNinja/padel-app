import Foundation
import ActivityKit
import os

struct LiveMatchAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var teamAScore: Int
        var teamBScore: Int
        var status: String // e.g., "Live", "Halvtid", "Slut"
    }

    var matchId: String
    var teamAName: String
    var teamBName: String
}

@MainActor
class LiveMatchActivityService {
    static let shared = LiveMatchActivityService()

    // Note for non-coders:
    // This logger helps us trace Live Activity lifecycle events without exposing raw identifiers.
    private let logger = Logger(subsystem: Bundle.main.bundleIdentifier ?? "PadelNative", category: "LiveMatchActivityService")

    private init() {}

    private var currentActivity: Activity<LiveMatchAttributes>?
    private var currentMatchId: String?
    private var latestState = LiveMatchAttributes.ContentState(teamAScore: 0, teamBScore: 0, status: LiveMatchActivityService.localizedStatusInProgress)

    static let localizedStatusDraft = NSLocalizedString("Utkast", comment: "Live Activity status when tournament is in draft mode")
    static let localizedStatusInProgress = NSLocalizedString("Pågår", comment: "Live Activity status when tournament is currently in progress")
    static let localizedStatusCompleted = NSLocalizedString("Avslutad", comment: "Live Activity status when tournament has finished")
    static let localizedStatusCancelled = NSLocalizedString("Inställd", comment: "Live Activity status when tournament is cancelled")
    static let localizedStatusAbandoned = NSLocalizedString("Avbruten", comment: "Live Activity status when tournament is abandoned")

    func localizedStatus(for matchState: String) -> String {
        switch matchState {
        case "draft":
            return Self.localizedStatusDraft
        case "in_progress":
            return Self.localizedStatusInProgress
        case "completed":
            return Self.localizedStatusCompleted
        case "cancelled":
            return Self.localizedStatusCancelled
        case "abandoned":
            return Self.localizedStatusAbandoned
        default:
            return Self.localizedStatusInProgress
        }
    }

    func restoreActiveActivityIfNeeded() {
        guard currentActivity == nil else { return }

        // Note for non-coders: when the app comes back, this reconnects to any Live Activity iOS is still showing.
        if let existing = Activity<LiveMatchAttributes>.activities.first {
            currentActivity = existing
            currentMatchId = existing.attributes.matchId
            latestState = existing.content.state
            endDuplicateActivities(for: existing.attributes.matchId, keepingActivityId: existing.id)
        }
    }

    func startOrUpdateMatchActivity(matchId: String, teamA: String, teamB: String, scoreA: Int, scoreB: Int, status: String) {
        guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }

        restoreActiveActivityIfNeeded()

        let updatedState = LiveMatchAttributes.ContentState(teamAScore: scoreA, teamBScore: scoreB, status: status)

        if let existingForMatch = Activity<LiveMatchAttributes>.activities.first(where: { $0.attributes.matchId == matchId }) {
            logger.info("Updating existing Live Activity. matchId=\(matchId, privacy: .private(mask: .hash))")
            currentActivity = existingForMatch
            currentMatchId = matchId
            latestState = updatedState
            endDuplicateActivities(for: matchId, keepingActivityId: existingForMatch.id)
            Task {
                await existingForMatch.update(.init(state: updatedState, staleDate: nil))
            }
            return
        }

        if let activity = currentActivity {
            guard currentMatchId == matchId else {
                logger.info("Switching Live Activity to a new match. previousMatchId=\(self.currentMatchId ?? "none", privacy: .private(mask: .hash)) newMatchId=\(matchId, privacy: .private(mask: .hash))")
                endMatchActivity(scoreA: latestState.teamAScore, scoreB: latestState.teamBScore, status: latestState.status, matchId: self.currentMatchId)
                breakLoopAndStart(matchId: matchId, teamA: teamA, teamB: teamB, updatedState: updatedState)
                return
            }
            latestState = updatedState
            Task {
                await activity.update(.init(state: updatedState, staleDate: nil))
            }
        } else {
            breakLoopAndStart(matchId: matchId, teamA: teamA, teamB: teamB, updatedState: updatedState)
        }
    }

    private func breakLoopAndStart(matchId: String, teamA: String, teamB: String, updatedState: LiveMatchAttributes.ContentState) {
        let attributes = LiveMatchAttributes(matchId: matchId, teamAName: teamA, teamBName: teamB)

        do {
            currentActivity = try Activity.request(
                attributes: attributes,
                content: .init(state: updatedState, staleDate: nil)
            )
            currentMatchId = matchId
            latestState = updatedState
            logger.info("Started Live Activity. matchId=\(matchId, privacy: .private(mask: .hash))")
        } catch {
            logger.error("Failed to start Live Activity. matchId=\(matchId, privacy: .private(mask: .hash)) error=\(error.localizedDescription, privacy: .public)")
        }
    }

    private func endDuplicateActivities(for matchId: String, keepingActivityId: String) {
        let duplicates = Activity<LiveMatchAttributes>.activities.filter {
            $0.attributes.matchId == matchId && $0.id != keepingActivityId
        }

        guard !duplicates.isEmpty else { return }

        Task {
            for duplicate in duplicates {
                logger.debug("Ending duplicate Live Activity. matchId=\(matchId, privacy: .private(mask: .hash)) activityId=\(duplicate.id, privacy: .private(mask: .hash))")
                if #available(iOS 16.2, *) {
                    await duplicate.end(.init(state: duplicate.content.state, staleDate: nil), dismissalPolicy: .immediate)
                } else {
                    await duplicate.end(dismissalPolicy: .immediate)
                }
            }
        }
    }

    func updateMatchActivity(matchId: String, scoreA: Int, scoreB: Int, status: String) {
        guard currentMatchId == matchId else { return }

        Task {
            let updatedState = LiveMatchAttributes.ContentState(teamAScore: scoreA, teamBScore: scoreB, status: status)
            latestState = updatedState
            await currentActivity?.update(.init(state: updatedState, staleDate: nil))
        }
    }

    func endMatchActivity(scoreA: Int? = nil, scoreB: Int? = nil, status: String? = nil, matchId: String? = nil) {
        if let matchId, let currentMatchId, matchId != currentMatchId {
            logger.debug("Skipping Live Activity end for non-active match. requestedMatchId=\(matchId, privacy: .private(mask: .hash)) activeMatchId=\(currentMatchId, privacy: .private(mask: .hash))")
            return
        }

        let finalState = LiveMatchAttributes.ContentState(
            teamAScore: scoreA ?? latestState.teamAScore,
            teamBScore: scoreB ?? latestState.teamBScore,
            status: status ?? latestState.status
        )

        Task {
            // Note for non-coders: iOS 16.2 changed how a Live Activity is closed, so we pass a final snapshot (`content`) before dismissing.
            let finalContent = ActivityContent(state: finalState, staleDate: nil)

            if #available(iOS 16.2, *) {
                await currentActivity?.end(finalContent, dismissalPolicy: .immediate)
            } else {
                await currentActivity?.end(dismissalPolicy: .immediate)
            }
            logger.info("Ended Live Activity. matchId=\(self.currentMatchId ?? "none", privacy: .private(mask: .hash))")
            currentActivity = nil
            currentMatchId = nil
            latestState = LiveMatchAttributes.ContentState(teamAScore: 0, teamBScore: 0, status: Self.localizedStatusCompleted)
        }
    }
}
