import SwiftUI

struct TournamentBracketView: View {
    let rounds: [TournamentRound]
    let playerResolver: (UUID) -> String

    @State private var zoomScale: CGFloat = 1.0
    @State private var lastZoomScale: CGFloat = 1.0

    private var sortedRounds: [TournamentRound] {
        rounds.sorted { $0.roundNumber < $1.roundNumber }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Turneringsöversikt")
                    .font(.inter(.headline, weight: .bold))
                Spacer()
                if !rounds.isEmpty {
                    Button {
                        withAnimation(.spring()) {
                            zoomScale = 1.0
                        }
                    } label: {
                        Image(systemName: "arrow.counterclockwise.circle")
                            .font(.title3)
                            .foregroundStyle(AppColors.textSecondary)
                    }
                    .accessibilityLabel("Återställ zoom")
                }
            }

            if rounds.isEmpty {
                Text("Inga ronder har skapats än.")
                    .font(.inter(.subheadline))
                    .foregroundStyle(AppColors.textSecondary)
                    .padding(.vertical, 20)
            } else {
                ScrollView([.horizontal, .vertical], showsIndicators: false) {
                    HStack(spacing: 16) {
                        ForEach(sortedRounds) { round in
                            roundCard(round)
                        }
                    }
                    .padding(.vertical, 20)
                    .padding(.horizontal, 10)
                    .scaleEffect(zoomScale)
                    .gesture(
                        MagnificationGesture()
                            .onChanged { value in
                                zoomScale = lastZoomScale * value
                            }
                            .onEnded { value in
                                lastZoomScale = zoomScale
                                if zoomScale < 0.5 { zoomScale = 0.5; lastZoomScale = 0.5 }
                                if zoomScale > 2.0 { zoomScale = 2.0; lastZoomScale = 2.0 }
                            }
                    )
                }
                .frame(minHeight: 200)
                .background(AppColors.surface)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(AppColors.borderSubtle, lineWidth: 1)
                )

                Text("Nyp för att zooma in/ut")
                    .font(.inter(size: 9))
                    .foregroundStyle(AppColors.textSecondary)
                    .padding(.top, 4)
            }
        }
    }

    private func roundCard(_ round: TournamentRound) -> some View {
        let isPlayed = round.team1Score != nil && round.team2Score != nil
        let t1Score = round.team1Score ?? 0
        let t2Score = round.team2Score ?? 0
        let t1Won = isPlayed && t1Score > t2Score
        let t2Won = isPlayed && t2Score > t1Score

        let team1Names = round.team1Ids.map { playerResolver($0) }.joined(separator: " & ")
        let team2Names = round.team2Ids.map { playerResolver($0) }.joined(separator: " & ")
        let restingNames = round.restingIds.map { playerResolver($0) }.joined(separator: ", ")

        return VStack(alignment: .leading, spacing: 12) {
            Text("Rond \(round.roundNumber)")
                .font(.caption.weight(.black))
                .foregroundStyle(Color.accentColor)

            VStack(spacing: 8) {
                HStack {
                    Text(team1Names)
                        .font(.subheadline.weight(t1Won ? .black : .semibold))
                        .foregroundStyle(t1Won ? Color.accentColor : .primary)
                        .lineLimit(1)
                    Spacer()
                    Text(isPlayed ? "\(t1Score)" : "—")
                        .font(.subheadline.weight(.bold))
                        .foregroundStyle(t1Won ? Color.accentColor : .primary)
                }

                Text("vs")
                    .font(.caption2.weight(.bold))
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity)

                HStack {
                    Text(team2Names)
                        .font(.subheadline.weight(t2Won ? .black : .semibold))
                        .foregroundStyle(t2Won ? Color.accentColor : .primary)
                        .lineLimit(1)
                    Spacer()
                    Text(isPlayed ? "\(t2Score)" : "—")
                        .font(.subheadline.weight(.bold))
                        .foregroundStyle(t2Won ? Color.accentColor : .primary)
                }
            }

            if !restingNames.isEmpty {
                Divider()
                HStack(alignment: .top, spacing: 4) {
                    Text("Vilar:")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(.secondary)
                    Text(restingNames)
                        .font(.system(size: 10))
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                }
            }
        }
        .padding()
        .frame(width: 240)
        .background(isPlayed ? Color.accentColor.opacity(0.05) : Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(isPlayed ? Color.accentColor.opacity(0.2) : Color.clear, lineWidth: 1)
        )
    }
}
