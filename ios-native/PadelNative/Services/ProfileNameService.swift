import Foundation

enum ProfileNameService {
    // Note for non-coders: this regex removes any badge tag (emoji + optional Roman tier) at the end of a name.
    // It matches whitespace, then an emoji, then optional whitespace and Roman numerals until the end of the string.
    private static let badgeTrailingPattern = try! NSRegularExpression(
        pattern: "\\s*[\\p{Extended_Pictographic}](\\s*[IVX]+)?$",
        options: []
    )

    static func stripBadgeLabelFromName(_ name: String, badgeId: String? = nil) -> String {
        let trimmedName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmedName.isEmpty { return "" }

        let badgeLabel = BadgeService.getBadgeLabelById(badgeId)
        var normalizedName = trimmedName

        if !badgeLabel.isEmpty && trimmedName.hasSuffix(badgeLabel) {
            let endIndex = trimmedName.index(trimmedName.endIndex, offsetBy: -badgeLabel.count)
            normalizedName = String(trimmedName[..<endIndex]).trimmingCharacters(in: .whitespacesAndNewlines)
        }

        let range = NSRange(location: 0, length: normalizedName.utf16.count)
        normalizedName = badgeTrailingPattern.stringByReplacingMatches(
            in: normalizedName,
            options: [],
            range: range,
            withTemplate: ""
        ).trimmingCharacters(in: .whitespacesAndNewlines)

        return normalizedName
    }
}
