import SwiftUI

extension View {
    /// Note for non-coders: this helper applies Apple's translucent "glass" look
    /// to navigation and tab bars so screens feel modern on newer iOS versions,
    /// while still behaving correctly on older iOS versions.
    @ViewBuilder
    func padelLiquidGlassChrome() -> some View {
        // Note for non-coders:
        // We intentionally DO NOT hide the navigation bar globally anymore.
        // Keeping it available lets iOS preserve its built-in "swipe from the left edge to go back"
        // behavior on every pushed subpage (for example, Match History -> Match Details).
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

    /// Note for non-coders: This adds a translucent "glass" card effect,
    /// used to give the UI more depth and modern feel while matching the PWA's card layout.
    func padelGlassCard(radius: CGFloat = 14) -> some View {
        self
            .background(.ultraThinMaterial)
            .clipShape(RoundedRectangle(cornerRadius: radius, style: .continuous))
            .shadow(color: AppColors.shadowColor, radius: 8, x: 0, y: 4)
    }

    /// Note for non-coders: Standard PWA card style with white background and soft shadow.
    func padelSurfaceCard(radius: CGFloat = 14) -> some View {
        self
            .background(AppColors.surface)
            .clipShape(RoundedRectangle(cornerRadius: radius, style: .continuous))
            .shadow(color: AppColors.shadowColor, radius: 10, x: 0, y: 5)
            .overlay(
                RoundedRectangle(cornerRadius: radius, style: .continuous)
                    .stroke(AppColors.borderSubtle, lineWidth: 1)
            )
    }
}
