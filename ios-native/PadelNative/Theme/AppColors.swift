import SwiftUI

/// Note for non-coders:
/// These are "semantic" colors. Instead of hardcoding random color values,
/// we use names that describe meaning (brand, success, warning, etc.).
/// That keeps the app visually consistent and easier to update later.
enum AppColors {
    static let brandPrimary = Color.accentColor
    static let success = Color.green
    static let warning = Color.orange
    static let surfaceMuted = Color(.secondarySystemBackground)
    static let borderSubtle = Color(.separator).opacity(0.25)
    static let textSecondary = Color.secondary
}

