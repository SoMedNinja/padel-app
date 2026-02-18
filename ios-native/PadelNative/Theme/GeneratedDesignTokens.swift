// AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY.
// Note for non-coders: iOS reads shared design tokens from this generated file.

import SwiftUI

enum DesignTokens {

    struct ShadowToken {
        let x: CGFloat
        let y: CGFloat
        let blur: CGFloat
        let spread: CGFloat
        let color: String
        let opacity: Double
    }

    enum Colors {
        static let lightBackground = "#f6f7fb"
        static let lightBorderStrong = "#f0b7b7"
        static let lightBorderSubtle = "#ececec"
        static let lightError = "#d32f2f"
        static let lightHighlight = "#fff5f5"
        static let lightInfo = "#0288d1"
        static let lightOnPrimary = "#ffffff"
        static let lightPrimary = "#d32f2f"
        static let lightPrimaryStrong = "#b71c1c"
        static let lightSecondary = "#ff8f00"
        static let lightSuccess = "#2e7d32"
        static let lightSurface = "#ffffff"
        static let lightSurfaceMuted = "#f6f7fb"
        static let lightTextPrimary = "#1f1f1f"
        static let lightTextSecondary = "#6d6d6d"
        static let lightWarning = "#ed6c02"
        static let darkBackground = "#121417"
        static let darkBorderStrong = "#6b4242"
        static let darkBorderSubtle = "#32353a"
        static let darkError = "#ef5350"
        static let darkHighlight = "#2c2020"
        static let darkInfo = "#4fc3f7"
        static let darkOnPrimary = "#140102"
        static let darkPrimary = "#ef5350"
        static let darkPrimaryStrong = "#e53935"
        static let darkSecondary = "#ffb74d"
        static let darkSuccess = "#66bb6a"
        static let darkSurface = "#1e1e1e"
        static let darkSurfaceMuted = "#26282c"
        static let darkTextPrimary = "#f5f5f5"
        static let darkTextSecondary = "#b0b4ba"
        static let darkWarning = "#ffb74d"
    }

    enum Spacing {
        static let lg: CGFloat = 16
        static let md: CGFloat = 12
        static let sm: CGFloat = 8
        static let xl: CGFloat = 24
        static let xs: CGFloat = 4
        static let xxl: CGFloat = 32
    }

    enum Radius {
        static let lg: CGFloat = 12
        static let md: CGFloat = 10
        static let pill: CGFloat = 999
        static let sm: CGFloat = 8
        static let xl: CGFloat = 14
    }

    enum Typography {
        static let body: CGFloat = 14
        static let bodyLarge: CGFloat = 16
        static let caption: CGFloat = 12
        static let display: CGFloat = 32
        static let section: CGFloat = 20
        static let title: CGFloat = 24
    }

    enum Elevation {
        static let card = ShadowToken(x: 0, y: 8, blur: 18, spread: 0, color: "#000000", opacity: 0.08)
        static let soft = ShadowToken(x: 0, y: 10, blur: 30, spread: 0, color: "#111827", opacity: 0.08)
    }

    enum Motion {
        static let durationFast: Double = 100
        static let durationNormal: Double = 200
        static let durationSlow: Double = 300
        static let easingDefault: [Double] = [0.4, 0, 0.2, 1]
        static let easingIn: [Double] = [0.4, 0, 1, 1]
        static let easingOut: [Double] = [0, 0, 0.2, 1]
        static let easingSpring: [Double] = [0.175, 0.885, 0.32, 1.275]
    }

    enum Components {
        enum Card {
            static let elevation = "card"
            static let padding: CGFloat = 24
            static let radius: CGFloat = 14
        }
        enum Chip {
            static let fontWeight = "bold"
            static let height: CGFloat = 32
            static let radius: CGFloat = 999
        }
        enum EmptyState {
            static let iconSize: CGFloat = 48
            static let spacing: CGFloat = 12
            static let titleSize: CGFloat = 20
        }
        enum Input {
            static let height: CGFloat = 48
            static let radius: CGFloat = 12
        }
        enum Tab {
            static let activeWeight = "bold"
            static let indicatorHeight: CGFloat = 2
        }
    }
}
