import Foundation

enum PuzzleDifficulty: String, Codable, CaseIterable, Identifiable {
    case easy
    case medium
    case hard

    var id: String { rawValue }

    var label: String {
        switch self {
        case .easy: return "Easy"
        case .medium: return "Medium"
        case .hard: return "Hard"
        }
    }

    var description: String {
        switch self {
        case .easy: return "Grundläggande beslut i tydliga lägen."
        case .medium: return "Mer positionsspel och val under tidspress."
        case .hard: return "Avancerade matchlägen med små marginaler."
        }
    }
}

struct PadelPuzzle: Identifiable, Codable, Equatable {
    let id: String
    let difficulty: PuzzleDifficulty
    let title: String
    let scenario: String
    let options: [String]
    let correctAnswer: String
    let coachingTip: String

    // Identifiable requirement
    var questionId: String { id }
}

struct PadelPuzzleAnswerRecord: Codable, Identifiable {
    var id: String { questionId }
    let questionId: String
    let difficulty: PuzzleDifficulty
    let selectedAnswer: String
    let correctAnswer: String
    let isCorrect: Bool
    let answeredAt: Date
}

struct PadelPuzzleData {
    static let puzzles: [PadelPuzzle] = [
        PadelPuzzle(
            id: "188",
            difficulty: .easy,
            title: "Nätpress efter lobb",
            scenario: "Du och din partner försvarar långt bak. Motståndarna står stabilt vid nät. Du får en hög boll på backhandsidan med tid att slå en kontrollerad lobb mot hörnet på motståndarnas högerspelare.",
            options: ["Slå en djup lobb och flytta fram tillsammans mot nätet.", "Slå hårt rakt fram från bakplan för att vinna poängen direkt.", "Stanna kvar bak även om lobben blir djup."],
            correctAnswer: "Slå en djup lobb och flytta fram tillsammans mot nätet.",
            coachingTip: "När du får en bra lobb köper du tid. Använd den tiden till att flytta upp som ett par."
        ),
        PadelPuzzle(
            id: "189",
            difficulty: .easy,
            title: "Mittboll i försvar",
            scenario: "Ni står bak i banan och en snabb boll kommer mot mitten mellan er. Båda hinner ta den, men det finns risk för krock eller tvekan.",
            options: ["Ropa tydligt tidigt och låt den spelare med bäst vinkel ta bollen.", "Låt båda försöka samtidigt för att öka chans till träff.", "Backa undan helt och hoppas att den andra tar den."],
            correctAnswer: "Ropa tydligt tidigt och låt den spelare med bäst vinkel ta bollen.",
            coachingTip: "Tydlig kommunikation löser fler poäng än perfekta slag."
        ),
        PadelPuzzle(
            id: "190",
            difficulty: .easy,
            title: "Retur på andraserve",
            scenario: "Du möter en långsam andraserve mot backhand. Servern står kvar nära mitten efter serve.",
            options: ["Spela en säker retur lågt mot fötterna och ta position.", "Försök avgöra direkt med full kraft ner längs linjen.", "Chippa upp en kort boll i mitten utan plan."],
            correctAnswer: "Spela en säker retur lågt mot fötterna och ta position.",
            coachingTip: "På andraserve är kontroll och riktning oftast bättre än maximal kraft."
        ),
        PadelPuzzle(
            id: "191",
            difficulty: .medium,
            title: "Bandeja under press",
            scenario: "Motståndaren lobbar dig på forehandsidan. Du hinner under bollen men är inte helt balanserad. Partnern håller nätposition nära mitten.",
            options: ["Spela en kontrollerad bandeja djupt mot hörn och återställ position.", "Smasha hårt även om bollhöjden är låg och riskabel.", "Släpp bollen och ge bort nätet direkt."],
            correctAnswer: "Spela en kontrollerad bandeja djupt mot hörn och återställ position.",
            coachingTip: "Bandeja handlar främst om kontroll och att behålla initiativet."
        ),
        PadelPuzzle(
            id: "192",
            difficulty: .medium,
            title: "Val efter glasstuds",
            scenario: "Du får en boll som studsar i bakglas och kommer ut något mot mitten. Motståndarna står framme men är lite osynkade i sidled.",
            options: ["Spela en lugn boll mot mitten för att skapa tvekan och tid.", "Slå hårt mot sidogallret utan säker träffpunkt.", "Lyft en kort lobb som stannar halvvägs."],
            correctAnswer: "Spela en lugn boll mot mitten för att skapa tvekan och tid.",
            coachingTip: "En stabil mittboll kan vara taktiskt stark när motståndarna inte är samlade."
        ),
        PadelPuzzle(
            id: "193",
            difficulty: .medium,
            title: "Försvar till anfall",
            scenario: "Du och partnern är i försvar. Efter en längre duell får ni en chans med en djup lobb och ser att motståndarna backar.",
            options: ["Flytta fram tillsammans i små steg och ta nätet kontrollerat.", "Spring själv hela vägen till nät och lämna partnern kvar.", "Stanna kvar bak även när motståndarna tappar nätet."],
            correctAnswer: "Flytta fram tillsammans i små steg och ta nätet kontrollerat.",
            coachingTip: "Positionsspel i par är viktigare än en enskild snabb löpning."
        ),
        PadelPuzzle(
            id: "194",
            difficulty: .hard,
            title: "Tempoändring i duell",
            scenario: "Ni har ett snabbt volleyutbyte vid nät. Motståndarnas vänsterspelare börjar läsa era hårda cross-volleyer och kliver in i bollen.",
            options: ["Bryt mönstret med en kontrollerad lägre boll mot mitten/fötter.", "Öka tempot ytterligare med samma slag tills någon missar.", "Backa direkt ner till baslinjen utan anledning."],
            correctAnswer: "Bryt mönstret med en kontrollerad lägre boll mot mitten/fötter.",
            coachingTip: "När motståndaren läser rytmen vinner du ofta på att byta höjd eller riktning."
        ),
        PadelPuzzle(
            id: "195",
            difficulty: .hard,
            title: "Serve + första boll",
            scenario: "Du servar från vänster sida. Returen blir låg mot mitten och din partner är redan nära nät men något felvänd.",
            options: ["Spela första bollen säkert mot motståndarnas fötter och återta struktur.", "Chansa direkt med en vinkelvolley nära sidogallret.", "Lämna bollen till partnern trots att du har bättre läge."],
            correctAnswer: "Spela första bollen säkert mot motståndarnas fötter och återta struktur.",
            coachingTip: "Första bollen efter serve sätter ofta kvaliteten i hela poängen."
        ),
        PadelPuzzle(
            id: "196",
            difficulty: .hard,
            title: "Matchboll under press",
            scenario: "Det är avgörande boll. Motståndarna attackerar nät. Du får en halvsvår backhand nära bakglas med begränsad tid.",
            options: ["Prioritera en hög, djup lobb för att neutralisera pressen.", "Försök med ett lågriskfritt stoppboll-försök från bakplan.", "Slå så hårt du kan rakt fram utan balans."],
            correctAnswer: "Prioritera en hög, djup lobb för att neutralisera pressen.",
            coachingTip: "I pressade lägen är ett återställande slag ofta det smartaste beslutet."
        ),
        PadelPuzzle(
            id: "197",
            difficulty: .easy,
            title: "Rätt val efter serve",
            scenario: "Du har just servat och får tillbaka en låg retur mot mitten. Du står fortfarande i rörelse framåt och din partner håller nätet.",
            options: ["Spela säkert mot fötterna och bygg poängen vidare.", "Försök vinna direkt med hård halvvolley utan balans.", "Lämna bollen till partnern trots att du hinner."],
            correctAnswer: "Spela säkert mot fötterna och bygg poängen vidare.",
            coachingTip: "Efter serve vill du först säkra struktur, sedan öka pressen."
        ),
        PadelPuzzle(
            id: "198",
            difficulty: .easy,
            title: "Lobbförsvar på tid",
            scenario: "Motståndarna pressar vid nät. Du har kort tid i bakplan men hinner få racket under bollen.",
            options: ["Slå en hög och djup lobb för att få tillbaka tid.", "Slå platt och hårt rakt på nätspelaren.", "Försök med en kort stoppboll från baklinjen."],
            correctAnswer: "Slå en hög och djup lobb för att få tillbaka tid.",
            coachingTip: "När du är pressad är målet ofta att återställa läget, inte avgöra direkt."
        ),
        PadelPuzzle(
            id: "199",
            difficulty: .medium,
            title: "Cross eller mitten",
            scenario: "Du får en neutral boll från bakplan. Motståndarna står lite isär i mitten men täcker linjerna ganska bra.",
            options: ["Spela kontrollerat mot mitten för att skapa osäkerhet mellan dem.", "Pressa alltid hårt längs sidlinjen oavsett läge.", "Slå kort lob utan höjd för att överraska."],
            correctAnswer: "Spela kontrollerat mot mitten för att skapa osäkerhet mellan dem.",
            coachingTip: "Mitten är ofta ett säkert taktiskt val när vinklarna är stängda."
        ),
        PadelPuzzle(
            id: "200",
            difficulty: .medium,
            title: "Väggboll till tempo",
            scenario: "Bollen går via bakglas och kommer ut bekvämt på din forehand. Du hinner sätta fötterna innan slaget.",
            options: ["Spela en stabil djup boll och jobba tillbaka position.", "Satsa på maxfart i svårt sidledsläge.", "Chansa med stoppboll från långt bak."],
            correctAnswer: "Spela en stabil djup boll och jobba tillbaka position.",
            coachingTip: "Kontroll efter vägg är ofta vägen till nästa bra attackläge."
        ),
        PadelPuzzle(
            id: "201",
            difficulty: .hard,
            title: "Poängbygge vid nät",
            scenario: "Ni har nätet och motståndarna försvarar djupt. De returnerar många bollar men utan fart.",
            options: ["Bygg poängen med tålamod och variera riktning/höjd tills öppning kommer.", "Försök avgöra varje boll på första volley.", "Backa båda till baslinjen trots övertag."],
            correctAnswer: "Bygg poängen med tålamod och variera riktning/höjd tills öppning kommer.",
            coachingTip: "När du har övertag vid nät är tålamod ofta det mest offensiva beslutet."
        ),
        PadelPuzzle(
            id: "202",
            difficulty: .hard,
            title: "Krisläge i hörn",
            scenario: "Du hamnar djupt i hörnet och bollen studsar lågt efter glas. Motståndarna väntar på en kort retur.",
            options: ["Prioritera en hög defensiv lobb och återhämta position.", "Försök slå vinnare längs linjen från obalans.", "Spela hårt i mitten i axelhöjd till nätspelarna."],
            correctAnswer: "Prioritera en hög defensiv lobb och återhämta position.",
            coachingTip: "I hörnkris är ett smart neutralt slag nästan alltid bättre än ett chansslag."
        )
    ]
}
