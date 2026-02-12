import Foundation

// Note for non-coders:
// Think of this as a "change planner". It compares tiny marker values from the backend
// and tells the app exactly which sections need refresh, so we avoid reloading everything.
enum LiveDataDomain: String, CaseIterable, Hashable {
    case players
    case matches
    case schedule
    case polls
    case tournaments

    // Note for non-coders:
    // These labels mirror the web realtime channel groups, so logs/messages are easier
    // to compare between iOS and web when debugging live updates.
    var webRealtimeChannelName: String {
        switch self {
        case .players: return "profiles-realtime"
        case .matches: return "matches-realtime"
        case .schedule: return "availability-poll-days-realtime"
        case .polls: return "availability-polls-realtime"
        case .tournaments: return "mexicana-tournaments-realtime"
        }
    }
}

struct LiveSyncPlan {
    let changedDomains: Set<LiveDataDomain>
    let shouldForceFallbackRefresh: Bool
}

enum LiveSyncChangeDetector {
    static func plan(
        previous: SupabaseRESTClient.GlobalLiveMarker?,
        current: SupabaseRESTClient.GlobalLiveMarker,
        lastFullSyncAt: Date?,
        now: Date,
        fallbackInterval: TimeInterval
    ) -> LiveSyncPlan {
        var changedDomains: Set<LiveDataDomain> = []

        if let previous {
            if previous.playerState != current.playerState { changedDomains.insert(.players) }
            if previous.matchState != current.matchState { changedDomains.insert(.matches) }
            if previous.scheduleState != current.scheduleState { changedDomains.insert(.schedule) }
            if previous.pollState != current.pollState { changedDomains.insert(.polls) }
            if previous.tournamentState != current.tournamentState { changedDomains.insert(.tournaments) }
        }

        let shouldForceFallbackRefresh: Bool
        if let lastFullSyncAt {
            shouldForceFallbackRefresh = now.timeIntervalSince(lastFullSyncAt) >= fallbackInterval
        } else {
            shouldForceFallbackRefresh = true
        }

        return LiveSyncPlan(
            changedDomains: changedDomains,
            shouldForceFallbackRefresh: shouldForceFallbackRefresh
        )
    }
}
