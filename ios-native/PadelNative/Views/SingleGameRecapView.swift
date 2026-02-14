import SwiftUI

struct SingleGameRecapView: View {
    let recap: SingleGameRecap
    let players: [Player]

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                SectionCard(title: "Match klar") {
                    // Note for non-coders: this animation mirrors the web app so the winner reveal feels familiar.
                    MatchSuccessCeremonyView(recap: recap, players: players)
                }

                SectionCard(title: "Matchrecap") {
                    Text(recap.matchSummary)
                        .font(.inter(.subheadline, weight: .bold))
                        .frame(maxWidth: .infinity, alignment: .leading)
                }

                SectionCard(title: "Kvällsrecap") {
                    Text(recap.eveningSummary)
                        .font(.inter(.subheadline))
                        .foregroundStyle(AppColors.textSecondary)
                        .frame(maxWidth: .infinity, alignment: .leading)

                    ShareLink(item: recap.sharePayload) {
                        Label("Dela recap", systemImage: "square.and.arrow.up")
                            .font(.inter(.caption, weight: .bold))
                    }
                    .padding(.top, 8)
                }
            }
            .padding()
        }
        .background(AppColors.background)
        .navigationTitle("Recap")
        .navigationBarTitleDisplayMode(.inline)
        .padelLiquidGlassChrome()
    }
}
