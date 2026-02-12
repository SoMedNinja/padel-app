import SwiftUI

struct TournamentBracketView: View {
    let rounds: [TournamentRound]
    let playerResolver: (UUID) -> String

    private var sortedRounds: [TournamentRound] {
        rounds.sorted { $0.roundNumber < $1.roundNumber }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Turneringsöversikt")
                .font(.headline.weight(.bold))

            if rounds.isEmpty {
                Text("Inga ronder har skapats än.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .padding(.vertical, 20)
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 16) {
                        ForEach(sortedRounds) { round in
                            roundCard(round)
                        }
                    }
                    .padding(.bottom, 8)
                }
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
