import XCTest
@testable import PadelNative

final class LiveSyncChangeDetectorTests: XCTestCase {
    func testDetectsChangedDomainsFromMarkers() {
        let old = SupabaseRESTClient.GlobalLiveMarker(
            playerState: "p1",
            matchState: "m1",
            scheduleState: "s1",
            pollState: "poll1",
            tournamentState: .init(tournamentState: "t1", latestRoundState: "r1", latestResultState: "res1")
        )

        let new = SupabaseRESTClient.GlobalLiveMarker(
            playerState: "p2",
            matchState: "m1",
            scheduleState: "s2",
            pollState: "poll1",
            tournamentState: .init(tournamentState: "t2", latestRoundState: "r1", latestResultState: "res1")
        )

        let plan = LiveSyncChangeDetector.plan(
            previous: old,
            current: new,
            lastFullSyncAt: Date(),
            now: Date(),
            fallbackInterval: 999
        )

        XCTAssertTrue(plan.changedDomains.contains(.players))
        XCTAssertTrue(plan.changedDomains.contains(.schedule))
        XCTAssertTrue(plan.changedDomains.contains(.tournaments))
        XCTAssertFalse(plan.changedDomains.contains(.matches))
        XCTAssertFalse(plan.changedDomains.contains(.polls))
    }

    func testForcesFallbackWhenNoPreviousSyncTime() {
        let marker = SupabaseRESTClient.GlobalLiveMarker(
            playerState: "p1",
            matchState: "m1",
            scheduleState: "s1",
            pollState: "poll1",
            tournamentState: .init(tournamentState: "t1", latestRoundState: "r1", latestResultState: "res1")
        )

        let plan = LiveSyncChangeDetector.plan(
            previous: nil,
            current: marker,
            lastFullSyncAt: nil,
            now: Date(),
            fallbackInterval: 60
        )

        XCTAssertTrue(plan.changedDomains.isEmpty)
        XCTAssertTrue(plan.shouldForceFallbackRefresh)
    }
}
