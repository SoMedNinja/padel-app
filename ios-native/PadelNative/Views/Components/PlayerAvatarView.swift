import SwiftUI

struct PlayerAvatarView: View {
    let urlString: String?
    let size: CGFloat

    var body: some View {
        if let urlString = urlString, !urlString.isEmpty {
            if urlString.hasPrefix("data:image") {
                if let image = decodeBase64Image(urlString) {
                    Image(uiImage: image)
                        .resizable()
                        .scaledToFill()
                        .frame(width: size, height: size)
                        .clipShape(Circle())
                } else {
                    avatarFallback
                }
            } else if let url = URL(string: urlString), url.scheme?.hasPrefix("http") == true {
                AsyncImage(url: url) { image in
                    image.resizable()
                        .scaledToFill()
                } placeholder: {
                    ProgressView()
                }
                .frame(width: size, height: size)
                .clipShape(Circle())
            } else {
                avatarFallback
            }
        } else {
            avatarFallback
        }
    }

    private var avatarFallback: some View {
        Image(systemName: "person.crop.circle.fill")
            .resizable()
            .foregroundStyle(Color.accentColor)
            .frame(width: size, height: size)
            .background(Circle().fill(Color.accentColor.opacity(0.15)))
    }

    private func decodeBase64Image(_ dataString: String) -> UIImage? {
        let components = dataString.components(separatedBy: ",")
        guard components.count > 1, let base64String = components.last else { return nil }
        guard let data = Data(base64Encoded: base64String) else { return nil }
        return UIImage(data: data)
    }
}
