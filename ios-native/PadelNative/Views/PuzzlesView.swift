import SwiftUI
import AVKit

struct PuzzlesView: View {
    @EnvironmentObject private var viewModel: AppViewModel
    @State private var difficulty: PuzzleDifficulty = .easy
    @State private var selectedAnswer: String?
    @State private var submittedRecord: PadelPuzzleAnswerRecord?
    @State private var selectedTarget: TargetCoordinate?
    @State private var answersByQuestionId: [String: PadelPuzzleAnswerRecord] = [:]
    @State private var currentPuzzleIndex = 0
    @State private var showConfetti = 0 // Increment to trigger

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
        ZStack {
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

            if showConfetti > 0 {
                ConfettiEffectView()
                    .id(showConfetti)
            }
        }
        .background(AppColors.background)
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

                if puzzle.type == .tapToTarget {
                    PadelCourtInteractionView(
                        selectedCoord: $selectedTarget,
                        correctCoord: puzzle.targetCoordinate,
                        showResult: submittedRecord != nil || answersByQuestionId[puzzle.id] != nil
                    )
                }

                if puzzle.type == .video, let videoUrl = puzzle.videoUrl, let url = URL(string: videoUrl) {
                    VideoPlayer(player: AVPlayer(url: url))
                        .frame(height: 250)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }

                if let diagramUrl = puzzle.diagramUrl, let url = URL(string: diagramUrl), puzzle.type != .tapToTarget {
                    AsyncImage(url: url) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                            .frame(maxWidth: .infinity)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                    } placeholder: {
                        ProgressView()
                            .frame(maxWidth: .infinity, minHeight: 150)
                    }
                    .background(AppColors.surfaceMuted)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
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
                    .disabled((puzzle.type == .tapToTarget ? selectedTarget == nil : selectedAnswer == nil) || submittedRecord != nil || answersByQuestionId[puzzle.id] != nil)

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
        let isCorrect: Bool
        let selected: String

        if puzzle.type == .tapToTarget, let target = selectedTarget, let correct = puzzle.targetCoordinate {
            let dist = sqrt(pow(target.x - correct.x, 2) + pow(target.y - correct.y, 2))
            isCorrect = dist < 15
            selected = "Interactive Target"
        } else {
            guard let sel = selectedAnswer else { return }
            isCorrect = sel == puzzle.correctAnswer
            selected = sel
        }

        let record = PadelPuzzleAnswerRecord(
            questionId: puzzle.id,
            difficulty: puzzle.difficulty,
            selectedAnswer: selected,
            correctAnswer: puzzle.correctAnswer,
            isCorrect: isCorrect,
            answeredAt: Date()
        )

        submittedRecord = record

        if record.isCorrect {
            answersByQuestionId[puzzle.id] = record
            saveProgress()
            showConfetti += 1
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
        selectedTarget = nil
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

struct ConfettiEffectView: View {
    @State private var animate = false
    private let colors: [Color] = [.red, .white, .green, .yellow, .blue, .pink]

    var body: some View {
        ZStack {
            ForEach(0..<60) { i in
                ConfettiPiece(color: colors.randomElement() ?? .red)
                    .offset(x: animate ? CGFloat.random(in: -200...200) : 0,
                            y: animate ? CGFloat.random(in: -400...400) : 0)
                    .rotationEffect(.degrees(animate ? Double.random(in: 0...720) : 0))
                    .opacity(animate ? 0 : 1)
                    .animation(.easeOut(duration: Double.random(in: 1.5...2.5)), value: animate)
            }
        }
        .onAppear {
            animate = true
        }
        .allowsHitTesting(false)
    }
}

struct PadelCourtInteractionView: View {
    @Binding var selectedCoord: TargetCoordinate?
    let correctCoord: TargetCoordinate?
    let showResult: Bool

    var body: some View {
        VStack(spacing: 8) {
            Text("Klicka på banan för att välja din målpunkt")
                .font(.inter(.caption2))
                .foregroundStyle(AppColors.textSecondary)

            GeometryReader { geometry in
                ZStack {
                    // Court background
                    RoundedRectangle(cornerRadius: 8)
                        .fill(Color(hex: "2c3e50"))
                        .overlay(
                            RoundedRectangle(cornerRadius: 8)
                                .stroke(Color.white, lineWidth: 2)
                        )

                    // Court lines
                    // Net
                    Rectangle()
                        .fill(Color.white.opacity(0.8))
                        .frame(height: 1)
                        .position(x: geometry.size.width / 2, y: geometry.size.height / 2)

                    // Service lines
                    Rectangle()
                        .fill(Color.white.opacity(0.5))
                        .frame(height: 1)
                        .position(x: geometry.size.width / 2, y: geometry.size.height * 0.3)

                    Rectangle()
                        .fill(Color.white.opacity(0.5))
                        .frame(height: 1)
                        .position(x: geometry.size.width / 2, y: geometry.size.height * 0.7)

                    // Center lines
                    Rectangle()
                        .fill(Color.white.opacity(0.5))
                        .frame(width: 1, height: geometry.size.height * 0.4)
                        .position(x: geometry.size.width / 2, y: geometry.size.height * 0.2)

                    Rectangle()
                        .fill(Color.white.opacity(0.5))
                        .frame(width: 1, height: geometry.size.height * 0.4)
                        .position(x: geometry.size.width / 2, y: geometry.size.height * 0.8)

                    // Selected Target
                    if let selected = selectedCoord {
                        Circle()
                            .fill(AppColors.brandPrimary)
                            .frame(width: 12, height: 12)
                            .overlay(Circle().stroke(Color.white, lineWidth: 2))
                            .position(x: geometry.size.width * (selected.x / 100),
                                      y: geometry.size.height * (selected.y / 100))
                    }

                    // Correct Target
                    if showResult, let correct = correctCoord {
                        Circle()
                            .fill(AppColors.success)
                            .frame(width: 16, height: 16)
                            .overlay(Circle().stroke(Color.white, lineWidth: 2))
                            .position(x: geometry.size.width * (correct.x / 100),
                                      y: geometry.size.height * (correct.y / 100))
                    }
                }
                .contentShape(Rectangle())
                .onTapGesture { location in
                    guard !showResult else { return }
                    let x = (location.x / geometry.size.width) * 100
                    let y = (location.y / geometry.size.height) * 100
                    selectedCoord = TargetCoordinate(x: x, y: y)
                }
            }
            .aspectRatio(10/20, contentMode: .fit)
            .frame(maxWidth: 200)
            .padding(.bottom, 8)
        }
    }
}

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (1, 1, 1, 0)
        }

        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

struct ConfettiPiece: View {
    let color: Color
    var body: some View {
        Rectangle()
            .fill(color)
            .frame(width: CGFloat.random(in: 6...12), height: CGFloat.random(in: 6...12))
    }
}

extension Collection {
    subscript(safe index: Index) -> Element? {
        return indices.contains(index) ? self[index] : nil
    }
}
