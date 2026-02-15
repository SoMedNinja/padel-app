import SwiftUI

/// Note for non-coders:
/// These are "semantic" colors. Instead of hardcoding random color values,
/// we use names that describe meaning (brand, success, warning, etc.).
/// The values come from shared DesignTokens so web and iOS match from one source.
enum AppColors {
    // Brand Colors
    static let brandPrimary = Color.adaptive(lightHex: DesignTokens.Colors.lightPrimary, darkHex: DesignTokens.Colors.darkPrimary)
    static let brandDark = Color.adaptive(lightHex: DesignTokens.Colors.lightPrimaryStrong, darkHex: DesignTokens.Colors.darkPrimaryStrong)
    static let secondary = Color.adaptive(lightHex: DesignTokens.Colors.lightSecondary, darkHex: DesignTokens.Colors.darkSecondary)

    // Semantic Status
    static let success = Color.adaptive(lightHex: DesignTokens.Colors.lightSuccess, darkHex: DesignTokens.Colors.darkSuccess)
    static let warning = Color.adaptive(lightHex: DesignTokens.Colors.lightWarning, darkHex: DesignTokens.Colors.darkWarning)
    static let error = Color.adaptive(lightHex: DesignTokens.Colors.lightPrimary, darkHex: DesignTokens.Colors.darkPrimary)
    static let info = Color.adaptive(lightHex: DesignTokens.Colors.lightInfo, darkHex: DesignTokens.Colors.darkInfo)

    // Backgrounds & Surfaces
    static let background = Color.adaptive(lightHex: DesignTokens.Colors.lightBackground, darkHex: DesignTokens.Colors.darkBackground)
    static let surface = Color.adaptive(lightHex: DesignTokens.Colors.lightSurface, darkHex: DesignTokens.Colors.darkSurface)
    static let surfaceMuted = Color.adaptive(lightHex: DesignTokens.Colors.lightSurfaceMuted, darkHex: DesignTokens.Colors.darkSurfaceMuted)

    // Text
    static let textPrimary = Color.adaptive(lightHex: DesignTokens.Colors.lightTextPrimary, darkHex: DesignTokens.Colors.darkTextPrimary)
    static let textSecondary = Color.adaptive(lightHex: DesignTokens.Colors.lightTextSecondary, darkHex: DesignTokens.Colors.darkTextSecondary)

    // Borders and Highlights
    static let borderSubtle = Color.adaptive(lightHex: DesignTokens.Colors.lightBorderSubtle, darkHex: DesignTokens.Colors.darkBorderSubtle)
    static let borderStrong = Color.adaptive(lightHex: DesignTokens.Colors.lightBorderStrong, darkHex: DesignTokens.Colors.darkBorderStrong)
    static let highlight = Color.adaptive(lightHex: DesignTokens.Colors.lightHighlight, darkHex: DesignTokens.Colors.darkHighlight)

    // Spacing and corners
    static let spacingSmall = DesignTokens.Spacing.sm
    static let spacingMedium = DesignTokens.Spacing.md
    static let spacingLarge = DesignTokens.Spacing.lg
    static let radiusMedium = DesignTokens.Radius.md
    static let radiusLarge = DesignTokens.Radius.xl

    // Shadows (Note for non-coders: PWA shadows expressed as opacity)
    static let shadowColor = Color.black.opacity(0.08)
}
