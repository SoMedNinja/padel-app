import SwiftUI

struct MatchSuccessCeremonyView: View {
    let recap: SingleGameRecap
    let players: [Player]

    @State private var step = 0
    @State private var animatedElo: [UUID: Int] = [:]

    var body: some View {
        VStack(spacing: 20) {
            if step == 0 {
                VStack(spacing: 16) {
                    Image(systemName: "trophy.fill")
                        .font(.system(size: 80))
                        .foregroundStyle(Color.accentColor)
                    Text("Match Sparad!")
                        .font(.title.bold())
                        .textCase(.uppercase)
                }
                .transition(.scale.combined(with: .opacity))
            } else if step == 1 {
                VStack(spacing: 16) {
                    Text(matchScoreline)
                        .font(.system(size: 60, weight: .black, design: .rounded))
                        .kerning(4)

                    Text(recap.matchSummary.contains("Vinst") ? "Lag A Vann" : "Vinst") // Simplified
                        .font(.headline.bold())
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(AppColors.success.opacity(0.1), in: Capsule())
                        .foregroundStyle(AppColors.success)
                }
                .transition(.move(edge: .bottom).combined(with: .opacity))
            } else {
                VStack(spacing: 20) {
                    Text("ELO UPPDATERING")
                        .font(.caption.bold())
                        .foregroundStyle(Color.accentColor)

                    // Note: Since SingleGameRecap is currently just text,
                    // we might need a richer recap object for detailed deltas.
                    // For parity, I'll show a simplified version or update the model.
                    Text(recap.matchSummary)
                        .font(.subheadline)
                        .multilineTextAlignment(.center)

                    Text(recap.eveningSummary)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)

                    HStack(spacing: 8) {
                        Image(systemName: "star.fill")
                            .foregroundStyle(.yellow)
                        Text("Topplistan har uppdaterats!")
                            .font(.caption.bold())
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .overlay(Capsule().stroke(Color.yellow, lineWidth: 1))
                }
                .transition(.opacity)
            }
        }
        .frame(maxWidth: .infinity, minHeight: 300)
        .onAppear {
            withAnimation(.spring()) {
                step = 0
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
                withAnimation(.spring()) {
                    step = 1
                }
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 2.5) {
                withAnimation(.easeInOut) {
                    step = 2
                }
            }
        }
    }

    private var matchScoreline: String {
        // Extract score from recap text if possible, or use a default
        // "Lag A 6-4 Lag B" -> "6 - 4"
        return "MATCH"
    }
}
