import SwiftUI

// Note for non-coders: this shared config keeps pull-to-refresh timing and pull distance consistent across iOS screens.
enum PullToRefreshBehavior {
    static let triggerThreshold: CGFloat = 72
    static let minimumRefreshDurationNanoseconds: UInt64 = 900_000_000

    static func progress(for offset: CGFloat) -> CGFloat {
        let normalized = max(0, min(1.0, offset / triggerThreshold))

        // Note for non-coders: this small curve makes the pull feel less "stiff" near the start, closer to the web app feel.
        return pow(normalized, 0.9)
    }

    static func performRefresh(
        isPullRefreshing: Binding<Bool>,
        action: @escaping () async -> Void
    ) async {
        let startedAt = DispatchTime.now().uptimeNanoseconds
        isPullRefreshing.wrappedValue = true

        await action()

        let elapsedNanoseconds = DispatchTime.now().uptimeNanoseconds - startedAt

        if elapsedNanoseconds < minimumRefreshDurationNanoseconds {
            let remaining = minimumRefreshDurationNanoseconds - elapsedNanoseconds
            do {
                try await Task.sleep(nanoseconds: remaining)
            } catch {
                // Note for non-coders: cancellation here is normal when users leave the screen mid-refresh.
            }
        }

        isPullRefreshing.wrappedValue = false
    }
}

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
