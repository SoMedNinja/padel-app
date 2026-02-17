import SwiftUI
import AVKit

struct PuzzlesView: View {
    @EnvironmentObject private var viewModel: AppViewModel
    @State private var difficulty: PuzzleDifficulty = .easy
    @State private var selectedAnswer: String?
    @State private var submittedRecord: PadelPuzzleAnswerRecord?
    @State private var selectedCoordinate: CGPoint?
    @State private var answersByQuestionId: [String: PadelPuzzleAnswerRecord] = [:]
    @State private var currentPuzzleIndex = 0
    @State private var confettiTrigger = 0

    private var puzzles: [PadelPuzzle] {
        PadelPuzzleData.puzzles.filter { $0.difficulty == difficulty }
    }

    private var currentPuzzle: PadelPuzzle? {
        guard !puzzles.isEmpty else { return nil }
        return puzzles[safe: currentPuzzleIndex] ?? puzzles.first
    }

    private var allPuzzleIds: Set<String> {
        Set(PadelPuzzleData.puzzles.map { $0.id })
    }

    private var solvedPuzzleIds: [String] {
        answersByQuestionId.filter { allPuzzleIds.contains($0.key) && $0.value.isCorrect }.map { $0.key }
    }

    private var hasAnsweredAllPuzzles: Bool {
        solvedPuzzleIds.count >= allPuzzleIds.count && !allPuzzleIds.isEmpty
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                if hasAnsweredAllPuzzles {
                    allSolvedState
                } else if let puzzle = currentPuzzle {
                    headerSection
                    difficultySection
                    puzzleCard(puzzle)
                } else {
                    ContentUnavailableView("Inga pussel hittades", systemImage: "puzzlepiece")
                }
            }
            .padding()
        }
        .background(AppColors.background)
        .overlay {
            ConfettiTriggerView(trigger: $confettiTrigger)
                .allowsHitTesting(false)
        }
        .navigationTitle("Padel Puzzles")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            loadProgress()
        }
    }

    private var allSolvedState: some View {
        SectionCard(title: "Snyggt jobbat! 🎉") {
            VStack(alignment: .leading, spacing: 16) {
                Text("Du har besvarat alla scenarion (\(solvedPuzzleIds.count)/\(allPuzzleIds.count)).")
                    .font(.inter(.body))
                    .foregroundStyle(AppColors.success)

                Text("Fler scenarion kommer snart. Vi fyller på med nya matchsituationer i kommande uppdateringar.")
                    .font(.inter(.caption))
                    .foregroundStyle(AppColors.textSecondary)

                Button("Spela om alla scenarion") {
                    resetProgress()
                }
                .buttonStyle(.borderedProminent)
            }
        }
    }

    private var headerSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Välj svårighetsgrad, läs scenariot och välj ett av tre svarsalternativ.")
                .font(.inter(.caption))
                .foregroundStyle(AppColors.textSecondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var difficultySection: some View {
        SectionCard(title: "Svårighetsgrad") {
            VStack(alignment: .leading, spacing: 12) {
                Picker("Svårighetsgrad", selection: $difficulty) {
                    ForEach(PuzzleDifficulty.allCases) { level in
                        Text(level.label).tag(level)
                    }
                }
                .pickerStyle(.segmented)
                .onChange(of: difficulty) { _, _ in
                    currentPuzzleIndex = 0
                    selectedAnswer = nil
                    selectedCoordinate = nil
                    submittedRecord = nil
                }

                HStack {
                    Label(difficulty.description, systemImage: "graduationcap")
                        .font(.inter(.caption2))
                        .foregroundStyle(AppColors.textSecondary)
                }

                HStack(spacing: 12) {
                    Text("Lösta: \(solvedPuzzleIds.count)/\(allPuzzleIds.count)")
                    Text("Rätt: \(answersByQuestionId.values.filter { $0.isCorrect }.count)")
                }
                .font(.inter(.caption2, weight: .bold))
                .foregroundStyle(AppColors.brandPrimary)
            }
        }
    }

    private func puzzleCard(_ puzzle: PadelPuzzle) -> some View {
        SectionCard(title: "Puzzle #\(puzzle.id) • \(puzzle.difficulty.label)") {
            VStack(alignment: .leading, spacing: 16) {
                Text(puzzle.title)
                    .font(.inter(.headline, weight: .bold))

                Text(puzzle.scenario)
                    .font(.inter(.body))
                    .foregroundStyle(AppColors.textSecondary)

                if let diagramUrl = puzzle.diagramUrl, puzzle.type != .tapToTarget {
                    if diagramUrl.hasPrefix("/") {
                        Image(diagramUrl.replacingOccurrences(of: "/education/", with: ""))
                            .resizable()
                            .scaledToFit()
                            .frame(maxHeight: 200)
                            .cornerRadius(10)
                    } else {
                        AsyncImage(url: URL(string: diagramUrl)) { image in
                            image.resizable().scaledToFit()
                        } placeholder: {
                            ProgressView()
                        }
                        .frame(maxHeight: 200)
                        .cornerRadius(10)
                    }
                }

                if puzzle.type == .video, let videoUrl = puzzle.videoUrl, let url = URL(string: videoUrl) {
                    VideoPlayer(player: AVPlayer(url: url))
                        .frame(height: 200)
                        .cornerRadius(10)
                }

                if puzzle.type == .tapToTarget {
                    PadelCourtView(
                        onTap: { selectedCoordinate = $0 },
                        selectedTap: selectedCoordinate,
                        correctTap: puzzle.targetCoordinate.map { CGPoint(x: $0.x, y: $0.y) },
                        showResult: submittedRecord != nil || answersByQuestionId[puzzle.id] != nil,
                        diagramUrl: puzzle.diagramUrl
                    )
                    .frame(maxWidth: .infinity)
                }

                if puzzle.type != .tapToTarget {
                    VStack(spacing: 10) {
                    ForEach(puzzle.options, id: \.self) { option in
                        Button {
                            if submittedRecord == nil && answersByQuestionId[puzzle.id] == nil {
                                selectedAnswer = option
                            }
                        } label: {
                            HStack {
                                Text(option)
                                    .font(.inter(.subheadline))
                                    .multilineTextAlignment(.leading)
                                Spacer()
                                if (submittedRecord?.selectedAnswer == option || answersByQuestionId[puzzle.id]?.selectedAnswer == option) {
                                    Image(systemName: "checkmark.circle.fill")
                                        .foregroundStyle(AppColors.success)
                                }
                            }
                            .padding()
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(
                                RoundedRectangle(cornerRadius: 10)
                                    .fill(selectedAnswer == option ? AppColors.brandPrimary.opacity(0.1) : AppColors.surfaceMuted)
                            )
                            .overlay(
                                RoundedRectangle(cornerRadius: 10)
                                    .stroke(selectedAnswer == option ? AppColors.brandPrimary : Color.clear, lineWidth: 2)
                            )
                        }
                        .buttonStyle(.plain)
                        .disabled(submittedRecord != nil || answersByQuestionId[puzzle.id] != nil)
                    }
                }
            }

                HStack(spacing: 12) {
                    Button("Kontrollera svar") {
                        checkAnswer(puzzle)
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled((selectedAnswer == nil && selectedCoordinate == nil) || submittedRecord != nil || answersByQuestionId[puzzle.id] != nil)

                    Button("Nästa puzzle") {
                        goToNextPuzzle()
                    }
                    .buttonStyle(.bordered)
                }

                if let record = submittedRecord ?? answersByQuestionId[puzzle.id] {
                    AppAlert(severity: record.isCorrect ? .success : .warning) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(record.isCorrect ? "Rätt beslut!" : "Inte optimalt val den här gången.")
                                .font(.inter(.subheadline, weight: .bold))
                            Text("Facit: \(puzzle.correctAnswer)")
                                .font(.inter(.caption))
                            Text("Coaching tips: \(puzzle.coachingTip)")
                                .font(.inter(.caption, weight: .semibold))
                                .padding(.top, 4)
                        }
                    }
                }
            }
        }
    }

    private func checkAnswer(_ puzzle: PadelPuzzle) {
        var isCorrect = false
        var finalAnswer = selectedAnswer ?? ""

        if puzzle.type == .tapToTarget {
            guard let tap = selectedCoordinate, let target = puzzle.targetCoordinate else { return }
            let dist = sqrt(pow(tap.x - target.x, 2) + pow(tap.y - target.y, 2))
            isCorrect = dist < 0.15
            finalAnswer = isCorrect ? puzzle.correctAnswer : "Fel position"
        } else {
            guard let selected = selectedAnswer else { return }
            isCorrect = selected == puzzle.correctAnswer
            finalAnswer = selected
        }

        let record = PadelPuzzleAnswerRecord(
            questionId: puzzle.id,
            difficulty: puzzle.difficulty,
            selectedAnswer: finalAnswer,
            correctAnswer: puzzle.correctAnswer,
            isCorrect: isCorrect,
            answeredAt: Date()
        )

        submittedRecord = record

        if record.isCorrect {
            answersByQuestionId[puzzle.id] = record
            saveProgress()
            confettiTrigger += 1
        }

        UIImpactFeedbackGenerator(style: record.isCorrect ? .medium : .light).impactOccurred()
    }

    private func goToNextPuzzle() {
        let unsolvedInDifficulty = puzzles.indices.filter { idx in
            let p = puzzles[idx]
            return answersByQuestionId[p.id]?.isCorrect != true
        }

        if let nextIdx = unsolvedInDifficulty.first(where: { $0 > currentPuzzleIndex }) {
            currentPuzzleIndex = nextIdx
        } else if let firstIdx = unsolvedInDifficulty.first {
            currentPuzzleIndex = firstIdx
        } else {
            // All solved in this difficulty, or just loop
            currentPuzzleIndex = (currentPuzzleIndex + 1) % puzzles.count
        }

        selectedAnswer = nil
        selectedCoordinate = nil
        submittedRecord = nil
    }

    private func saveProgress() {
        let userId = viewModel.currentPlayer?.id.uuidString ?? "guest"
        let key = "padel-puzzles-progress-\(userId)"
        if let encoded = try? JSONEncoder().encode(answersByQuestionId) {
            UserDefaults.standard.set(encoded, forKey: key)
        }
    }

    private func loadProgress() {
        let userId = viewModel.currentPlayer?.id.uuidString ?? "guest"
        let key = "padel-puzzles-progress-\(userId)"
        if let data = UserDefaults.standard.data(forKey: key),
           let decoded = try? JSONDecoder().decode([String: PadelPuzzleAnswerRecord].self, from: data) {
            answersByQuestionId = decoded
        }
    }

    private func resetProgress() {
        let userId = viewModel.currentPlayer?.id.uuidString ?? "guest"
        let key = "padel-puzzles-progress-\(userId)"
        UserDefaults.standard.removeObject(forKey: key)
        answersByQuestionId = [:]
        difficulty = .easy
        currentPuzzleIndex = 0
        selectedAnswer = nil
        submittedRecord = nil
    }
}

extension Collection {
    subscript(safe index: Index) -> Element? {
        return indices.contains(index) ? self[index] : nil
    }
}
