import SwiftUI

struct MatchConflictResolutionSheet: View {
    let context: MatchUpdateConflictContext
    let onOverwrite: () -> Void
    let onDiscard: () -> Void
    let onMerge: (() -> Void)?

    var body: some View {
        NavigationStack {
            List {
                Section("Lokal väntande ändring") {
                    Text(context.localDraft.summary())
                        .font(.inter(.body, weight: .semibold))
                    Text("Spelare: \(readableTeam(context.localDraft.teamAPlayerIds)) vs \(readableTeam(context.localDraft.teamBPlayerIds))")
                        .font(.inter(.footnote))
                        .foregroundStyle(AppColors.textSecondary)
                }

                Section("Senaste serverversion") {
                    Text("Score \(context.latestServerMatch.teamAScore)-\(context.latestServerMatch.teamBScore) • \(AppViewModel.uiDateTimeFormatter.string(from: context.latestServerMatch.playedAt))")
                        .font(.inter(.body, weight: .semibold))
                    Text("Spelare: \(context.latestServerMatch.teamAName) vs \(context.latestServerMatch.teamBName)")
                        .font(.inter(.footnote))
                        .foregroundStyle(AppColors.textSecondary)
                }

                Section("Välj hur konflikten ska lösas") {
                    Button("Skriv över med mina ändringar") {
                        onOverwrite()
                    }

                    Button("Kassera mina ändringar", role: .destructive) {
                        onDiscard()
                    }

                    if let onMerge {
                        Button("Försök sammanfoga") {
                            onMerge()
                        }
                    } else {
                        Text("Sammanfogning är inte möjlig eftersom samma fält ändrades på båda sidor.")
                            .font(.inter(.footnote))
                            .foregroundStyle(AppColors.textSecondary)
                    }
                }
            }
            .navigationTitle("Redigeringskonflikt")
        }
    }

    // Note for non-coders:
    // We translate raw player IDs into readable labels so users can compare teams quickly.
    private func readableTeam(_ ids: [String?]) -> String {
        let cleaned = ids.compactMap { id in
            guard let id else { return nil }
            return id == "guest" ? "Gäst" : String(id.prefix(6)) + "…"
        }
        return cleaned.isEmpty ? "Inga spelare valda" : cleaned.joined(separator: " & ")
    }
}
