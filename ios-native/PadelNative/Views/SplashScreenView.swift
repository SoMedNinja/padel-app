import SwiftUI

struct SplashScreenView: View {
    @State private var ballOffset: CGFloat = -150
    @State private var ballOpacity: Double = 0
    @State private var racketScale: CGFloat = 0.5
    @State private var showText = false
    @State private var ballRotation: Double = 0

    var body: some View {
        ZStack {
            AppColors.background.ignoresSafeArea()

            VStack(spacing: 40) {
                ZStack {
                    // Padel Racket (simplified as a stylish circle)
                    Circle()
                        .fill(AppColors.brandPrimary)
                        .frame(width: 140, height: 140)
                        .scaleEffect(racketScale)
                        .shadow(color: AppColors.brandPrimary.opacity(0.3), radius: 20, x: 0, y: 10)
                        .overlay(
                            Image(systemName: "circle.grid.3x3.fill")
                                .foregroundStyle(.white.opacity(0.2))
                                .font(.system(size: 70))
                        )

                    // Handle
                    RoundedRectangle(cornerRadius: 10)
                        .fill(AppColors.brandPrimary)
                        .frame(width: 30, height: 80)
                        .offset(y: 100)
                        .scaleEffect(racketScale)

                    // Padel Ball
                    Circle()
                        .fill(Color(hex: "#ccff00")) // Classic padel ball yellow-green
                        .frame(width: 35, height: 35)
                        .offset(y: ballOffset)
                        .rotationEffect(.degrees(ballRotation))
                        .opacity(ballOpacity)
                        .shadow(color: .black.opacity(0.2), radius: 5, x: 0, y: 5)
                        .overlay(
                            // Minimal ball seam detail
                            Path { path in
                                path.addArc(center: CGPoint(x: 17.5, y: 17.5), radius: 15, startAngle: .degrees(0), endAngle: .degrees(180), clockwise: false)
                            }
                            .stroke(Color.white.opacity(0.5), lineWidth: 2)
                        )
                }
                .offset(y: -40)

                if showText {
                    VStack(spacing: 12) {
                        Text("PADEL")
                            .font(.inter(.title, weight: .black))
                            .foregroundStyle(AppColors.textPrimary)
                            .tracking(10)

                        Text("NATIVE")
                            .font(.inter(.headline, weight: .bold))
                            .foregroundStyle(AppColors.brandPrimary)
                            .tracking(5)
                    }
                    .transition(.asymmetric(
                        insertion: .move(edge: .bottom).combined(with: .opacity),
                        removal: .opacity
                    ))
                }
            }
        }
        .onAppear {
            // Racket enters
            withAnimation(.spring(response: 0.8, dampingFraction: 0.5, blendDuration: 0)) {
                racketScale = 1.0
            }

            // Ball drops
            withAnimation(.easeIn(duration: 0.6).delay(0.5)) {
                ballOpacity = 1.0
                ballOffset = -20
                ballRotation = 360
            }

            // Ball bounces on racket
            withAnimation(.spring(response: 0.3, dampingFraction: 0.4, blendDuration: 0).delay(1.1)) {
                ballOffset = -80
            }

            // Second small bounce
            withAnimation(.spring(response: 0.3, dampingFraction: 0.4, blendDuration: 0).delay(1.4)) {
                ballOffset = -20
            }

            // Text appears
            withAnimation(.easeInOut(duration: 0.6).delay(1.8)) {
                showText = true
            }
        }
    }
}

#Preview {
    SplashScreenView()
}
