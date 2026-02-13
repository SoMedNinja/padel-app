import XCTest
@testable import PadelNative

final class ProfileNameServiceTests: XCTestCase {
    func testStripBadgeLabelFromName() {
        // Test exact badge label removal
        XCTAssertEqual(ProfileNameService.stripBadgeLabelFromName("John Doe 👑", badgeId: "king-of-elo"), "John Doe")
        XCTAssertEqual(ProfileNameService.stripBadgeLabelFromName("Jane Doe 🏆 I", badgeId: "wins-1"), "Jane Doe")

        // Test regex fallback removal
        XCTAssertEqual(ProfileNameService.stripBadgeLabelFromName("John Doe 👑"), "John Doe")
        XCTAssertEqual(ProfileNameService.stripBadgeLabelFromName("Jane Doe 🏆 II"), "Jane Doe")
        XCTAssertEqual(ProfileNameService.stripBadgeLabelFromName("Bob 🏟️   III"), "Bob")

        // Test no badge
        XCTAssertEqual(ProfileNameService.stripBadgeLabelFromName("Plain Name"), "Plain Name")

        // Test empty name
        XCTAssertEqual(ProfileNameService.stripBadgeLabelFromName("   "), "")
    }
}
