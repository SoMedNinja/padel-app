import SwiftUI

extension View {
    /// Note for non-coders: this helper applies Apple's translucent "glass" look
    /// to navigation and tab bars so screens feel modern on newer iOS versions,
    /// while still behaving correctly on older iOS versions.
    @ViewBuilder
    func padelLiquidGlassChrome() -> some View {
        if #available(iOS 26.0, *) {
            self
                .toolbarBackground(.ultraThinMaterial, for: .navigationBar)
                .toolbarBackground(.visible, for: .navigationBar)
                .toolbarBackground(.ultraThinMaterial, for: .tabBar)
                .toolbarBackground(.visible, for: .tabBar)
        } else {
            self
                .toolbarBackground(.regularMaterial, for: .navigationBar)
                .toolbarBackground(.visible, for: .navigationBar)
                .toolbarBackground(.regularMaterial, for: .tabBar)
                .toolbarBackground(.visible, for: .tabBar)
        }
    }
}
