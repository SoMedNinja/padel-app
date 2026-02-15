export interface EditableQuizOption {
  text: string;
  isCorrect: boolean;
}

export interface EditableQuizQuestion {
  id: string;
  question: string;
  answers: EditableQuizOption[];
}

export interface EditableEducationArticleIllustration {
  src: string;
  alt: string;
  caption: string;
}

export interface EditableEducationTopic {
  id: string;
  title: string;
  summary: string;
  illustration: "sports_tennis" | "shuffle" | "flag" | "directions_run" | "gavel" | "north" | "shield";
  badgeId: string;
  badgeLabel: string;
  badgeIcon: string;
  article: string[];
  articleIllustrations: EditableEducationArticleIllustration[];
  quiz: EditableQuizQuestion[];
}

// Note for non-coders:
// This file is made to be easy to edit. You only change text values here.
// For quiz questions, mark exactly ONE answer with isCorrect: true.
// You do not need to edit logic anywhere else.
export const editableEducationTopics: EditableEducationTopic[] = [
  {
    id: "mexicana",
    title: "Så spelas Mexicana",
    summary: "Roterande lag i korta matcher med individuella poäng.",
    illustration: "shuffle",
    badgeId: "education-mexicana",
    badgeLabel: "Mexicana-mästare",
    badgeIcon: "🔁",
    article: [
      "Mexicana är ett socialt padelformat där lagkamrater och motståndare roterar efter varje kort match, ofta efter ett bestämt antal poäng eller minuter. Det gör att tempot hålls uppe och att alla möter många olika spelare under samma pass.",
      "Poängen räknas vanligen per individ i stället för per lag, vilket betyder att varje boll spelar roll även om du byter partner i nästa runda. En tydlig resultattabell hjälper arrangören att skapa jämnare nya par och mer balanserade matcher.",
      "För att lyckas i Mexicana lönar det sig att spela enkelt, kommunicera tidigt och undvika onödiga chansslag. Stabilitet över många korta matcher brukar ge bättre slutplacering än enstaka spektakulära poäng.",
    ],
    articleIllustrations: [
      {
        src: "/education/movement-positions.svg",
        alt: "Padelspelare i en social turnering",
        caption: "Lokal illustration: social turneringskänsla med rörelse och rotation.",
      },
      {
        src: "/education/mexicana-rotation.svg",
        alt: "Diagram över hur spelare roterar mellan banor i Mexicana",
        caption: "Exempel på rotation mellan rundor i ett Mexicana-upplägg.",
      },
    ],
    quiz: [
      {
        id: "mexicana-1",
        question: "Vad är kärnan i Mexicana?",
        answers: [
          { text: "Ett långt slutspel", isCorrect: false },
          { text: "Frekvent rotation av spelare", isCorrect: true },
          { text: "Spel utan poäng", isCorrect: false },
        ],
      },
      {
        id: "mexicana-2",
        question: "Vad används ofta för att göra nästa omgång jämnare?",
        answers: [
          { text: "Serverns fart", isCorrect: false },
          { text: "Individuella poäng", isCorrect: true },
          { text: "Lagens tröjfärg", isCorrect: false },
        ],
      },
    ],
  },
  {
    id: "americano",
    title: "Så spelas Americano",
    summary: "Poängrace där varje boll över flera rundor är viktig.",
    illustration: "flag",
    badgeId: "education-americano",
    badgeLabel: "Americano-strateg",
    badgeIcon: "🏁",
    article: [
      "Americano spelas som ett poängrace där alla deltagare möter många olika kombinationer av med- och motspelare i korta rundor. Formatet är uppskattat för att det är rättvist, socialt och lätt att anpassa till olika nivåer.",
      "Till skillnad från utslagningsturneringar summeras poängen du tar i varje runda till en totalställning. Det betyder att du behöver hålla fokus hela vägen, eftersom även sena bollar i en match kan påverka din slutplacering markant.",
      "En bra Americano-strateg är att prioritera säkra returer, smart placering och tydlig kommunikation med din tillfälliga partner. Spelare som minimerar enkla misstag brukar klättra i tabellen snabbare än de som jagar svåra avgöranden.",
    ],
    articleIllustrations: [
      {
        src: "/education/offense-positions.svg",
        alt: "Padelmatch där poängräkning är i fokus",
        caption: "Lokal illustration: tävlingskänsla och poängfokus i Americano-format.",
      },
      {
        src: "/education/americano-scoreboard.svg",
        alt: "Poängtavla för Americano med flera rundor",
        caption: "Poäng summeras löpande över alla rundor i Americano.",
      },
    ],
    quiz: [
      {
        id: "americano-1",
        question: "Vad avgör oftast placeringen i Americano?",
        answers: [
          { text: "Högsta smashhastighet", isCorrect: false },
          { text: "Totala poäng", isCorrect: true },
          { text: "Första matchens resultat", isCorrect: false },
        ],
      },
    ],
  },
  {
    id: "types-of-shots",
    title: "Olika slag i padel",
    summary: "Grundläggande översikt över vanliga slagtyper.",
    illustration: "sports_tennis",
    badgeId: "education-shots",
    badgeLabel: "Slag-kännare",
    badgeIcon: "🎾",
    article: [
      "I padel bygger du poäng genom att välja rätt slag i rätt läge. Grundslag från bakplan används för att hålla bollen i spel, skapa rytm och flytta motståndarna. Ett lugnt, djupt grundslag ger ofta bättre kontroll än ett hårt chansslag.",
      "Volley slås nära nät och används för att ta tid från motståndaren. Lobb är det viktigaste försvarsslaget när du vill återta nätet, särskilt om motståndarna pressar med volley. En hög, djup lobb ger dig tid att flytta fram tillsammans med partnern.",
      "Bandeja är ett kontrollerat overheadslag med skuren boll som ofta spelas mot hörn eller mitt för att behålla nätposition. Vibora är mer aggressiv och sidospinnad, men kräver timing. Målet med båda slagen är oftast kontroll och initiativ, inte maximal kraft.",
    ],
    articleIllustrations: [
      {
        src: "/education/rules-serve.svg",
        alt: "Padelspelare som demonstrerar olika slag under spel",
        caption: "Lokal illustration: spelsekvens som visar flera slagtyper i matchtempo.",
      },
      {
        src: "/education/padel-shots.svg",
        alt: "Illustration av lobb, volley, bandeja och vibora",
        caption: "Exempel på slagbanor för lobb, volley, bandeja och vibora.",
      },
    ],
    quiz: [
      {
        id: "shots-1",
        question: "Vilket slag används ofta för att återta nätposition?",
        answers: [
          { text: "Lobb", isCorrect: true },
          { text: "Droppshot", isCorrect: false },
          { text: "Forehand-volley nära nätbandet", isCorrect: false },
        ],
      },
      {
        id: "shots-2",
        question: "Vad är ett vanligt mål med bandeja/vibora?",
        answers: [
          { text: "Maximal kraft", isCorrect: false },
          { text: "Behålla kontroll och initiativ", isCorrect: true },
          { text: "Alltid avgöra direkt", isCorrect: false },
        ],
      },
    ],
  },
  {
    id: "movement",
    title: "Rörelse under spelet",
    summary: "Hur du och din partner rör er som ett lag.",
    illustration: "directions_run",
    badgeId: "education-movement",
    badgeLabel: "Rörelse-coach",
    badgeIcon: "🏃",
    article: [
      "I padel rör sig ett bra par som en sammanhängande enhet, inte som två separata singelspelare. När en spelare går fram mot nät följer partnern med för att hålla laget kompakt och minska ytan som motståndaren kan spela igenom.",
      "Efter varje slag behöver båda spelarna göra små justeringssteg tillbaka till en balanserad utgångsposition. Denna återställning gör att ni hinner reagera på snabba riktningsbyten, studs i glaset och bollar som går mot mitten.",
      "Kommunikation är avgörande: ropa tidigt på lobb, mittenboll och eventuella byten av sida. Korta tydliga kommandon minskar tvekan, förbättrar besluten och gör att ni snabbare kan gå från försvar till ett stabilt nätspel.",
    ],
    articleIllustrations: [
      {
        src: "/education/defense-reset.svg",
        alt: "Padelspelare i rörelse mot nätet",
        caption: "Lokal illustration: fotarbete och synkad förflyttning mellan partners.",
      },
      {
        src: "/education/movement-positions.svg",
        alt: "Spelarpositioner i rörelse med pilar för lagets förflyttning",
        caption: "Paren flyttar synkroniserat framåt, bakåt och i sidled.",
      },
    ],
    quiz: [
      {
        id: "movement-1",
        question: "Hur bör dubbelpartners normalt röra sig?",
        answers: [
          { text: "Som två separata singelspelare", isCorrect: false },
          { text: "Som en samordnad enhet", isCorrect: true },
          { text: "Bara sidledes", isCorrect: false },
        ],
      },
      {
        id: "movement-2",
        question: "Vad hjälper mest för beslut på mittenbollar?",
        answers: [
          { text: "Tidiga tydliga utrop", isCorrect: true },
          { text: "Att vara tyst", isCorrect: false },
          { text: "Sen kommunikation", isCorrect: false },
        ],
      },
    ],
  },
  {
    id: "rules",
    title: "Regler i padel",
    summary: "Korta grunder för serve, studs, glas och galler.",
    illustration: "gavel",
    badgeId: "education-rules",
    badgeLabel: "Regelproffs",
    badgeIcon: "📘",
    article: [
      "En giltig serve i padel startar med att bollen studsas i marken och slås under midjehöjd diagonalt till rätt serveruta. Om första serven blir fel får du en andraserve, men två fel i rad ger poängen till motståndarna.",
      "I duellen får bollen på din egen sida ta glas eller galler om den först har studsat i golvet. Utan studs i golvet först är väggträff på egen sida fel.",
      "Poängsystemet följer normalt tennis med 15, 30, 40 och game. Vid 40–40 spelas avgörande boll eller fördelssystem beroende på lokala regler. Känn också till sidbyte, nätberöring och vad som gäller vid boll i galler.",
    ],
    articleIllustrations: [
      {
        src: "/education/americano-scoreboard.svg",
        alt: "Padelspelare som utför en underhandsserve",
        caption: "Lokal illustration: servesituation med fokus på teknik och regler.",
      },
      {
        src: "/education/rules-serve.svg",
        alt: "Padelbana med serveruta och studs före serve",
        caption: "Serve under midjehöjd med studs och diagonal riktning.",
      },
    ],
    quiz: [
      {
        id: "rules-1",
        question: "Hur ska en giltig serve inledas?",
        answers: [
          { text: "Direkt i luften över huvudet", isCorrect: false },
          { text: "Efter studs och under midjehöjd", isCorrect: true },
          { text: "Valfritt så länge den går in", isCorrect: false },
        ],
      },
      {
        id: "rules-2",
        question: "Vad gäller på egen sida när du slår bollen?",
        answers: [
          { text: "Bollen måste gå direkt över nät utan väggträff", isCorrect: false },
          { text: "Bollen får ta egen vägg (glas/galler) efter studs i golvet", isCorrect: true },
          { text: "Bollen får ta egen vägg även utan studs i golvet", isCorrect: false },
        ],
      },
    ],
  },
  {
    id: "offense",
    title: "Spela offensivt",
    summary: "Tryck, nätposition och beslut i anfall.",
    illustration: "north",
    badgeId: "education-offense",
    badgeLabel: "Anfallsmotor",
    badgeIcon: "🔥",
    article: [
      "Offensivt padelspel börjar med att vinna och behålla nätposition, eftersom du därifrån kan ta bollen tidigare och styra tempot. När båda spelarna står samlat nära nätet blir det lättare att stänga vinklar och skapa press.",
      "Bra anfall handlar mer om placering än rå styrka. Volleys mot fötter, mot mitten mellan spelarna eller djupt i hörnen tvingar fram svåra returer. En väl vald bandeja håller motståndarna bakpressade utan att ge dem enkla kontringslägen.",
      "Välj dina avslut med disciplin: attackera när du har balans och rätt bollhöjd, men spela säkert i neutrala lägen. Ett moget offensivt spel bygger kontinuerligt tryck över flera slag tills rätt läge för avgörande kommer.",
    ],
    articleIllustrations: [
      {
        src: "/education/padel-shots.svg",
        alt: "Padelspelare pressar framme vid nät",
        caption: "Lokal illustration: offensivt nätspel som sätter press på motståndarna.",
      },
      {
        src: "/education/offense-positions.svg",
        alt: "Padelbana som visar offensiva nätpositioner och målområden",
        caption: "Offensiva positioner vid nät med fokus på hörn, mitt och fötter.",
      },
    ],
    quiz: [
      {
        id: "offense-1",
        question: "Vad är en central del i offensivt padelspel?",
        answers: [
          { text: "Stå kvar långt bak", isCorrect: false },
          { text: "Kontrollera nätposition", isCorrect: true },
          { text: "Alltid slå hårdast möjligt", isCorrect: false },
        ],
      },
    ],
  },
  {
    id: "defense",
    title: "Spela defensivt",
    summary: "Bygg tålamod, höjd och bättre återhämtning.",
    illustration: "shield",
    badgeId: "education-defense",
    badgeLabel: "Försvarsgeneral",
    badgeIcon: "🛡️",
    article: [
      "Defensivt spel i padel handlar om att neutralisera motståndarens press, vinna tid och återfå balans i banan. När du är tillbakapressad är första prioritet att hålla bollen i spel med bra marginal över nät och kontrollerad längd.",
      "Använd glaset aktivt för att hantera svåra bollar i hörn och på vägg. Genom att läsa studs och låta bollen arbeta åt dig kan du spela säkrare returer i stället för stressade halvhuggna slag från dålig position.",
      "Lobben är nyckeln för att växla från försvar till anfall. En hög, djup lobb flyttar motståndarna bakåt och ger ditt lag tid att gå fram tillsammans. Tålamod, kommunikation och rätt höjd är grunden i ett starkt försvarsspel.",
    ],
    articleIllustrations: [
      {
        src: "/education/mexicana-rotation.svg",
        alt: "Padelspelare i defensiv position som förbereder en lobb",
        caption: "Lokal illustration: defensivt läge där lobben används för att vinna tid.",
      },
      {
        src: "/education/defense-reset.svg",
        alt: "Defensiv position med lobb för att återta nätet",
        caption: "Defensiv återhämtning: kontrollera, lobba och flytta fram laget.",
      },
    ],
    quiz: [
      {
        id: "defense-1",
        question: "Vad är ett bra defensivt mål under press?",
        answers: [
          { text: "Snabbt avgöra varje boll", isCorrect: false },
          { text: "Skapa tid och återta position", isCorrect: true },
          { text: "Undvika glas helt", isCorrect: false },
        ],
      },
      {
        id: "defense-2",
        question: "Vilket slag hjälper ofta laget att flytta fram?",
        answers: [
          { text: "Lobb", isCorrect: true },
          { text: "Kort stoppboll varje gång", isCorrect: false },
          { text: "Halvvolley utan riktning", isCorrect: false },
        ],
      },
    ],
  },
];
