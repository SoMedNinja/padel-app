import SwiftUI

struct PadelCourtView: View {
    let onTap: (CGPoint) -> Void
    let selectedTap: CGPoint?
    let correctTap: CGPoint?
    let showResult: Bool
    let diagramUrl: String?

    var body: some View {
        GeometryReader { geometry in
            ZStack {
                // Background
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color(red: 76/255, green: 175/255, blue: 80/255)) // Padel Green
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(Color.white, lineWidth: 4)
                    )

                if let diagramUrl = diagramUrl {
                    if diagramUrl.hasPrefix("/") {
                        // Note for non-coders: SVGs aren't natively supported by Image(name).
                        // We fall back to the line drawing if it's a local path and not found.
                        Image(diagramUrl.replacingOccurrences(of: "/education/", with: "").replacingOccurrences(of: ".svg", with: ""))
                            .resizable()
                            .scaledToFill()
                            .opacity(0.8)
                    } else {
                        AsyncImage(url: URL(string: diagramUrl)) { image in
                            image.resizable().scaledToFill()
                        } placeholder: {
                            ProgressView()
                        }
                        .opacity(0.8)
                    }
                }

                // Overlay lines if image is missing or as a base
                if diagramUrl == nil {
                    // Draw lines
                    VStack(spacing: 0) {
                        Spacer()
                        Rectangle().fill(Color.white.opacity(0.5)).frame(height: 2)
                        Spacer()
                        Rectangle().fill(Color.white).frame(height: 2) // Net
                        Spacer()
                        Rectangle().fill(Color.white.opacity(0.5)).frame(height: 2)
                        Spacer()
                    }
                    Rectangle().fill(Color.white.opacity(0.5)).frame(width: 2)
                }

                if let tap = selectedTap {
                    Circle()
                        .fill(showResult ? (isCorrect ? Color.green : Color.red) : AppColors.brandPrimary)
                        .frame(width: 16, height: 16)
                        .overlay(Circle().stroke(Color.white, lineWidth: 2))
                        .position(x: tap.x * geometry.size.width, y: tap.y * geometry.size.height)
                }

                if showResult, let target = correctTap {
                    Circle()
                        .stroke(Color.white, style: StrokeStyle(lineWidth: 2, dash: [5]))
                        .background(Circle().fill(Color.green.opacity(0.3)))
                        .frame(width: 30, height: 30)
                        .position(x: target.x * geometry.size.width, y: target.y * geometry.size.height)
                }
            }
            .contentShape(Rectangle())
            .onTapGesture { location in
                guard !showResult else { return }
                let normalized = CGPoint(x: location.x / geometry.size.width, y: location.y / geometry.size.height)
                onTap(normalized)
            }
        }
        .aspectRatio(0.5, contentMode: .fit)
        .frame(maxWidth: 300)
        .cornerRadius(12)
    }

    private var isCorrect: Bool {
        guard let tap = selectedTap, let target = correctTap else { return false }
        let dist = sqrt(pow(tap.x - target.x, 2) + pow(tap.y - target.y, 2))
        return dist < 0.15
    }
}
