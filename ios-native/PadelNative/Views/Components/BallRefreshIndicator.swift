import SwiftUI

struct BallRefreshIndicator: View {
    var isRefreshing: Bool = true
    var progress: CGFloat = 1.0
    @State private var animationPhase = false

    private let ballCount = 4

    var body: some View {
        VStack(spacing: 8) {
            HStack(spacing: 8) {
                ForEach(0..<ballCount, id: \.self) { index in
                    ZStack(alignment: .bottom) {
                        Circle()
                            .fill(AppColors.brandPrimary)
                            .frame(width: 18, height: 18)
                            .offset(y: verticalOffset(for: index))
                            .animation(
                                isRefreshing
                                    ? .easeInOut(duration: 0.8)
                                        .repeatForever(autoreverses: true)
                                        .delay(Double(index) * 0.12)
                                    : .spring(duration: 0.28),
                                value: animationPhase
                            )

                        Circle()
                            .fill(AppColors.shadowColor.opacity(0.35))
                            .frame(width: 16, height: 4)
                            .scaleEffect(shadowScale(for: index))
                            .opacity(shadowOpacity(for: index))
                            .offset(y: 12)
                            .animation(
                                isRefreshing
                                    ? .easeInOut(duration: 0.8)
                                        .repeatForever(autoreverses: true)
                                        .delay(Double(index) * 0.12)
                                    : .spring(duration: 0.28),
                                value: animationPhase
                            )
                    }
                    .frame(width: 22, height: 34)
                }
            }

            Text(isRefreshing ? "Padelbollarna studsar medan vi laddar..." : (progress > 0.9 ? "Släpp för att uppdatera" : "Dra för att ladda senaste padelnytt..."))
                .font(.inter(.caption, weight: .bold))
                .foregroundStyle(AppColors.textSecondary)
                .multilineTextAlignment(.center)
                .opacity(isRefreshing ? 1.0 : max(0.1, (progress - 0.2) / 0.8))
        }
        .padding(.vertical, 2)
        .onAppear {
            if isRefreshing { animationPhase.toggle() }
        }
        .onChange(of: isRefreshing) { _, newValue in
            // Note for non-coders: we flip this flag to start/stop the endless bounce loop at the right moment.
            if newValue {
                animationPhase.toggle()
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(isRefreshing ? "Uppdaterar innehåll" : "Dra för att uppdatera")
    }

    private func verticalOffset(for index: Int) -> CGFloat {
        if isRefreshing {
            return animationPhase ? -10 : 0
        }

        // Note for non-coders: while pulling down (before release), each ball rises a bit to preview the refresh animation.
        let base = (1 - progress) * 10
        let stagger = CGFloat(index) * 1.5
        return max(0, base - stagger)
    }

    private func shadowScale(for index: Int) -> CGFloat {
        if isRefreshing {
            return animationPhase ? 0.65 : 1.0
        }

        return max(0.55, 1.0 - (progress * 0.45) - (CGFloat(index) * 0.03))
    }

    private func shadowOpacity(for index: Int) -> CGFloat {
        if isRefreshing {
            return animationPhase ? 0.12 : 0.3
        }

        return max(0.08, 0.3 - (progress * 0.2) - (CGFloat(index) * 0.01))
    }
}
