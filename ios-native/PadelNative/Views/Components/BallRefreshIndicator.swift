import SwiftUI

struct BallRefreshIndicator: View {
    @State private var isAnimating = false

    var body: some View {
        HStack(spacing: 10) {
            Circle()
                .fill(AppColors.brandPrimary)
                .frame(width: 12, height: 12)
                .offset(y: isAnimating ? -5 : 5)

            Circle()
                .fill(AppColors.brandPrimary.opacity(0.75))
                .frame(width: 10, height: 10)
                .offset(y: isAnimating ? 5 : -5)

            Text("Uppdaterar…")
                .font(.inter(.caption, weight: .bold))
                .foregroundStyle(AppColors.textSecondary)
        }
        // Note for non-coders: this loop makes the circles move up/down like a small bouncing ball indicator.
        .animation(.easeInOut(duration: 0.65).repeatForever(autoreverses: true), value: isAnimating)
        .onAppear { isAnimating = true }
        .onDisappear { isAnimating = false }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Uppdaterar innehåll")
    }
}
