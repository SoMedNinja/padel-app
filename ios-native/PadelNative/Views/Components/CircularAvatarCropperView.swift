import SwiftUI
import UIKit

struct CircularAvatarCropperView: View {
    let image: UIImage
    @Binding var isPresented: Bool
    var onCrop: (UIImage) -> Void

    @State private var scale: CGFloat = 1.0
    @State private var lastScale: CGFloat = 1.0
    @State private var offset: CGSize = .zero
    @State private var lastOffset: CGSize = .zero

    private let cropSize: CGFloat = 300

    var body: some View {
        NavigationStack {
            ZStack {
                Color.black.ignoresSafeArea()

                GeometryReader { geo in
                    Image(uiImage: image)
                        .resizable()
                        .scaledToFill()
                        .scaleEffect(scale)
                        .offset(offset)
                        .gesture(
                            DragGesture()
                                .onChanged { value in
                                    offset = CGSize(
                                        width: lastOffset.width + value.translation.width,
                                        height: lastOffset.height + value.translation.height
                                    )
                                }
                                .onEnded { _ in
                                    lastOffset = offset
                                }
                        )
                        .gesture(
                            MagnificationGesture()
                                .onChanged { value in
                                    scale = lastScale * value
                                }
                                .onEnded { _ in
                                    lastScale = scale
                                }
                        )
                }
                .frame(width: cropSize, height: cropSize)
                .clipShape(Circle())
                .overlay(Circle().stroke(Color.white, lineWidth: 2))

                // Dim background
                Color.black.opacity(0.5)
                    .mask(
                        ZStack {
                            Rectangle()
                            Circle()
                                .frame(width: cropSize, height: cropSize)
                                .blendMode(.destinationOut)
                        }
                    )
                    .allowsHitTesting(false)
            }
            .navigationTitle("Beskär profilbild")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Avbryt") {
                        isPresented = false
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Klar") {
                        if let cropped = cropImage() {
                            onCrop(cropped)
                        }
                        isPresented = false
                    }
                }
            }
        }
    }

    @MainActor
    private func cropImage() -> UIImage? {
        // Using ImageRenderer for iOS 16+ for more reliable rendering of SwiftUI views to images
        let view = Image(uiImage: image)
            .resizable()
            .scaledToFill()
            .scaleEffect(scale)
            .offset(offset)
            .frame(width: cropSize, height: cropSize)
            .clipShape(Circle())
            .background(Color.white) // Ensure solid background for profile photo

        let renderer = ImageRenderer(content: view)
        renderer.scale = 2.0 // High quality
        return renderer.uiImage
    }
}
