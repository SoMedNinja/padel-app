import SwiftUI

/// Note for non-coders:
/// A status chip is the small rounded label used to quickly show state
/// (like Open/Closed) without reading a full paragraph.
struct StatusChip: View {
    let title: String
    let tint: Color

    var body: some View {
        Text(title)
            .font(.caption.weight(.semibold))
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(tint.opacity(0.18), in: Capsule())
    }
}
