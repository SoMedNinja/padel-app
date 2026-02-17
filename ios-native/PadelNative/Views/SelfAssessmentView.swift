import SwiftUI

struct SelfAssessmentLevel: Identifiable {
    let id: Double
    let label: String
    let description: String
    let improvements: [String]
}

struct SelfAssessmentOption: Identifiable, Hashable {
    let id = UUID()
    let text: String
    let points: Int
    let isTerminal: Bool
}

struct SelfAssessmentQuestion: Identifiable {
    let id: Int
    let text: String
    let options: [SelfAssessmentOption]
}

struct SelfAssessmentData {
    static let levels: [SelfAssessmentLevel] = [
        SelfAssessmentLevel(id: 0, label: "Nybörjare (0)", description: "Har aldrig spelat racketsport tidigare.", improvements: ["Boka en introduktionskurs", "Lär dig grundläggande regler", "Öva på att träffa bollen"]),
        SelfAssessmentLevel(id: 0.5, label: "Nybörjare (0.5)", description: "Inga lektioner. Spelat i mindre än 6 månader. Ingen teknik eller taktik.", improvements: ["Ta lektioner för att lära dig grepp och sving", "Fokusera på att hålla bollen i spel", "Lär dig positionering"]),
        SelfAssessmentLevel(id: 1.0, label: "Nybörjare (1.0)", description: "Inga eller få lektioner. Spelat i mindre än 12 månader. Ingen teknik eller taktik.", improvements: ["Öva på att returnera servar", "Jobba på grundläggande slag", "Spela matcher med andra nybörjare"]),
        SelfAssessmentLevel(id: 1.5, label: "Nybörjare / Medel (1.5)", description: "Få lektioner. Några matcher i månaden. Kan bolla och returnera i lågt tempo.", improvements: ["Öka säkerheten i slagen", "Lär dig glasväggarna", "Försök hålla bollen i spel längre"]),
        SelfAssessmentLevel(id: 2.0, label: "Nybörjare / Medel (2.0)", description: "Få lektioner. Minst 1 års spelande. Kan bolla och returnera i lågt tempo.", improvements: ["Förbättra riktningskontroll", "Öka tempot i spelet", "Arbeta på nätspel"]),
        SelfAssessmentLevel(id: 2.5, label: "Medel (2.5)", description: "Behärskar de flesta slag och kontrollerar riktning i normalt tempo.", improvements: ["Börja använda slice/spinn", "Minimera enkla misstag", "Lär dig lobba effektivt"]),
        SelfAssessmentLevel(id: 3.0, label: "Medel (3.0)", description: "Dominerar de flesta slag, spelar platt och driver bollen. Gör många oprovocerade misstag.", improvements: ["Minska oprovocerade misstag", "Utveckla slice på forehand/backhand", "Förbättra positionering vid nät"]),
        SelfAssessmentLevel(id: 3.5, label: "Medel (3.5)", description: "Kan spela slice forehand/backhand och placera bollen. Gör fortfarande en del misstag.", improvements: ["Öka säkerheten i placerade slag", "Arbeta på overhead-slag (bandeja/vibora)", "Bli bättre på att vända försvar till anfall"]),
        SelfAssessmentLevel(id: 4.0, label: "Medel / Hög (4.0)", description: "Behärskar de flesta slag och riktning. Kan spela med spinn. Gör få oprovocerade misstag.", improvements: ["Förbättra avslut och smash", "Öka tempot utan att tappa kontroll", "Utveckla spelförståelse"]),
        SelfAssessmentLevel(id: 4.5, label: "Medel / Hög (4.5)", description: "Behärskar slag och riktning där man vill. Sätter fart på bollen men har svårt att avgöra poäng.", improvements: ["Bli effektivare på att döda bollen", "Förbättra taktisk positionering", "Analysera motståndarens svagheter"]),
        SelfAssessmentLevel(id: 5.0, label: "Medel / Avancerad (5.0)", description: "Medelgod teknik och högt taktiskt tänkande. Redo för matcher med bra tempo.", improvements: ["Hantera högt tempo konsekvent", "Förfina specialslag", "Spela turneringar på högre nivå"]),
        SelfAssessmentLevel(id: 5.5, label: "Avancerad (5.5)", description: "Dominerar tekniska och taktiska färdigheter. Förberedd för spel i högt tempo.", improvements: ["Utveckla defensivt spel mot glas (bajadas)", "Optimera lagarbete och kommunikation", "Fysisk och mental uthållighet"]),
        SelfAssessmentLevel(id: 6.0, label: "Avancerad (6.0)", description: "Hårt slående med kontroll, djup och variation. Bra försvar, snabba bajadas. Läser spelet väl.", improvements: ["Tävla på elitnivå", "Maximal fysisk prestation", "Mental styrka i avgörande lägen"]),
        SelfAssessmentLevel(id: 7.0, label: "Elit (7.0)", description: "Professionell spelare. Topp 30 WPT.", improvements: ["Behåll världsranking", "Vinna stora titlar", "Sponsring och karriär"])
    ]

    static let questions: [SelfAssessmentQuestion] = [
        SelfAssessmentQuestion(id: 1, text: "Hur länge har du spelat padel?", options: [
            SelfAssessmentOption(text: "Har aldrig spelat", points: 0, isTerminal: true),
            SelfAssessmentOption(text: "Mindre än 6 månader", points: 3, isTerminal: false),
            SelfAssessmentOption(text: "6 till 12 månader", points: 10, isTerminal: false),
            SelfAssessmentOption(text: "Mer än 1 år", points: 15, isTerminal: false)
        ]),
        SelfAssessmentQuestion(id: 2, text: "Har du tagit några lektioner?", options: [
            SelfAssessmentOption(text: "Nej, inga alls", points: 0, isTerminal: false),
            SelfAssessmentOption(text: "Fåtal eller oregelbundet", points: 5, isTerminal: false),
            SelfAssessmentOption(text: "Ja, regelbundet med tränare", points: 10, isTerminal: false)
        ]),
        SelfAssessmentQuestion(id: 3, text: "Hur skulle du beskriva ditt bolltempo och rally?", options: [
            SelfAssessmentOption(text: "Har svårt att hålla bollen i spel", points: 0, isTerminal: false),
            SelfAssessmentOption(text: "Kan bolla i lågt tempo", points: 10, isTerminal: false),
            SelfAssessmentOption(text: "Håller normalt tempo med säkerhet", points: 20, isTerminal: false),
            SelfAssessmentOption(text: "Spelar i högt tempo utan problem", points: 30, isTerminal: false)
        ]),
        SelfAssessmentQuestion(id: 4, text: "Vilken teknik använder du mest?", options: [
            SelfAssessmentOption(text: "Ingen särskild teknik", points: 0, isTerminal: false),
            SelfAssessmentOption(text: "Mest platta slag (drive)", points: 10, isTerminal: false),
            SelfAssessmentOption(text: "Kan spela med slice/spinn", points: 15, isTerminal: false),
            SelfAssessmentOption(text: "Behärskar alla slagtyper (slice, toppspinn, platt)", points: 20, isTerminal: false)
        ]),
        SelfAssessmentQuestion(id: 5, text: "Hur ofta gör du oprovocerade misstag?", options: [
            SelfAssessmentOption(text: "Ofta (många enkla fel)", points: 0, isTerminal: false),
            SelfAssessmentOption(text: "Ibland", points: 5, isTerminal: false),
            SelfAssessmentOption(text: "Sällan (ganska säker)", points: 10, isTerminal: false),
            SelfAssessmentOption(text: "Mycket sällan (hög säkerhet)", points: 15, isTerminal: false)
        ]),
        SelfAssessmentQuestion(id: 6, text: "Hur är ditt taktiska spel och avslut?", options: [
            SelfAssessmentOption(text: "Tänker inte så mycket på taktik", points: 0, isTerminal: false),
            SelfAssessmentOption(text: "Har svårt att avgöra poängen", points: 5, isTerminal: false),
            SelfAssessmentOption(text: "Har bra spelförståelse och taktik", points: 10, isTerminal: false),
            SelfAssessmentOption(text: "Dominerar taktiskt och avgör ofta", points: 15, isTerminal: false)
        ]),
        SelfAssessmentQuestion(id: 7, text: "Hur hanterar du glasväggar och försvar?", options: [
            SelfAssessmentOption(text: "Undviker väggarna / Enbart grundslag", points: 0, isTerminal: false),
            SelfAssessmentOption(text: "Godkänt returspel från glas", points: 5, isTerminal: false),
            SelfAssessmentOption(text: "Avancerat försvar och snabba 'bajadas'", points: 10, isTerminal: false)
        ]),
        SelfAssessmentQuestion(id: 8, text: "Tävlar du i padel?", options: [
            SelfAssessmentOption(text: "Nej, spelar bara för skojs skull", points: 0, isTerminal: false),
            SelfAssessmentOption(text: "Ja, i seriespel eller turneringar", points: 5, isTerminal: false),
            SelfAssessmentOption(text: "Ja, professionellt (Topp 30 WPT)", points: 200, isTerminal: false)
        ])
    ]

    static func calculateLevel(score: Int) -> SelfAssessmentLevel {
        if score >= 200 { return levels.first { $0.id == 7.0 }! }
        if score >= 110 { return levels.first { $0.id == 6.0 }! }
        if score >= 96 { return levels.first { $0.id == 5.5 }! }
        if score >= 86 { return levels.first { $0.id == 5.0 }! }
        if score >= 79 { return levels.first { $0.id == 4.5 }! }
        if score >= 69 { return levels.first { $0.id == 4.0 }! }
        if score >= 59 { return levels.first { $0.id == 3.5 }! }
        if score >= 49 { return levels.first { $0.id == 3.0 }! }
        if score >= 39 { return levels.first { $0.id == 2.5 }! }
        if score >= 29 { return levels.first { $0.id == 2.0 }! }
        if score >= 19 { return levels.first { $0.id == 1.5 }! }
        if score >= 9 { return levels.first { $0.id == 1.0 }! }
        if score >= 1 { return levels.first { $0.id == 0.5 }! }
        return levels.first { $0.id == 0 }!
    }
}

struct SelfAssessmentView: View {
    @State private var step: Step = .intro
    @State private var currentQuestionIndex = 0
    @State private var totalScore = 0
    @State private var resultLevel: SelfAssessmentLevel?

    enum Step {
        case intro, quiz, result
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                switch step {
                case .intro:
                    introView
                case .quiz:
                    quizView
                case .result:
                    resultView
                }
            }
            .padding()
        }
        .background(AppColors.background)
        .navigationTitle("Nivåtest")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var introView: some View {
        SectionCard(title: "Vilken padelnivå är du?") {
            VStack(alignment: .leading, spacing: 16) {
                Text("Gör vårt snabba test (8 frågor) för att uppskatta din spelstyrka enligt Playtomic-skalan.\nFå tips på vad du behöver träna på för att nå nästa nivå!")
                    .font(.inter(.body))
                    .foregroundStyle(AppColors.textSecondary)

                Button {
                    startTest()
                } label: {
                    Label("Starta testet", systemImage: "play.fill")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
            }
        }
    }

    private var quizView: some View {
        let question = SelfAssessmentData.questions[currentQuestionIndex]
        let progress = Double(currentQuestionIndex) / Double(SelfAssessmentData.questions.count)

        return VStack(spacing: 16) {
            ProgressView(value: progress)
                .tint(AppColors.brandPrimary)

            SectionCard(title: "Fråga \(currentQuestionIndex + 1) av \(SelfAssessmentData.questions.count)") {
                VStack(alignment: .leading, spacing: 16) {
                    Text(question.text)
                        .font(.inter(.headline, weight: .bold))

                    ForEach(question.options) { option in
                        Button {
                            handleAnswer(option)
                        } label: {
                            Text(option.text)
                                .font(.inter(.body))
                                .padding()
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .background(
                                    RoundedRectangle(cornerRadius: 10)
                                        .stroke(AppColors.borderSubtle, lineWidth: 1)
                                )
                                .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
    }

    private var resultView: some View {
        VStack(spacing: 20) {
            if let level = resultLevel {
                SectionCard(title: "Din padelnivå") {
                    VStack(spacing: 16) {
                        Text("\(String(format: "%.1f", level.id))")
                            .font(.system(size: 60, weight: .black))
                            .foregroundStyle(AppColors.brandPrimary)

                        Text(level.label)
                            .font(.inter(.title3, weight: .bold))
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(AppColors.brandPrimary.opacity(0.1), in: Capsule())
                            .foregroundStyle(AppColors.brandPrimary)

                        Text(level.description)
                            .font(.inter(.body))
                            .multilineTextAlignment(.center)
                            .foregroundStyle(AppColors.textSecondary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                }

                SectionCard(title: "För att nå nästa nivå") {
                    VStack(alignment: .leading, spacing: 12) {
                        ForEach(level.improvements, id: \.self) { improvement in
                            HStack(alignment: .top, spacing: 12) {
                                Image(systemName: "checklist")
                                    .foregroundStyle(AppColors.success)
                                Text(improvement)
                                    .font(.inter(.subheadline))
                            }
                        }
                    }
                }

                Button {
                    restartTest()
                } label: {
                    Label("Gör om testet", systemImage: "arrow.counterclockwise")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
            }
        }
    }

    private func startTest() {
        step = .quiz
        currentQuestionIndex = 0
        totalScore = 0
        resultLevel = nil
    }

    private func handleAnswer(_ option: SelfAssessmentOption) {
        totalScore += option.points

        if option.isTerminal || currentQuestionIndex >= SelfAssessmentData.questions.count - 1 {
            finishTest()
        } else {
            currentQuestionIndex += 1
        }
    }

    private func finishTest() {
        resultLevel = SelfAssessmentData.calculateLevel(score: totalScore)
        step = .result
    }

    private func restartTest() {
        step = .intro
        currentQuestionIndex = 0
        totalScore = 0
        resultLevel = nil
    }
}
