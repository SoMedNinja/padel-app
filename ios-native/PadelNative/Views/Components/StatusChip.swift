import SwiftUI

/// Note for non-coders:
/// A status chip is the small rounded label used to quickly show state
/// (like Open/Closed) without reading a full paragraph.
struct StatusChip: View {
    let title: String
    let tint: Color

    var body: some View {
        Text(title)
            .font(.inter(.caption, weight: .bold))
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
            .background(tint.opacity(0.12), in: Capsule())
            .foregroundStyle(tint)
    }
}
