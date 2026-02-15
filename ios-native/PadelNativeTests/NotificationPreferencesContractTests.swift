import XCTest
@testable import PadelNative

final class NotificationPreferencesContractTests: XCTestCase {
    func testDecodeMissingKeysUsesMigrationSafeDefaults() throws {
        let oldRow = """
        {
          "eventToggles": {
            "scheduled_match_new": false
          }
        }
        """.data(using: .utf8)!

        let decoded = try JSONDecoder().decode(NotificationPreferences.self, from: oldRow)

        XCTAssertEqual(decoded.enabled, true)
        XCTAssertEqual(decoded.eventToggles[NotificationEventType.scheduledMatchNew.rawValue], false)
        XCTAssertEqual(decoded.eventToggles[NotificationEventType.availabilityPollReminder.rawValue], true)
        XCTAssertEqual(decoded.eventToggles[NotificationEventType.adminAnnouncement.rawValue], true)
        XCTAssertEqual(decoded.quietHours.enabled, false)
        XCTAssertEqual(decoded.quietHours.startHour, 22)
        XCTAssertEqual(decoded.quietHours.endHour, 7)
    }

    func testNormalizedPayloadUsesSharedCanonicalJSONShape() throws {
        let normalized = NotificationPreferences(
            enabled: false,
            eventToggles: [NotificationEventType.scheduledMatchNew.rawValue: false],
            quietHours: NotificationQuietHours(enabled: true, startHour: 21, endHour: 6)
        ).normalizedForPersistence()

        XCTAssertEqual(Set(normalized.eventToggles.keys), Set([
            NotificationEventType.scheduledMatchNew.rawValue,
            NotificationEventType.availabilityPollReminder.rawValue,
            NotificationEventType.adminAnnouncement.rawValue,
        ]))

        let data = try JSONEncoder().encode(normalized)
        let object = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
        XCTAssertEqual(Set(object.keys), Set(["enabled", "eventToggles", "quietHours"]))
    }
}
