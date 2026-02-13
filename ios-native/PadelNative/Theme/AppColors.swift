import SwiftUI

/// Note for non-coders:
/// These are "semantic" colors. Instead of hardcoding random color values,
/// we use names that describe meaning (brand, success, warning, etc.).
/// That keeps the app visually consistent and easier to update later.
enum AppColors {
    // Brand Colors
    static let brandPrimary = Color(hex: "#d32f2f")
    static let brandDark = Color(hex: "#b71c1c")
    static let secondary = Color(hex: "#ff8f00")

    // Semantic Status
    static let success = Color(hex: "#2e7d32")
    static let warning = Color(hex: "#ed6c02")
    static let error = Color(hex: "#d32f2f")
    static let info = Color(hex: "#0288d1")

    // Backgrounds & Surfaces
    static let background = Color(hex: "#f6f7fb")
    static let surface = Color(hex: "#ffffff")
    static let surfaceMuted = Color(hex: "#f6f7fb")

    // Text
    static let textPrimary = Color(hex: "#1f1f1f")
    static let textSecondary = Color(hex: "#6d6d6d")

    // Borders and Highlights
    static let borderSubtle = Color(hex: "#ececec")
    static let borderStrong = Color(hex: "#f0b7b7")
    static let highlight = Color(hex: "#fff5f5")

    // Shadows (Note for non-coders: PWA shadows expressed as opacity)
    static let shadowColor = Color.black.opacity(0.08)
}
