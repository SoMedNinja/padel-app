export type PuzzleDifficulty = "easy" | "medium" | "hard";

export interface EditablePadelPuzzleOption {
  text: string;
  isCorrect: boolean;
}

export type PuzzleType = "text" | "tap-to-target" | "video";

export interface EditablePadelPuzzle {
  questionId: string;
  difficulty: PuzzleDifficulty;
  type?: PuzzleType;
  title: string;
  scenario: string;
  options: EditablePadelPuzzleOption[];
  coachingTip: string;
  diagramUrl?: string;
  videoUrl?: string;
  targetCoordinate?: { x: number; y: number };
}

// Note for non-coders:
// This is the only file you need to edit if you want new puzzle situations.
// Each puzzle must have exactly 3 options, and exactly 1 correct option.
export const editablePadelPuzzles: EditablePadelPuzzle[] = [
  {
    questionId: "188",
    difficulty: "easy",
    title: "Nätpress efter lobb",
    scenario:
      "Du och din partner försvarar långt bak. Motståndarna står stabilt vid nät. Du får en hög boll på backhandsidan med tid att slå en kontrollerad lobb mot hörnet på motståndarnas högerspelare.",
    options: [
      { text: "Slå en djup lobb och flytta fram tillsammans mot nätet.", isCorrect: true },
      { text: "Slå hårt rakt fram från bakplan för att vinna poängen direkt.", isCorrect: false },
      { text: "Stanna kvar bak även om lobben blir djup.", isCorrect: false },
    ],
    coachingTip: "När du får en bra lobb köper du tid. Använd den tiden till att flytta upp som ett par.",
  },
  {
    questionId: "189",
    difficulty: "easy",
    title: "Mittboll i försvar",
    scenario:
      "Ni står bak i banan och en snabb boll kommer mot mitten mellan er. Båda hinner ta den, men det finns risk för krock eller tvekan.",
    options: [
      { text: "Ropa tydligt tidigt och låt den spelare med bäst vinkel ta bollen.", isCorrect: true },
      { text: "Låt båda försöka samtidigt för att öka chans till träff.", isCorrect: false },
      { text: "Backa undan helt och hoppas att den andra tar den.", isCorrect: false },
    ],
    coachingTip: "Tydlig kommunikation löser fler poäng än perfekta slag.",
  },
  {
    questionId: "190",
    difficulty: "easy",
    title: "Retur på andraserve",
    scenario: "Du möter en långsam andraserve mot backhand. Servern står kvar nära mitten efter serve.",
    options: [
      { text: "Spela en säker retur lågt mot fötterna och ta position.", isCorrect: true },
      { text: "Försök avgöra direkt med full kraft ner längs linjen.", isCorrect: false },
      { text: "Chippa upp en kort boll i mitten utan plan.", isCorrect: false },
    ],
    coachingTip: "På andraserve är kontroll och riktning oftast bättre än maximal kraft.",
  },
  {
    questionId: "191",
    difficulty: "medium",
    title: "Bandeja under press",
    scenario:
      "Motståndaren lobbar dig på forehandsidan. Du hinner under bollen men är inte helt balanserad. Partnern håller nätposition nära mitten.",
    options: [
      { text: "Spela en kontrollerad bandeja djupt mot hörn och återställ position.", isCorrect: true },
      { text: "Smasha hårt även om bollhöjden är låg och riskabel.", isCorrect: false },
      { text: "Släpp bollen och ge bort nätet direkt.", isCorrect: false },
    ],
    coachingTip: "Bandeja handlar främst om kontroll och att behålla initiativet.",
  },
  {
    questionId: "192",
    difficulty: "medium",
    title: "Val efter glasstuds",
    scenario:
      "Du får en boll som studsar i bakglas och kommer ut något mot mitten. Motståndarna står framme men är lite osynkade i sidled.",
    options: [
      { text: "Spela en lugn boll mot mitten för att skapa tvekan och tid.", isCorrect: true },
      { text: "Slå hårt mot sidogallret utan säker träffpunkt.", isCorrect: false },
      { text: "Lyft en kort lobb som stannar halvvägs.", isCorrect: false },
    ],
    coachingTip: "En stabil mittboll kan vara taktiskt stark när motståndarna inte är samlade.",
  },
  {
    questionId: "193",
    difficulty: "medium",
    title: "Försvar till anfall",
    scenario:
      "Du och partnern är i försvar. Efter en längre duell får ni en chans med en djup lobb och ser att motståndarna backar.",
    options: [
      { text: "Flytta fram tillsammans i små steg och ta nätet kontrollerat.", isCorrect: true },
      { text: "Spring själv hela vägen till nät och lämna partnern kvar.", isCorrect: false },
      { text: "Stanna kvar bak även när motståndarna tappar nätet.", isCorrect: false },
    ],
    coachingTip: "Positionsspel i par är viktigare än en enskild snabb löpning.",
  },
  {
    questionId: "194",
    difficulty: "hard",
    title: "Tempoändring i duell",
    scenario:
      "Ni har ett snabbt volleyutbyte vid nät. Motståndarnas vänsterspelare börjar läsa era hårda cross-volleyer och kliver in i bollen.",
    options: [
      { text: "Bryt mönstret med en kontrollerad lägre boll mot mitten/fötter.", isCorrect: true },
      { text: "Öka tempot ytterligare med samma slag tills någon missar.", isCorrect: false },
      { text: "Backa direkt ner till baslinjen utan anledning.", isCorrect: false },
    ],
    coachingTip: "När motståndaren läser rytmen vinner du ofta på att byta höjd eller riktning.",
  },
  {
    questionId: "195",
    difficulty: "hard",
    title: "Serve + första boll",
    scenario:
      "Du servar från vänster sida. Returen blir låg mot mitten och din partner är redan nära nät men något felvänd.",
    options: [
      { text: "Spela första bollen säkert mot motståndarnas fötter och återta struktur.", isCorrect: true },
      { text: "Chansa direkt med en vinkelvolley nära sidogallret.", isCorrect: false },
      { text: "Lämna bollen till partnern trots att du har bättre läge.", isCorrect: false },
    ],
    coachingTip: "Första bollen efter serve sätter ofta kvaliteten i hela poängen.",
  },
  {
    questionId: "196",
    difficulty: "hard",
    title: "Matchboll under press",
    scenario:
      "Det är avgörande boll. Motståndarna attackerar nät. Du får en halvsvår backhand nära bakglas med begränsad tid.",
    options: [
      { text: "Prioritera en hög, djup lobb för att neutralisera pressen.", isCorrect: true },
      { text: "Försök med ett lågriskfritt stoppboll-försök från bakplan.", isCorrect: false },
      { text: "Slå så hårt du kan rakt fram utan balans.", isCorrect: false },
    ],
    coachingTip: "I pressade lägen är ett återställande slag ofta det smartaste beslutet.",
  },
  {
    questionId: "197",
    difficulty: "easy",
    title: "Rätt val efter serve",
    scenario:
      "Du har just servat och får tillbaka en låg retur mot mitten. Du står fortfarande i rörelse framåt och din partner håller nätet.",
    options: [
      { text: "Spela säkert mot fötterna och bygg poängen vidare.", isCorrect: true },
      { text: "Försök vinna direkt med hård halvvolley utan balans.", isCorrect: false },
      { text: "Låt bollen passera för att hoppas på väggstuds.", isCorrect: false },
    ],
    coachingTip: "Efter serve vill du först säkra struktur, sedan öka pressen.",
  },
  {
    questionId: "198",
    difficulty: "easy",
    title: "Lobbförsvar på tid",
    scenario:
      "Motståndarna pressar vid nät. Du har kort tid i bakplan men hinner få racket under bollen.",
    options: [
      { text: "Slå en hög och djup lobb för att få tillbaka tid.", isCorrect: true },
      { text: "Slå platt och hårt rakt på nätspelaren.", isCorrect: false },
      { text: "Försök med en kort stoppboll från baklinjen.", isCorrect: false },
    ],
    coachingTip: "När du är pressad är målet ofta att återställa läget, inte avgöra direkt.",
  },
  {
    questionId: "199",
    difficulty: "medium",
    title: "Cross eller mitten",
    scenario:
      "Du får en neutral boll från bakplan. Motståndarna står lite isär i mitten men täcker linjerna ganska bra.",
    options: [
      { text: "Spela kontrollerat mot mitten för att skapa osäkerhet mellan dem.", isCorrect: true },
      { text: "Pressa alltid hårt längs sidlinjen oavsett läge.", isCorrect: false },
      { text: "Slå kort lob utan höjd för att överraska.", isCorrect: false },
    ],
    coachingTip: "Mitten är ofta ett säkert taktiskt val när vinklarna är stängda.",
  },
  {
    questionId: "200",
    difficulty: "medium",
    title: "Väggboll till tempo",
    scenario:
      "Bollen går via bakglas och kommer ut bekvämt på din forehand. Du hinner sätta fötterna innan slaget.",
    options: [
      { text: "Spela en stabil djup boll och jobba tillbaka position.", isCorrect: true },
      { text: "Satsa på maxfart i svårt sidledsläge.", isCorrect: false },
      { text: "Chansa med stoppboll från långt bak.", isCorrect: false },
    ],
    coachingTip: "Kontroll efter vägg är ofta vägen till nästa bra attackläge.",
  },
  {
    questionId: "201",
    difficulty: "hard",
    title: "Poängbygge vid nät",
    scenario:
      "Ni har nätet och motståndarna försvarar djupt. De returnerar många bollar men utan fart.",
    options: [
      { text: "Bygg poängen med tålamod och variera riktning/höjd tills öppning kommer.", isCorrect: true },
      { text: "Försök avgöra varje boll på första volley.", isCorrect: false },
      { text: "Backa båda till baslinjen trots övertag.", isCorrect: false },
    ],
    coachingTip: "När du har övertag vid nät är tålamod ofta det mest offensiva beslutet.",
  },
  {
    questionId: "202",
    difficulty: "hard",
    title: "Krisläge i hörn",
    scenario:
      "Du hamnar djupt i hörnet och bollen studsar lågt efter glas. Motståndarna väntar på en kort retur.",
    options: [
      { text: "Prioritera en hög defensiv lobb och återhämta position.", isCorrect: true },
      { text: "Försök slå vinnare längs linjen från obalans.", isCorrect: false },
      { text: "Spela hårt i mitten i axelhöjd till nätspelarna.", isCorrect: false },
    ],
    coachingTip: "I hörnkris är ett smart neutralt slag nästan alltid bättre än ett chansslag.",
  },
  {
    questionId: "v1",
    difficulty: "easy",
    title: "Diagram: Grundläggande Serve",
    scenario: "Studera diagrammet. Vilket är det viktigaste steget för en regelrätt serve?",
    diagramUrl: "/education/video-serve.svg",
    options: [
      { text: "Att bollen träffas under midjehöjd.", isCorrect: true },
      { text: "Att man hoppar vid träffögonblicket.", isCorrect: false },
      { text: "Att bollen träffas över axeln.", isCorrect: false },
    ],
    coachingTip: "Enligt reglerna måste bollen vid serve träffas vid eller under midjehöjd.",
  },
  {
    questionId: "v2",
    difficulty: "medium",
    title: "Diagram: Positionering vid nät",
    scenario: "Se diagrammet. Vad gör spelarna när motståndaren slår en lobb?",
    diagramUrl: "/education/video-net-position.svg",
    options: [
      { text: "De backar tillsammans för att täcka bakplan.", isCorrect: true },
      { text: "En stannar vid nät medan den andra backar.", isCorrect: false },
      { text: "Båda rusar mot nätet för att smasha.", isCorrect: false },
    ],
    coachingTip: "Synkroniserad rörelse bakåt på lobb är avgörande för att behålla försvarsstrukturen.",
  },
  {
    questionId: "v3",
    difficulty: "hard",
    title: "Diagram: Avancerad Bandeja",
    scenario: "Studera diagrammet. Vad är huvudsyftet med detta specifika slag?",
    diagramUrl: "/education/video-bandeja.svg",
    options: [
      { text: "Att behålla nätposition genom kontroll.", isCorrect: true },
      { text: "Att slå bollen så hårt som möjligt för att vinna poängen.", isCorrect: false },
      { text: "Att få bollen att studsa över gallret.", isCorrect: false },
    ],
    coachingTip: "Bandejan används primärt för att neutralisera en lobb och behålla initiativet vid nät.",
  },
  {
    questionId: "t1",
    difficulty: "easy",
    type: "tap-to-target",
    title: "Vart ska serven sitta?",
    scenario: "Du ska serva från höger sida. Klicka på den del av banan där serven ska landa för att vara giltig.",
    diagramUrl: "/education/rules-serve.svg",
    targetCoordinate: { x: 0.25, y: 0.75 },
    options: [
      { text: "Diagonal serveruta", isCorrect: true },
      { text: "Rakt fram", isCorrect: false },
      { text: "Utanför linjen", isCorrect: false },
    ],
    coachingTip: "Serven måste alltid landa i den diagonala serverutan på motståndarens sida.",
  },
  {
    questionId: "t2",
    difficulty: "medium",
    type: "tap-to-target",
    title: "Hitta luckan",
    scenario: "Motståndarna täcker linjerna väl men lämnar en lucka. Klicka på banan där du bör placera bollen för att skapa mest osäkerhet.",
    diagramUrl: "/education/offense-positions.svg",
    targetCoordinate: { x: 0.5, y: 0.5 },
    options: [
      { text: "I mitten mellan spelarna", isCorrect: true },
      { text: "Hårt mot sidogallret", isCorrect: false },
      { text: "Långt bak i hörnet", isCorrect: false },
    ],
    coachingTip: "Mitten är ofta den säkraste och mest effektiva platsen att spela på när motståndarna täcker kanterna.",
  },
  {
    questionId: "t3",
    difficulty: "hard",
    type: "tap-to-target",
    title: "Defensiv placering",
    scenario: "Du är under hård press i hörnet. Vart är det säkrast att placera din lobb för att vinna tid? Klicka på målområdet.",
    diagramUrl: "/education/defense-reset.svg",
    targetCoordinate: { x: 0.75, y: 0.9 },
    options: [
      { text: "Djupt i motståndarens hörn", isCorrect: true },
      { text: "Kort i mitten", isCorrect: false },
      { text: "Hårt på nätspelaren", isCorrect: false },
    ],
    coachingTip: "En djup lobb mot hörnet ger dig och din partner maximal tid att återta era positioner.",
  },
];
