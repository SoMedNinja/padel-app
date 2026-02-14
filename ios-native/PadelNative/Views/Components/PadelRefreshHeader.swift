import SwiftUI

struct PadelRefreshHeader: View {
    let isRefreshing: Bool

    var body: some View {
        Group {
            if isRefreshing {
                BallRefreshIndicator()
                    .padding(.vertical, 12)
                    .transition(.move(edge: .top).combined(with: .opacity))
            }
        }
        .animation(.default, value: isRefreshing)
    }
}
