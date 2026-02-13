import Foundation
import ActivityKit

struct LiveMatchAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var teamAScore: Int
        var teamBScore: Int
        var status: String // e.g., "Live", "Halvtid", "Slut"
    }

    var teamAName: String
    var teamBName: String
}

@MainActor
class LiveMatchActivityService {
    static let shared = LiveMatchActivityService()

    private init() {}

    private var currentActivity: Activity<LiveMatchAttributes>?

    func startOrUpdateMatchActivity(teamA: String, teamB: String, scoreA: Int, scoreB: Int) {
        guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }

        if let activity = currentActivity {
            let updatedState = LiveMatchAttributes.ContentState(teamAScore: scoreA, teamBScore: scoreB, status: "Live")
            Task {
                await activity.update(.init(state: updatedState, staleDate: nil))
            }
        } else {
            let attributes = LiveMatchAttributes(teamAName: teamA, teamBName: teamB)
            let initialState = LiveMatchAttributes.ContentState(teamAScore: scoreA, teamBScore: scoreB, status: "Live")

            do {
                currentActivity = try Activity.request(
                    attributes: attributes,
                    content: .init(state: initialState, staleDate: nil)
                )
            } catch {
                print("Error starting Live Activity: \(error.localizedDescription)")
            }
        }
    }

    func updateMatchActivity(scoreA: Int, scoreB: Int, status: String = "Live") {
        Task {
            let updatedState = LiveMatchAttributes.ContentState(teamAScore: scoreA, teamBScore: scoreB, status: status)
            await currentActivity?.update(.init(state: updatedState, staleDate: nil))
        }
    }

    func endMatchActivity() {
        Task {
            // Note for non-coders: iOS 16.2 changed how a Live Activity is closed, so we pass a final snapshot (`content`) before dismissing.
            let finalState = LiveMatchAttributes.ContentState(teamAScore: 0, teamBScore: 0, status: "Slut")
            let finalContent = ActivityContent(state: finalState, staleDate: nil)

            if #available(iOS 16.2, *) {
                await currentActivity?.end(finalContent, dismissalPolicy: .immediate)
            } else {
                await currentActivity?.end(dismissalPolicy: .immediate)
            }
            currentActivity = nil
        }
    }
}
