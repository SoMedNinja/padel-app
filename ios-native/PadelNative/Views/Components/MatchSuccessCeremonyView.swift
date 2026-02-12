import SwiftUI

struct MatchSuccessCeremonyView: View {
    let recap: SingleGameRecap
    let players: [Player]

    @State private var step = 0
    @State private var showDeltas = false

    var body: some View {
        VStack(spacing: 24) {
            if step == 0 {
                VStack(spacing: 20) {
                    Image(systemName: "checkmark.seal.fill")
                        .font(.system(size: 80))
                        .foregroundStyle(AppColors.success)
                        .symbolEffect(.bounce, value: step)

                    Text("MATCH SPARAD")
                        .font(.title.black())
                        .kerning(2)
                }
                .transition(.scale.combined(with: .opacity))
            } else if step == 1 {
                VStack(spacing: 16) {
                    Text("\(recap.teamAScore) - \(recap.teamBScore)")
                        .font(.system(size: 72, weight: .black, design: .rounded))
                        .foregroundStyle(Color.accentColor)

                    let aWon = recap.teamAScore > recap.teamBScore
                    Text(aWon ? "Lag A Vann!" : "Lag B Vann!")
                        .font(.headline.bold())
                        .padding(.horizontal, 20)
                        .padding(.vertical, 10)
                        .background(AppColors.success.opacity(0.15), in: Capsule())
                        .foregroundStyle(AppColors.success)
                }
                .transition(.asymmetric(insertion: .move(edge: .bottom), removal: .opacity))
            } else {
                VStack(spacing: 24) {
                    Text("ELO UPPDATERING")
                        .font(.caption.bold())
                        .kerning(1.5)
                        .foregroundStyle(.secondary)

                    HStack(alignment: .top, spacing: 32) {
                        recapTeamColumn(team: recap.teamA, title: "Lag A")
                        recapTeamColumn(team: recap.teamB, title: "Lag B")
                    }

                    VStack(spacing: 8) {
                        HStack {
                            Text("Match-rättvisa")
                            Spacer()
                            Text("\(recap.fairness)%")
                        }
                        ProgressView(value: Double(recap.fairness), total: 100)
                            .tint(Color.accentColor)
                    }
                    .font(.caption.bold())
                    .padding(.horizontal)

                    HStack(spacing: 8) {
                        Image(systemName: "sparkles")
                            .foregroundStyle(.yellow)
                        Text("Topplistan har uppdaterats!")
                            .font(.caption.bold())
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .background(Color.yellow.opacity(0.1), in: Capsule())
                }
                .transition(.opacity.combined(with: .scale(scale: 0.95)))
            }
        }
        .frame(maxWidth: .infinity, minHeight: 380)
        .padding()
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
        .shadow(color: .black.opacity(0.1), radius: 20)
        .onAppear {
            withAnimation(.spring(duration: 0.6)) {
                step = 0
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) {
                withAnimation(.spring(duration: 0.6)) {
                    step = 1
                }
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 2.8) {
                withAnimation(.easeInOut(duration: 0.5)) {
                    step = 2
                }
                withAnimation(.spring(duration: 0.8).delay(0.3)) {
                    showDeltas = true
                }
            }
        }
    }

    private func recapTeamColumn(team: MatchRecapTeam, title: String) -> some View {
        VStack(spacing: 16) {
            Text(title)
                .font(.caption2.bold())
                .foregroundStyle(.secondary)

            ForEach(team.players) { player in
                VStack(spacing: 4) {
                    if let urlString = player.avatarURL, let url = URL(string: urlString) {
                        AsyncImage(url: url) { image in
                            image.resizable().scaledToFill()
                        } placeholder: {
                            Image(systemName: "person.crop.circle.fill")
                                .foregroundStyle(.gray)
                        }
                        .frame(width: 44, height: 44)
                        .clipShape(Circle())
                    } else {
                        Image(systemName: "person.crop.circle.fill")
                            .font(.system(size: 40))
                            .foregroundStyle(Color.accentColor.opacity(0.3))
                    }

                    Text(player.name)
                        .font(.caption.bold())
                        .lineLimit(1)

                    if showDeltas {
                        Text("\(player.delta >= 0 ? "+" : "")\(player.delta)")
                            .font(.caption2.monospacedDigit().bold())
                            .foregroundStyle(player.delta >= 0 ? .green : .red)
                            .transition(.scale.combined(with: .opacity))
                    }
                }
            }
        }
        .frame(maxWidth: .infinity)
    }
}
