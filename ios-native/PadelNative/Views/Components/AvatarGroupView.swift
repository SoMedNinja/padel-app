import SwiftUI

struct AvatarGroupView: View {
    let avatars: [String?]
    let limit: Int = 5
    var size: CGFloat = 32

    var body: some View {
        HStack(spacing: -size * 0.4) {
            ForEach(0..<min(avatars.count, limit), id: \.self) { index in
                PlayerAvatarView(urlString: avatars[index], size: size)
                    .overlay(Circle().stroke(Color(.systemBackground), lineWidth: 2))
                    .zIndex(Double(limit - index))
            }

            if avatars.count > limit {
                Text("+\(avatars.count - limit)")
                    .font(.caption2.bold())
                    .frame(width: size, height: size)
                    .background(Color(.systemGray5))
                    .clipShape(Circle())
                    .overlay(Circle().stroke(Color(.systemBackground), lineWidth: 2))
                    .zIndex(0)
            }
        }
    }

}
