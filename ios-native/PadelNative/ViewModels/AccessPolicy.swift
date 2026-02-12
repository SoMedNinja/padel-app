import Foundation

// Note for non-coders:
// This keeps role rules in one place. Both iOS screens and actions ask this policy
// instead of duplicating "who can do what" checks all over the app.
struct AccessPolicy {
    let isAuthenticated: Bool
    let isGuest: Bool
    let profile: Player?

    var canSeeSchedule: Bool {
        guard isAuthenticated, let profile else { return false }
        return profile.isRegular
    }

    var canUseAdmin: Bool {
        guard isAuthenticated, let profile else { return false }
        return profile.isAdmin
    }

    // Note for non-coders:
    // Guest mode is intentionally read-only and limited, mirroring the web app behavior.
    var canSeeTournament: Bool { isAuthenticated && !isGuest }
    var canUseSingleGame: Bool { isAuthenticated && !isGuest }
    var canCreateMatches: Bool { isAuthenticated && !isGuest && canUseSingleGame }
    var canMutateTournament: Bool { isAuthenticated && !isGuest }

    func canDeleteMatch(createdBy: UUID?, currentPlayerId: UUID?) -> Bool {
        guard isAuthenticated, !isGuest else { return false }
        if canUseAdmin { return true }
        guard let currentPlayerId else { return false }
        return createdBy == currentPlayerId
    }
}
