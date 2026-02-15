import SwiftUI

/// Note for non-coders:
/// These are "semantic" colors. Instead of hardcoding random color values,
/// we use names that describe meaning (brand, success, warning, etc.).
/// The values come from shared DesignTokens so web and iOS match from one source.
enum AppColors {
    // Brand Colors
    static let brandPrimary = Color(hex: DesignTokens.Colors.primary)
    static let brandDark = Color(hex: DesignTokens.Colors.primaryStrong)
    static let secondary = Color(hex: DesignTokens.Colors.secondary)

    // Semantic Status
    static let success = Color(hex: DesignTokens.Colors.success)
    static let warning = Color(hex: DesignTokens.Colors.warning)
    static let error = Color(hex: DesignTokens.Colors.primary)
    static let info = Color(hex: DesignTokens.Colors.info)

    // Backgrounds & Surfaces
    static let background = Color(hex: DesignTokens.Colors.background)
    static let surface = Color(hex: DesignTokens.Colors.surface)
    static let surfaceMuted = Color(hex: DesignTokens.Colors.surfaceMuted)

    // Text
    static let textPrimary = Color(hex: DesignTokens.Colors.textPrimary)
    static let textSecondary = Color(hex: DesignTokens.Colors.textSecondary)

    // Borders and Highlights
    static let borderSubtle = Color(hex: DesignTokens.Colors.borderSubtle)
    static let borderStrong = Color(hex: DesignTokens.Colors.borderStrong)
    static let highlight = Color(hex: DesignTokens.Colors.highlight)

    // Spacing and corners
    static let spacingSmall = DesignTokens.Spacing.sm
    static let spacingMedium = DesignTokens.Spacing.md
    static let spacingLarge = DesignTokens.Spacing.lg
    static let radiusMedium = DesignTokens.Radius.md
    static let radiusLarge = DesignTokens.Radius.xl

    // Shadows (Note for non-coders: PWA shadows expressed as opacity)
    static let shadowColor = Color.black.opacity(0.08)
}
