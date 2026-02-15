import EventKit
import Foundation

struct CalendarService {
    private let store = EKEventStore()

    func currentAuthorizationStatus() -> EKAuthorizationStatus {
        EKEventStore.authorizationStatus(for: .event)
    }

    // Note for non-coders:
    // EventKit is Apple's calendar API. We ask permission before writing to your calendar.
    func requestAccessIfNeeded() async throws -> Bool {
        try await store.requestFullAccessToEvents()
    }

    func upsertLocalEvent(title: String, date: Date, startTime: Date, endTime: Date, location: String?) async throws {
        _ = try await requestAccessIfNeeded()

        let event = EKEvent(eventStore: store)
        event.title = title
        event.startDate = combine(date: date, time: startTime)
        event.endDate = combine(date: date, time: endTime)
        event.location = location
        event.notes = "PadelNative skapade denna lokala kalenderpost som en snabb iOS-genväg."
        event.calendar = store.defaultCalendarForNewEvents

        try store.save(event, span: .thisEvent)
    }

    private func combine(date: Date, time: Date) -> Date {
        let calendar = Calendar.current
        let day = calendar.dateComponents([.year, .month, .day], from: date)
        let clock = calendar.dateComponents([.hour, .minute], from: time)
        var combined = DateComponents()
        combined.year = day.year
        combined.month = day.month
        combined.day = day.day
        combined.hour = clock.hour
        combined.minute = clock.minute
        return calendar.date(from: combined) ?? date
    }
}
