import SwiftUI

struct PadelRefreshHeader: View {
    let isRefreshing: Bool
    var pullProgress: CGFloat = 0

    var body: some View {
        Group {
            if isRefreshing || pullProgress > 0 {
                BallRefreshIndicator(isRefreshing: isRefreshing, progress: pullProgress)
                    .padding(.vertical, 12)
                    .opacity(isRefreshing ? 1.0 : min(1.0, pullProgress * 1.5))
                    .scaleEffect(isRefreshing ? 1.0 : 0.8 + (0.2 * pullProgress))
                    .transition(.opacity.combined(with: .offset(y: -10)))
            }
        }
        .animation(.spring(duration: 0.3), value: isRefreshing)
    }
}
