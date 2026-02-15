import XCTest

final class PadelNativeUITests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    func testLoginSessionRecoveryFallbackScenario() {
        let app = XCUIApplication()
        app.launchArguments += ["UI_TEST_MODE"]
        app.launchEnvironment["UI_TEST_SCENARIO"] = "session-recovery-failed"
        app.launch()

        XCTAssertTrue(app.staticTexts["We could not restore your session"].waitForExistence(timeout: 2))
        XCTAssertTrue(app.buttons["Try again"].exists)
    }

    func testCreateEditDeleteMatchFlowEntryPoints() {
        let app = XCUIApplication()
        app.launchArguments += ["UI_TEST_MODE"]
        app.launch()

        // Note for non-coders:
        // This confirms the Match tab entry is present in our deterministic guest session.
        // Full create/edit/delete interactions are covered by integration tests against backend APIs.
        XCTAssertTrue(app.tabBars.buttons["Match"].waitForExistence(timeout: 2))
    }

    func testScheduleVotingAndReminderEntryPoints() {
        let app = XCUIApplication()
        app.launchArguments += ["UI_TEST_MODE"]
        app.launchEnvironment["UI_TEST_DEEP_LINK"] = "padelnative://schedule"
        app.launch()

        XCTAssertTrue(app.tabBars.buttons["Schema"].waitForExistence(timeout: 2))
    }

    func testDeepLinkOpensSingleGameTab() {
        let app = XCUIApplication()
        app.launchArguments += ["UI_TEST_MODE"]
        app.launchEnvironment["UI_TEST_DEEP_LINK"] = "padelnative://single-game?mode=americano"
        app.launch()

        XCTAssertTrue(app.tabBars.buttons["Match"].waitForExistence(timeout: 2))
        XCTAssertTrue(app.tabBars.buttons["Match"].isSelected)
    }
}
