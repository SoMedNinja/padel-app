import SwiftUI

/// Note for non-coders:
/// This is a reusable loading "skeleton" card. We show these fake shapes while data is loading,
/// so the screen keeps its final layout and avoids jumpy visual changes.
struct SkeletonCardView<Content: View>: View {
    let isActive: Bool
    let cornerRadius: CGFloat
    @ViewBuilder let content: Content

    init(
        isActive: Bool = true,
        cornerRadius: CGFloat = 14,
        @ViewBuilder content: () -> Content
    ) {
        self.isActive = isActive
        self.cornerRadius = cornerRadius
        self.content = content()
    }

    var body: some View {
        content
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(AppColors.surface)
            .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .stroke(AppColors.borderSubtle, lineWidth: 1)
            )
            .modifier(SkeletonShimmerModifier(isActive: isActive, cornerRadius: cornerRadius))
    }
}

/// Note for non-coders:
/// A single gray placeholder bar used inside skeleton cards.
struct SkeletonBlock: View {
    let height: CGFloat
    let width: CGFloat?

    init(height: CGFloat, width: CGFloat? = nil) {
        self.height = height
        self.width = width
    }

    var body: some View {
        RoundedRectangle(cornerRadius: 8, style: .continuous)
            .fill(AppColors.background)
            .frame(width: width, height: height)
    }
}

private struct SkeletonShimmerModifier: ViewModifier {
    let isActive: Bool
    let cornerRadius: CGFloat

    @State private var shimmerOffset: CGFloat = -1
    @State private var isPulseBright = false

    func body(content: Content) -> some View {
        content
            .opacity(isActive ? (isPulseBright ? 0.94 : 0.82) : 1)
            .overlay {
                if isActive {
                    GeometryReader { proxy in
                        LinearGradient(
                            colors: [Color.clear, Color.white.opacity(0.32), Color.clear],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                        .frame(width: proxy.size.width * 0.45)
                        .offset(x: shimmerOffset * proxy.size.width)
                        .blendMode(.screen)
                    }
                    .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
                    .allowsHitTesting(false)
                }
            }
            .onAppear {
                guard isActive else { return }
                withAnimation(.easeInOut(duration: 1.35).repeatForever(autoreverses: true)) {
                    isPulseBright.toggle()
                }
                withAnimation(.linear(duration: 1.45).repeatForever(autoreverses: false)) {
                    shimmerOffset = 1.3
                }
            }
    }
}
