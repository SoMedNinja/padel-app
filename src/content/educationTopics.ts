export interface EducationQuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
}

export interface EducationTopic {
  id: string;
  title: string;
  summary: string;
  illustration: "sports_tennis" | "shuffle" | "flag" | "directions_run" | "gavel" | "north" | "shield";
  badgeId: string;
  badgeLabel: string;
  badgeIcon: string;
  article: string[];
  quiz: EducationQuizQuestion[];
}

// Note for non-coders: each topic has its own badge so users can clearly see what they have completed.
export const educationTopics: EducationTopic[] = [
  {
    id: "mexicana",
    title: "Så spelas Mexicana",
    summary: "Roterande lag i korta matcher med individuella poäng.",
    illustration: "shuffle",
    badgeId: "education-mexicana",
    badgeLabel: "Mexicana-mästare",
    badgeIcon: "🔁",
    article: [
      "Mexicana är ett socialt padelformat där lagkamrater och motståndare roterar efter varje kort match.",
      "Poängen räknas oftast per spelare, och den tabellen används för att skapa jämnare nästa omgång.",
      "Formatet passar bra när många vill spela på kort tid och möta flera olika spelare.",
    ],
    quiz: [
      {
        id: "mexicana-1",
        question: "Vad är kärnan i Mexicana?",
        options: ["Ett långt slutspel", "Frekvent rotation av spelare", "Spel utan poäng"],
        correctAnswer: "Frekvent rotation av spelare",
      },
      {
        id: "mexicana-2",
        question: "Vad används ofta för att göra nästa omgång jämnare?",
        options: ["Serverns fart", "Individuella poäng", "Lagens tröjfärg"],
        correctAnswer: "Individuella poäng",
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
      "Americano spelas ofta som ett poängrace över många korta rundor med roterande lag.",
      "I stället för utslagning handlar det om att samla så många poäng som möjligt totalt.",
      "Jämn nivå och få enkla misstag är ofta viktigare än att jaga svåra vinnarslag.",
    ],
    quiz: [
      {
        id: "americano-1",
        question: "Vad avgör oftast placeringen i Americano?",
        options: ["Högsta smashhastighet", "Totala poäng", "Första matchens resultat"],
        correctAnswer: "Totala poäng",
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
      "I padel används flera olika slag beroende på situation: grundslag, volley, lob, bandeja och vibora.",
      "Ett säkert grundslag bygger dueller, volley tar tid från motståndaren, och lobb används för att ta tillbaka nätet.",
      "Bandeja och vibora är kontrollerade overheadslag för att behålla initiativet utan att ge enkla kontringar.",
    ],
    quiz: [
      {
        id: "shots-1",
        question: "Vilket slag används ofta för att återta nätposition?",
        options: ["Lobb", "Droppshot", "Forehand-volley nära nätbandet"],
        correctAnswer: "Lobb",
      },
      {
        id: "shots-2",
        question: "Vad är ett vanligt mål med bandeja/vibora?",
        options: ["Maximal kraft", "Behålla kontroll och initiativ", "Alltid avgöra direkt"],
        correctAnswer: "Behålla kontroll och initiativ",
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
      "I dubbel ska ni röra er tillsammans. När en spelare går framåt ska partnern oftast följa med för att hålla laget kompakt.",
      "Efter varje slag är målet att snabbt återgå till en balanserad utgångsposition med små justeringssteg.",
      "Tydlig kommunikation om lobb, mittenboll och byte minskar missförstånd och förbättrar positioneringen.",
    ],
    quiz: [
      {
        id: "movement-1",
        question: "Hur bör dubbelpartners normalt röra sig?",
        options: ["Som två separata singelspelare", "Som en samordnad enhet", "Bara sidledes"],
        correctAnswer: "Som en samordnad enhet",
      },
      {
        id: "movement-2",
        question: "Vad hjälper mest för beslut på mittenbollar?",
        options: ["Tidiga tydliga utrop", "Att vara tyst", "Sen kommunikation"],
        correctAnswer: "Tidiga tydliga utrop",
      },
    ],
  },
  {
    id: "rules",
    title: "Regler i padel",
    summary: "Korta grunder för serve, studs och glas.",
    illustration: "gavel",
    badgeId: "education-rules",
    badgeLabel: "Regelproffs",
    badgeIcon: "📘",
    article: [
      "Serve ska slås under midjehöjd efter en studs och diagonalt till rätt serveruta.",
      "Bollen får studsa i golvet och sedan träffa glas, men inte tvärtom på den egna sidan.",
      "Poängräkning följer normalt tennismodellen: 15, 30, 40 och game.",
    ],
    quiz: [
      {
        id: "rules-1",
        question: "Hur ska en giltig serve inledas?",
        options: ["Direkt i luften över huvudet", "Efter studs och under midjehöjd", "Valfritt så länge den går in"],
        correctAnswer: "Efter studs och under midjehöjd",
      },
      {
        id: "rules-2",
        question: "Vad gäller för glas på egen sida?",
        options: ["Glas först är alltid okej", "Golvet ska träffas före glas", "Bollen får aldrig ta glas"],
        correctAnswer: "Golvet ska träffas före glas",
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
      "Offensivt spel bygger ofta på att vinna nätposition och hålla motståndarna bakom baslinjen.",
      "Placering är oftast viktigare än rå kraft; bollar mot fötter och hörn skapar svåra returer.",
      "Välj rätt läge för avgörande slag. Pressa kontinuerligt men undvik onödiga risker i fel läge.",
    ],
    quiz: [
      {
        id: "offense-1",
        question: "Vad är en central del i offensivt padelspel?",
        options: ["Stå kvar långt bak", "Kontrollera nätposition", "Alltid slå hårdast möjligt"],
        correctAnswer: "Kontrollera nätposition",
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
      "Defensivt spel handlar om att köpa tid, neutralisera press och vänta in rätt läge att vända duellen.",
      "Djupa bollar med höjd och smart användning av glas hjälper dig att komma tillbaka i position.",
      "När du är pressad är målet ofta att spela säkert och skapa möjlighet till en lobb som flyttar fram laget.",
    ],
    quiz: [
      {
        id: "defense-1",
        question: "Vad är ett bra defensivt mål under press?",
        options: ["Snabbt avgöra varje boll", "Skapa tid och återta position", "Undvika glas helt"],
        correctAnswer: "Skapa tid och återta position",
      },
      {
        id: "defense-2",
        question: "Vilket slag hjälper ofta laget att flytta fram?",
        options: ["Lobb", "Kort stoppboll varje gång", "Halvvolley utan riktning"],
        correctAnswer: "Lobb",
      },
    ],
  },
];
