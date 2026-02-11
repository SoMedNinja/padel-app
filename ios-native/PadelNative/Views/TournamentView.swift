import SwiftUI

struct TournamentView: View {
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    SectionCard(title: "Tournament Center") {
                        Text("This screen is the native home for tournament setup, standings, and results.")
                        Text("Note for non-coders: this is where we replicate your existing web tournament workflows in native screens.")
                            .foregroundStyle(.secondary)
                    }

                    SectionCard(title: "Next step") {
                        Text("Wire this screen to tournament endpoints and live standings updates.")
                            .foregroundStyle(.secondary)
                    }
                }
                .padding()
            }
            .navigationTitle("Tournament")
        }
    }
}
