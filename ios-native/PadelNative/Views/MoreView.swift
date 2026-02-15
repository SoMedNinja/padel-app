import SwiftUI

struct MoreView: View {
    @EnvironmentObject private var viewModel: AppViewModel
    @State private var pullProgress: CGFloat = 0
    @State private var isPullRefreshing = false
    @State private var pullOffsetBaseline: CGFloat?
    @State private var isDeepLinkedAdminActive = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    ScrollOffsetTracker()
                    PadelRefreshHeader(isRefreshing: isPullRefreshing, pullProgress: pullProgress)

                    VStack(spacing: 0) {
                        moreLink(title: "Historik", icon: "clock.arrow.circlepath") {
                            HistoryView()
                        }

                        Divider().padding(.leading, 44)

                        if viewModel.canSeeTournament {
                            moreLink(title: "Turnering", icon: "trophy") {
                                TournamentView()
                            }
                            Divider().padding(.leading, 44)
                        }

                        if viewModel.canUseAdmin {
                            moreLink(title: "Admin", icon: "person.badge.key") {
                                AdminView()
                            }
                            Divider().padding(.leading, 44)
                        }

                        moreLink(title: "Utbildning", icon: "book.pages") {
                            EducationTopicsView(userKey: educationUserKey)
                        }
                        Divider().padding(.leading, 44)

                        moreLink(title: "Inställningar", icon: "gearshape") {
                            SettingsView()
                        }
                    }
                    .padelSurfaceCard()

                    // Note for non-coders: this is the modern iOS navigation API for opening screens in code (for deep links).
                    Color.clear
                        .frame(width: 0, height: 0)
                }
                .padding()
            }
            .navigationTitle("Mer")
            .navigationBarTitleDisplayMode(.inline)
            .background(AppColors.background)
            .coordinateSpace(name: "padelScroll")
            .onPreferenceChange(ScrollOffsetPreferenceKey.self) { offset in
                if !isPullRefreshing,
                   pullOffsetBaseline == nil || offset < (pullOffsetBaseline ?? offset) {
                    pullOffsetBaseline = offset
                }

                let normalizedOffset = PullToRefreshBehavior.normalizedOffset(offset, baseline: pullOffsetBaseline)
                pullProgress = PullToRefreshBehavior.progress(for: normalizedOffset)
            }
            .refreshable {
                await PullToRefreshBehavior.performRefresh(isPullRefreshing: $isPullRefreshing) {
                    await viewModel.bootstrap()
                }
            }
            .onChange(of: viewModel.shouldOpenAdminFromDeepLink) { _, shouldOpenAdmin in
                guard shouldOpenAdmin else { return }
                // Note for non-coders: deep links can open a screen without the user tapping it manually.
                isDeepLinkedAdminActive = true
                viewModel.consumeOpenAdminFromDeepLinkFlag()
            }
            .navigationDestination(isPresented: $isDeepLinkedAdminActive) {
                AdminView()
            }
            .padelLiquidGlassChrome()
        }
    }

    // Note for non-coders: we save quiz lock state per signed-in profile so each player has their own one-time quiz history.
    private var educationUserKey: String {
        viewModel.currentPlayer?.id.uuidString ?? "guest"
    }

    private func moreLink<Destination: View>(title: String, icon: String, @ViewBuilder destination: () -> Destination) -> some View {
        NavigationLink(destination: destination) {
            HStack(spacing: 12) {
                Image(systemName: icon)
                    .font(.headline)
                    .foregroundStyle(AppColors.brandPrimary)
                    .frame(width: 32)

                Text(title)
                    .font(.inter(.body))
                    .foregroundStyle(AppColors.textPrimary)

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.caption.bold())
                    .foregroundStyle(AppColors.textSecondary.opacity(0.5))
            }
            .padding(.vertical, 14)
            .padding(.horizontal, 16)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}

private struct EducationTopic: Identifiable {
    let id: String
    let title: String
    let summary: String
    let symbol: String
    let badgeId: String
    let badgeLabel: String
    let badgeIcon: String
    let articleParagraphs: [String]
    let quiz: [EducationQuizQuestion]
}

private struct EducationQuizQuestion: Identifiable {
    let id: String
    let question: String
    let options: [String]
    let correctAnswer: String
}

private struct EducationCompletion: Codable {
    let topicId: String
    let badgeId: String
    let badgeLabel: String
    let badgeIcon: String
    let answeredAtISO8601: String
    let correctCount: Int
    let answers: [String: String]
}

private enum EducationCompletionStore {
    private static let keyPrefix = "education-quiz-completion-v1"

    static func load(userKey: String) -> [String: EducationCompletion] {
        let storageKey = "\(keyPrefix):\(userKey)"
        guard let data = UserDefaults.standard.data(forKey: storageKey) else {
            return [:]
        }

        let decoded = try? JSONDecoder().decode([String: EducationCompletion].self, from: data)
        return decoded ?? [:]
    }

    static func save(_ map: [String: EducationCompletion], userKey: String) {
        let storageKey = "\(keyPrefix):\(userKey)"
        guard let data = try? JSONEncoder().encode(map) else { return }
        UserDefaults.standard.set(data, forKey: storageKey)
    }
}

private struct EducationTopicsView: View {
    let userKey: String

    @State private var completions: [String: EducationCompletion] = [:]

    private let topics: [EducationTopic] = [
        EducationTopic(
            id: "mexicana",
            title: "Så spelas Mexicana",
            summary: "Roterande lag i korta matcher med individuella poäng.",
            symbol: "arrow.triangle.2.circlepath",
            badgeId: "education-mexicana",
            badgeLabel: "Mexicana-mästare",
            badgeIcon: "🔁",
            articleParagraphs: [
                "Mexicana är ett socialt padelformat där lagkamrater och motståndare roterar efter varje kort match.",
                "Poängen räknas oftast per spelare, och tabellen används för att skapa jämnare nästa omgång.",
                "Formatet passar bra när många vill spela på kort tid och möta flera olika spelare."
            ],
            quiz: [
                EducationQuizQuestion(
                    id: "mexicana-q1",
                    question: "Vad är kärnan i Mexicana?",
                    options: ["Ett långt slutspel", "Frekvent rotation av spelare", "Spel utan poäng"],
                    correctAnswer: "Frekvent rotation av spelare"
                )
            ]
        ),
        EducationTopic(
            id: "americano",
            title: "Så spelas Americano",
            summary: "Poängrace där varje boll över flera rundor är viktig.",
            symbol: "flag.pattern.checkered",
            badgeId: "education-americano",
            badgeLabel: "Americano-strateg",
            badgeIcon: "🏁",
            articleParagraphs: [
                "Americano spelas ofta som ett poängrace över många korta rundor med roterande lag.",
                "I stället för utslagning handlar det om att samla så många poäng som möjligt totalt.",
                "Jämn nivå och få enkla misstag är ofta viktigare än att jaga svåra vinnarslag."
            ],
            quiz: [
                EducationQuizQuestion(
                    id: "americano-q1",
                    question: "Vad avgör oftast placeringen i Americano?",
                    options: ["Högsta smashhastighet", "Totala poäng", "Första matchens resultat"],
                    correctAnswer: "Totala poäng"
                )
            ]
        ),
        EducationTopic(
            id: "types-of-shots",
            title: "Olika slag i padel",
            summary: "Grundläggande översikt över vanliga slagtyper.",
            symbol: "figure.tennis",
            badgeId: "education-shots",
            badgeLabel: "Slag-kännare",
            badgeIcon: "🎾",
            articleParagraphs: [
                "I padel används flera olika slag beroende på situation: grundslag, volley, lobb, bandeja och vibora.",
                "Ett säkert grundslag bygger dueller, volley tar tid från motståndaren, och lobb används för att ta tillbaka nätet.",
                "Bandeja och vibora är kontrollerade overheadslag för att behålla initiativet utan att ge enkla kontringar."
            ],
            quiz: [
                EducationQuizQuestion(
                    id: "shots-q1",
                    question: "Vilket slag används ofta för att återta nätposition?",
                    options: ["Lobb", "Droppshot", "Rak hård volley varje gång"],
                    correctAnswer: "Lobb"
                ),
                EducationQuizQuestion(
                    id: "shots-q2",
                    question: "Vad är ett vanligt mål med bandeja/vibora?",
                    options: ["Maximal kraft", "Behålla kontroll och initiativ", "Alltid avgöra direkt"],
                    correctAnswer: "Behålla kontroll och initiativ"
                )
            ]
        ),
        EducationTopic(
            id: "movement",
            title: "Rörelse under spelet",
            summary: "Hur du och din partner rör er som ett lag.",
            symbol: "figure.run",
            badgeId: "education-movement",
            badgeLabel: "Rörelse-coach",
            badgeIcon: "🏃",
            articleParagraphs: [
                "I dubbel ska ni röra er tillsammans. När en spelare går framåt ska partnern oftast följa med.",
                "Efter varje slag är målet att snabbt återgå till en balanserad utgångsposition.",
                "Tydlig kommunikation om lobb, mittenboll och byte minskar missförstånd."
            ],
            quiz: [
                EducationQuizQuestion(
                    id: "movement-q1",
                    question: "Hur bör dubbelpartners normalt röra sig?",
                    options: ["Som två separata singelspelare", "Som en samordnad enhet", "Bara sidledes"],
                    correctAnswer: "Som en samordnad enhet"
                )
            ]
        ),
        EducationTopic(
            id: "rules",
            title: "Regler i padel",
            summary: "Korta grunder för serve, studs och glas.",
            symbol: "book.closed",
            badgeId: "education-rules",
            badgeLabel: "Regelproffs",
            badgeIcon: "📘",
            articleParagraphs: [
                "Serve ska slås under midjehöjd efter en studs och diagonalt till rätt serveruta.",
                "Bollen får studsa i golvet och sedan träffa glas, men inte tvärtom på den egna sidan.",
                "Poängräkning följer normalt tennismodellen: 15, 30, 40 och game."
            ],
            quiz: [
                EducationQuizQuestion(
                    id: "rules-q1",
                    question: "Hur ska en giltig serve inledas?",
                    options: ["Direkt i luften över huvudet", "Efter studs och under midjehöjd", "Valfritt så länge den går in"],
                    correctAnswer: "Efter studs och under midjehöjd"
                )
            ]
        ),
        EducationTopic(
            id: "offense",
            title: "Spela offensivt",
            summary: "Tryck, nätposition och beslut i anfall.",
            symbol: "arrow.up.forward",
            badgeId: "education-offense",
            badgeLabel: "Anfallsmotor",
            badgeIcon: "🔥",
            articleParagraphs: [
                "Offensivt spel bygger ofta på att vinna nätposition och hålla motståndarna bakom baslinjen.",
                "Placering är oftast viktigare än rå kraft; bollar mot fötter och hörn skapar svåra returer.",
                "Välj rätt läge för avgörande slag och undvik onödiga risker i fel läge."
            ],
            quiz: [
                EducationQuizQuestion(
                    id: "offense-q1",
                    question: "Vad är en central del i offensivt padelspel?",
                    options: ["Stå kvar långt bak", "Kontrollera nätposition", "Alltid slå hårdast möjligt"],
                    correctAnswer: "Kontrollera nätposition"
                )
            ]
        ),
        EducationTopic(
            id: "defense",
            title: "Spela defensivt",
            summary: "Bygg tålamod, höjd och bättre återhämtning.",
            symbol: "shield",
            badgeId: "education-defense",
            badgeLabel: "Försvarsgeneral",
            badgeIcon: "🛡️",
            articleParagraphs: [
                "Defensivt spel handlar om att köpa tid, neutralisera press och vänta in rätt läge att vända duellen.",
                "Djupa bollar med höjd och smart användning av glas hjälper dig att komma tillbaka i position.",
                "När du är pressad är målet ofta att spela säkert och skapa möjlighet till en lobb som flyttar fram laget."
            ],
            quiz: [
                EducationQuizQuestion(
                    id: "defense-q1",
                    question: "Vad är ett bra defensivt mål under press?",
                    options: ["Snabbt avgöra varje boll", "Skapa tid och återta position", "Undvika glas helt"],
                    correctAnswer: "Skapa tid och återta position"
                )
            ]
        )
    ]

    var body: some View {
        List {
            ForEach(topics) { topic in
                NavigationLink {
                    EducationArticleQuizView(
                        topic: topic,
                        completion: completions[topic.id],
                        onComplete: { record in
                            guard completions[topic.id] == nil else { return }
                            completions[topic.id] = record
                            EducationCompletionStore.save(completions, userKey: userKey)
                        }
                    )
                } label: {
                    HStack(spacing: 12) {
                        Image(systemName: topic.symbol)
                            .foregroundStyle(AppColors.brandPrimary)
                            .frame(width: 24)
                        VStack(alignment: .leading, spacing: 4) {
                            Text(topic.title)
                                .font(.inter(.body, weight: .semibold))
                                .foregroundStyle(AppColors.textPrimary)
                            Text(topic.summary)
                                .font(.inter(.caption))
                                .foregroundStyle(AppColors.textSecondary)
                        }
                        Spacer()
                        if let completion = completions[topic.id] {
                            Text("\(completion.badgeIcon) \(completion.badgeLabel)")
                                .font(.inter(.caption, weight: .semibold))
                                .foregroundStyle(AppColors.success)
                                .multilineTextAlignment(.trailing)
                        }
                    }
                    .padding(.vertical, 6)
                }
            }
        }
        .navigationTitle("Utbildning")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            completions = EducationCompletionStore.load(userKey: userKey)
        }
    }
}

private struct EducationArticleQuizView: View {
    let topic: EducationTopic
    let completion: EducationCompletion?
    let onComplete: (EducationCompletion) -> Void

    @State private var selectedAnswers: [String: String] = [:]

    private var isCompleted: Bool { completion != nil }
    private var allAnswered: Bool {
        topic.quiz.allSatisfy { selectedAnswers[$0.id] != nil }
    }
    private var correctCount: Int {
        topic.quiz.reduce(0) { partialResult, question in
            partialResult + (selectedAnswers[question.id] == question.correctAnswer ? 1 : 0)
        }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text(topic.title)
                    .font(.inter(.title3, weight: .bold))
                    .foregroundStyle(AppColors.textPrimary)

                // Note for non-coders: this is a simple visual row that makes each article feel more illustrative.
                HStack(spacing: 12) {
                    Image(systemName: topic.symbol)
                    Image(systemName: "arrow.right")
                    Image(systemName: "checkmark.seal.fill")
                        .foregroundStyle(.green)
                    Text("Läs, visualisera och slutför quizet en gång")
                        .font(.inter(.footnote))
                }
                .padding(12)
                .background(AppColors.brandPrimary.opacity(0.08), in: RoundedRectangle(cornerRadius: 12, style: .continuous))

                ForEach(topic.articleParagraphs, id: \.self) { paragraph in
                    Text(paragraph)
                        .font(.inter(.body))
                        .foregroundStyle(AppColors.textSecondary)
                }

                Divider()

                Text("Quiz (en gång)")
                    .font(.inter(.headline, weight: .bold))

                if isCompleted, let completion {
                    Text("Du har redan slutfört detta quiz och fått badgen \(completion.badgeIcon) \(completion.badgeLabel).")
                        .font(.inter(.footnote, weight: .semibold))
                        .foregroundStyle(AppColors.success)
                }

                ForEach(topic.quiz) { question in
                    VStack(alignment: .leading, spacing: 8) {
                        Text(question.question)
                            .font(.inter(.body, weight: .semibold))

                        ForEach(question.options, id: \.self) { option in
                            Button {
                                guard !isCompleted else { return }
                                selectedAnswers[question.id] = option
                            } label: {
                                HStack {
                                    Text(option)
                                    Spacer()
                                    if selectedAnswers[question.id] == option,
                                       option == question.correctAnswer {
                                        Image(systemName: "checkmark.circle.fill")
                                            .foregroundStyle(.green)
                                    }
                                }
                                .font(.inter(.footnote))
                                .padding(.horizontal, 12)
                                .padding(.vertical, 10)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .background(
                                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                                        .fill(AppColors.surfaceMuted)
                                )
                            }
                            .buttonStyle(.plain)
                            .disabled(isCompleted)
                        }
                    }
                }

                if !isCompleted {
                    Button {
                        guard allAnswered else { return }
                        // Note for non-coders: we lock the quiz forever after this tap, no retry button is shown.
                        onComplete(
                            EducationCompletion(
                                topicId: topic.id,
                                badgeId: topic.badgeId,
                                badgeLabel: topic.badgeLabel,
                                badgeIcon: topic.badgeIcon,
                                answeredAtISO8601: ISO8601DateFormatter().string(from: Date()),
                                correctCount: correctCount,
                                answers: selectedAnswers
                            )
                        )
                    } label: {
                        Text("Slutför quiz och lås badge")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(!allAnswered)
                }

                Text("Resultat: \(correctCount)/\(topic.quiz.count)")
                    .font(.inter(.footnote, weight: .semibold))
                    .foregroundStyle(AppColors.brandPrimary)
            }
            .padding()
        }
        .background(AppColors.background)
        .navigationTitle(topic.title)
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            selectedAnswers = completion?.answers ?? selectedAnswers
        }
    }
}
