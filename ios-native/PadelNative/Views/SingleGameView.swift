import SwiftUI

struct SingleGameView: View {
    @EnvironmentObject private var viewModel: AppViewModel

    @State private var teamAName = ""
    @State private var teamBName = ""
    @State private var teamAScore = 6
    @State private var teamBScore = 4
    @State private var isSubmitting = false

    var body: some View {
        NavigationStack {
            Form {
                Section("Teams") {
                    TextField("Team A", text: $teamAName)
                    TextField("Team B", text: $teamBName)
                }

                Section("Score") {
                    Stepper("Team A: \(teamAScore)", value: $teamAScore, in: 0...99)
                    Stepper("Team B: \(teamBScore)", value: $teamBScore, in: 0...99)
                }

                Section {
                    Button {
                        Task {
                            isSubmitting = true
                            defer { isSubmitting = false }
                            await viewModel.submitSingleGame(
                                teamAName: teamAName,
                                teamBName: teamBName,
                                teamAScore: teamAScore,
                                teamBScore: teamBScore
                            )
                        }
                    } label: {
                        if isSubmitting {
                            ProgressView()
                                .frame(maxWidth: .infinity)
                        } else {
                            Text("Save Match")
                                .frame(maxWidth: .infinity)
                        }
                    }
                    .disabled(isSubmitting)
                }

                if let status = viewModel.statusMessage {
                    Section("Status") {
                        Text(status)
                            .foregroundStyle(.secondary)
                    }
                }

                Section("What this does") {
                    Text("Note for non-coders: this is the native equivalent of the web app's single-game form. It sends one completed match to the same backend table.")
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Single Game")
        }
    }
}
