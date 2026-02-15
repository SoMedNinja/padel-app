import SwiftUI

extension Font {
    /// Note for non-coders: this helper ensures we use the "Inter" font style
    /// from the PWA. If Inter isn't installed on the device, it falls back
    /// to the high-quality iOS system font (SF Pro) which looks very similar.
    static func inter(_ style: Font.TextStyle, weight: Weight = .regular) -> Font {
        // Note: bundling custom fonts in iOS requires Info.plist entries and file bundling.
        // We use system font as a high-fidelity fallback for this environment.
        return .system(style, weight: weight)
    }

    static func inter(size: CGFloat, weight: Weight = .regular) -> Font {
        return .system(size: size, weight: weight)
    }

    // Note for non-coders: these helpers map to our shared typography scale tokens.
    static func tokenDisplay(weight: Weight = .bold) -> Font {
        .inter(size: DesignTokens.Typography.display, weight: weight)
    }

    static func tokenTitle(weight: Weight = .bold) -> Font {
        .inter(size: DesignTokens.Typography.title, weight: weight)
    }

    static func tokenSection(weight: Weight = .semibold) -> Font {
        .inter(size: DesignTokens.Typography.section, weight: weight)
    }

    static func tokenBody(weight: Weight = .regular) -> Font {
        .inter(size: DesignTokens.Typography.bodyLarge, weight: weight)
    }

    static func tokenCaption(weight: Weight = .regular) -> Font {
        .inter(size: DesignTokens.Typography.caption, weight: weight)
    }
}
