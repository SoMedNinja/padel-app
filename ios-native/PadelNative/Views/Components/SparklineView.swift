import SwiftUI

struct SparklineView: View {
    let points: [Int]
    var color: Color = .accentColor

    var body: some View {
        GeometryReader { geometry in
            if points.count < 2 {
                EmptyView()
            } else {
                Path { path in
                    let minElo = points.min() ?? 0
                    let maxElo = points.max() ?? 1
                    let range = max(1, maxElo - minElo)

                    let stepX = geometry.size.width / CGFloat(points.count - 1)

                    for (index, point) in points.enumerated() {
                        let x = CGFloat(index) * stepX
                        let y = geometry.size.height - (CGFloat(point - minElo) / CGFloat(range) * geometry.size.height)

                        if index == 0 {
                            path.move(to: CGPoint(x: x, y: y))
                        } else {
                            path.addLine(to: CGPoint(x: x, y: y))
                        }
                    }
                }
                .stroke(color, lineWidth: 2)
            }
        }
    }
}
