import SwiftUI

struct BallRefreshIndicator: View {
    var isRefreshing: Bool = true
    var progress: CGFloat = 1.0
    @State private var isAnimating = false

    var body: some View {
        HStack(spacing: 10) {
            Circle()
                .fill(AppColors.brandPrimary)
                .frame(width: 12, height: 12)
                .offset(y: isRefreshing && isAnimating ? -5 : (isRefreshing ? 5 : 15 * (1 - progress)))

            Circle()
                .fill(AppColors.brandPrimary.opacity(0.75))
                .frame(width: 10, height: 10)
                .offset(y: isRefreshing && isAnimating ? 5 : (isRefreshing ? -5 : -15 * (1 - progress)))

            Text(isRefreshing ? "Uppdaterar…" : (progress > 0.9 ? "Släpp för att uppdatera" : "Dra för att uppdatera"))
                .font(.inter(.caption, weight: .bold))
                .foregroundStyle(AppColors.textSecondary)
                .opacity(isRefreshing ? 1.0 : max(0, (progress - 0.2) / 0.8))
        }
        // Note for non-coders: this loop makes the circles move up/down like a small bouncing ball indicator.
        .animation(isRefreshing ? .easeInOut(duration: 0.65).repeatForever(autoreverses: true) : .spring(duration: 0.3), value: isAnimating)
        .animation(.spring(duration: 0.3), value: progress)
        .onAppear {
            if isRefreshing { isAnimating = true }
        }
        .onChange(of: isRefreshing) { _, newValue in
            if newValue {
                isAnimating = true
            } else {
                isAnimating = false
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(isRefreshing ? "Uppdaterar innehåll" : "Dra för att uppdatera")
    }
}
