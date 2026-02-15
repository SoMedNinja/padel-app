import SwiftUI

struct PlayerAvatarView: View {
    let urlString: String?
    let size: CGFloat

    @State private var image: UIImage?
    @State private var isLoading = false

    var body: some View {
        ZStack {
            if let image {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFill()
            } else if isLoading {
                ProgressView()
                    .controlSize(.small)
            } else {
                avatarFallback
            }
        }
        .frame(width: size, height: size)
        .clipShape(Circle())
        .task(id: cacheTaskKey) {
            await loadAvatar()
        }
    }

    private var cacheTaskKey: String {
        "\(urlString ?? "")::\(size)"
    }

    // Note for non-coders:
    // We request an image close to the on-screen pixel size so we don't decode giant photos
    // just to render a tiny circular avatar.
    private func loadAvatar() async {
        guard let urlString = urlString?.trimmingCharacters(in: .whitespacesAndNewlines), !urlString.isEmpty else {
            image = nil
            isLoading = false
            return
        }

        isLoading = true
        let pixelSize = size * UIScreen.main.scale
        let resolvedImage = await AvatarImageService.shared.image(for: urlString, targetPixelSize: pixelSize)
        if !Task.isCancelled {
            image = resolvedImage
            isLoading = false
        }
    }

    private var avatarFallback: some View {
        Image(systemName: "person.crop.circle.fill")
            .resizable()
            .foregroundStyle(Color.accentColor)
            .frame(width: size, height: size)
            .background(Circle().fill(Color.accentColor.opacity(0.15)))
    }
}
