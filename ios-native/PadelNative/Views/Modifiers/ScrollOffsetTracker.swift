import SwiftUI

struct ScrollOffsetPreferenceKey: PreferenceKey {
    static var defaultValue: CGFloat = 0
    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) {
        value = nextValue()
    }
}

struct ScrollOffsetTracker: View {
    var body: some View {
        GeometryReader { geo in
            Color.clear
                .preference(key: ScrollOffsetPreferenceKey.self, value: geo.frame(in: .named("padelScroll")).minY)
        }
        .frame(height: 0)
    }
}
