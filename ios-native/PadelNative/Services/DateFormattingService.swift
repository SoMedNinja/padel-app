import Foundation

struct DateFormattingService {
    // Note for non-coders:
    // DateFormatter is expensive to create over and over. We keep one shared helper
    // so every screen formats dates the same way and performance stays stable.
    static let shared = DateFormattingService()

    private let scheduleTimestampFormatter: DateFormatter
    private let shortTimeFormatter: DateFormatter
    private let historyDateFormatter: DateFormatter
    private let scheduleDateLabelFormatter: DateFormatter
    private let inviteDateISOFormatter: DateFormatter
    private let inviteTimeFormatter: DateFormatter
    private let dayParserFormatter: DateFormatter

    init(locale: Locale = AppConfig.swedishLocale) {
        scheduleTimestampFormatter = DateFormatter()
        scheduleTimestampFormatter.locale = locale
        scheduleTimestampFormatter.setLocalizedDateFormatFromTemplate("EEEE d MMM yyyy HH:mm")

        shortTimeFormatter = DateFormatter()
        shortTimeFormatter.locale = locale
        shortTimeFormatter.timeStyle = .short
        shortTimeFormatter.dateStyle = .none

        historyDateFormatter = DateFormatter()
        historyDateFormatter.locale = locale
        historyDateFormatter.dateStyle = .medium
        historyDateFormatter.timeStyle = .short

        scheduleDateLabelFormatter = DateFormatter()
        scheduleDateLabelFormatter.locale = locale
        scheduleDateLabelFormatter.setLocalizedDateFormatFromTemplate("EEEE d MMM yyyy")

        // Note for non-coders:
        // These two formatters create backend-safe strings. We use the strict POSIX locale
        // so a Swedish phone and an English phone send the exact same API format.
        inviteDateISOFormatter = DateFormatter()
        inviteDateISOFormatter.calendar = Calendar(identifier: .iso8601)
        inviteDateISOFormatter.locale = Locale(identifier: "en_US_POSIX")
        inviteDateISOFormatter.timeZone = .current
        inviteDateISOFormatter.dateFormat = "yyyy-MM-dd"

        inviteTimeFormatter = DateFormatter()
        inviteTimeFormatter.calendar = Calendar(identifier: .iso8601)
        inviteTimeFormatter.locale = Locale(identifier: "en_US_POSIX")
        inviteTimeFormatter.timeZone = .current
        inviteTimeFormatter.dateFormat = "HH:mm"

        dayParserFormatter = DateFormatter()
        dayParserFormatter.calendar = Calendar(identifier: .gregorian)
        dayParserFormatter.locale = Locale(identifier: "en_US_POSIX")
        dayParserFormatter.timeZone = .current
        dayParserFormatter.dateFormat = "yyyy-MM-dd"
    }

    func fullScheduleTimestamp(_ date: Date) -> String {
        scheduleTimestampFormatter.string(from: date)
    }

    func shortTime(_ date: Date) -> String {
        shortTimeFormatter.string(from: date)
    }

    func historyDateLabel(_ date: Date) -> String {
        if let relative = relativeDayLabel(for: date) {
            return "\(relative) \(shortTime(date))"
        }
        return historyDateFormatter.string(from: date)
    }

    func relativeDayLabel(for date: Date, now: Date = .now, calendar: Calendar = .current) -> String? {
        if calendar.isDate(date, inSameDayAs: now) {
            return "Idag"
        }
        if let tomorrow = calendar.date(byAdding: .day, value: 1, to: now),
           calendar.isDate(date, inSameDayAs: tomorrow) {
            return "Imorgon"
        }
        return nil
    }

    func scheduleDayLabel(fromISODate rawDate: String) -> String {
        guard let date = dayParserFormatter.date(from: rawDate) else { return rawDate }
        return scheduleDateLabelFormatter.string(from: date)
    }

    func dateFromISODate(_ rawDate: String) -> Date {
        dayParserFormatter.date(from: rawDate) ?? .now
    }

    func inviteDateISO(_ date: Date) -> String {
        inviteDateISOFormatter.string(from: date)
    }

    func inviteTimeISO(_ date: Date) -> String {
        inviteTimeFormatter.string(from: date)
    }
}
