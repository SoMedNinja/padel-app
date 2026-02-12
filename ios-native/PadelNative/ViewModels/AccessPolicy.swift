import Foundation

// Note for non-coders:
// This keeps role rules in one place. Both iOS screens and actions ask this policy
// instead of duplicating "who can do what" checks all over the app.
struct AccessPolicy {
    let isAuthenticated: Bool
    let profile: Player?

    var canSeeSchedule: Bool {
        guard isAuthenticated, let profile else { return false }
        return profile.isRegular
    }

    var canUseAdmin: Bool {
        guard isAuthenticated, let profile else { return false }
        return profile.isAdmin
    }

    var canSeeTournament: Bool { isAuthenticated }
    var canUseSingleGame: Bool { isAuthenticated }
    var canCreateMatches: Bool { isAuthenticated && canUseSingleGame }
    var canMutateTournament: Bool { isAuthenticated }

    func canDeleteMatch(createdBy: UUID?, currentPlayerId: UUID?) -> Bool {
        guard isAuthenticated else { return false }
        if canUseAdmin { return true }
        guard let currentPlayerId else { return false }
        return createdBy == currentPlayerId
    }
}
