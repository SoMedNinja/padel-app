import SwiftUI

struct SingleGameRecapView: View {
    let recap: SingleGameRecap
    let players: [Player]
    @State private var selectedShareVariant: ShareCardService.Variant = .classic

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

                    shareVariantPicker

                    if let imageURL = recapShareImageURL() {
                        ShareLink(item: imageURL) {
                            Label("Dela recap-bild", systemImage: "photo.on.rectangle")
                                .font(.inter(.caption, weight: .bold))
                        }
                    } else {
                        Text("Kunde inte skapa recap-bilden just nu.")
                            .font(.inter(.caption))
                            .foregroundStyle(AppColors.textSecondary)
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

    private func recapShareImageURL() -> URL? {
        // Note for non-coders: we always export a PNG image here so iOS shares a visual card (not plain text).
        try? ShareCardService.createShareImageFile(
            title: "Kvällsrecap",
            bodyLines: [recap.matchSummary, "", recap.eveningSummary],
            fileNamePrefix: "single-game-evening-recap",
            variant: selectedShareVariant
        )
    }

    private var shareVariantPicker: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Note for non-coders: this matches web "Mall 1/5" by letting users pick one of five visual styles.
            Text("Välj bildstil")
                .font(.inter(.caption, weight: .bold))
                .foregroundStyle(AppColors.textSecondary)

            Picker("Välj bildstil", selection: $selectedShareVariant) {
                ForEach(ShareCardService.Variant.allCases) { variant in
                    Text(variant.title).tag(variant)
                }
            }
            .pickerStyle(.segmented)

            Text("Mall \(selectedShareVariant.rawValue + 1) av 5")
                .font(.inter(.caption2, weight: .semibold))
                .foregroundStyle(AppColors.textSecondary)
        }
    }
}
