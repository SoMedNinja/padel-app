import XCTest
@testable import PadelNative

final class AccessPolicyTests: XCTestCase {
    func testScheduleRequiresRegularRole() {
        let regular = Player(id: UUID(), fullName: "A", profileName: "A", elo: 1000, isAdmin: false, isRegular: true)
        let nonRegular = Player(id: UUID(), fullName: "B", profileName: "B", elo: 1000, isAdmin: false, isRegular: false)

        XCTAssertTrue(AccessPolicy(isAuthenticated: true, profile: regular).canSeeSchedule)
        XCTAssertFalse(AccessPolicy(isAuthenticated: true, profile: nonRegular).canSeeSchedule)
        XCTAssertFalse(AccessPolicy(isAuthenticated: false, profile: regular).canSeeSchedule)
    }

    func testDeleteMatchRulesAllowAdminOrCreator() {
        let creatorId = UUID()
        let admin = Player(id: UUID(), fullName: "Admin", profileName: "Admin", elo: 1000, isAdmin: true, isRegular: true)
        let member = Player(id: creatorId, fullName: "Member", profileName: "Member", elo: 1000, isAdmin: false, isRegular: true)

        let adminPolicy = AccessPolicy(isAuthenticated: true, profile: admin)
        XCTAssertTrue(adminPolicy.canDeleteMatch(createdBy: UUID(), currentPlayerId: admin.id))

        let memberPolicy = AccessPolicy(isAuthenticated: true, profile: member)
        XCTAssertTrue(memberPolicy.canDeleteMatch(createdBy: creatorId, currentPlayerId: creatorId))
        XCTAssertFalse(memberPolicy.canDeleteMatch(createdBy: UUID(), currentPlayerId: creatorId))
    }
}
