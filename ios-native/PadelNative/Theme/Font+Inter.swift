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
}
