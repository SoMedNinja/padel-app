export interface Level {
  id: number;
  label: string;
  description: string;
  improvements: string[];
}

export interface QuestionOption {
  text: string;
  points: number;
  isTerminal?: boolean; // If true, ends assessment immediately (e.g., "Never played")
}

export interface Question {
  id: number;
  text: string;
  options: QuestionOption[];
}

export const levels: Level[] = [
  {
    id: 0,
    label: "Nybörjare (0)",
    description: "Har aldrig spelat racketsport tidigare.",
    improvements: ["Boka en introduktionskurs", "Lär dig grundläggande regler", "Öva på att träffa bollen"],
  },
  {
    id: 0.5,
    label: "Nybörjare (0.5)",
    description: "Inga lektioner. Spelat i mindre än 6 månader. Ingen teknik eller taktik.",
    improvements: ["Ta lektioner för att lära dig grepp och sving", "Fokusera på att hålla bollen i spel", "Lär dig positionering"],
  },
  {
    id: 1.0,
    label: "Nybörjare (1.0)",
    description: "Inga eller få lektioner. Spelat i mindre än 12 månader. Ingen teknik eller taktik.",
    improvements: ["Öva på att returnera servar", "Jobba på grundläggande slag", "Spela matcher med andra nybörjare"],
  },
  {
    id: 1.5,
    label: "Nybörjare / Medel (1.5)",
    description: "Få lektioner. Några matcher i månaden. Kan bolla och returnera i lågt tempo.",
    improvements: ["Öka säkerheten i slagen", "Lär dig glasväggarna", "Försök hålla bollen i spel längre"],
  },
  {
    id: 2.0,
    label: "Nybörjare / Medel (2.0)",
    description: "Få lektioner. Minst 1 års spelande. Kan bolla och returnera i lågt tempo.",
    improvements: ["Förbättra riktningskontroll", "Öka tempot i spelet", "Arbeta på nätspel"],
  },
  {
    id: 2.5,
    label: "Medel (2.5)",
    description: "Behärskar de flesta slag och kontrollerar riktning i normalt tempo.",
    improvements: ["Börja använda slice/spinn", "Minimera enkla misstag", "Lär dig lobba effektivt"],
  },
  {
    id: 3.0,
    label: "Medel (3.0)",
    description: "Dominerar de flesta slag, spelar platt och driver bollen. Gör många oprovocerade misstag.",
    improvements: ["Minska oprovocerade misstag", "Utveckla slice på forehand/backhand", "Förbättra positionering vid nät"],
  },
  {
    id: 3.5,
    label: "Medel (3.5)",
    description: "Kan spela slice forehand/backhand och placera bollen. Gör fortfarande en del misstag.",
    improvements: ["Öka säkerheten i placerade slag", "Arbeta på overhead-slag (bandeja/vibora)", "Bli bättre på att vända försvar till anfall"],
  },
  {
    id: 4.0,
    label: "Medel / Hög (4.0)",
    description: "Behärskar de flesta slag och riktning. Kan spela med spinn. Gör få oprovocerade misstag.",
    improvements: ["Förbättra avslut och smash", "Öka tempot utan att tappa kontroll", "Utveckla spelförståelse"],
  },
  {
    id: 4.5,
    label: "Medel / Hög (4.5)",
    description: "Behärskar slag och riktning där man vill. Sätter fart på bollen men har svårt att avgöra poäng.",
    improvements: ["Bli effektivare på att döda bollen", "Förbättra taktisk positionering", "Analysera motståndarens svagheter"],
  },
  {
    id: 5.0,
    label: "Medel / Avancerad (5.0)",
    description: "Medelgod teknik och högt taktiskt tänkande. Redo för matcher med bra tempo.",
    improvements: ["Hantera högt tempo konsekvent", "Förfina specialslag", "Spela turneringar på högre nivå"],
  },
  {
    id: 5.5,
    label: "Avancerad (5.5)",
    description: "Dominerar tekniska och taktiska färdigheter. Förberedd för spel i högt tempo.",
    improvements: ["Utveckla defensivt spel mot glas (bajadas)", "Optimera lagarbete och kommunikation", "Fysisk och mental uthållighet"],
  },
  {
    id: 6.0,
    label: "Avancerad (6.0)",
    description: "Hårt slående med kontroll, djup och variation. Bra försvar, snabba bajadas. Läser spelet väl.",
    improvements: ["Tävla på elitnivå", "Maximal fysisk prestation", "Mental styrka i avgörande lägen"],
  },
  {
    id: 7.0,
    label: "Elit (7.0)",
    description: "Professionell spelare. Topp 30 WPT.",
    improvements: ["Behåll världsranking", "Vinna stora titlar", "Sponsring och karriär"],
  },
];

export const questions: Question[] = [
  {
    id: 1,
    text: "Hur länge har du spelat padel?",
    options: [
      { text: "Har aldrig spelat", points: 0, isTerminal: true },
      { text: "Mindre än 6 månader", points: 3 },
      { text: "6 till 12 månader", points: 10 },
      { text: "Mer än 1 år", points: 15 },
    ],
  },
  {
    id: 2,
    text: "Har du tagit några lektioner?",
    options: [
      { text: "Nej, inga alls", points: 0 },
      { text: "Fåtal eller oregelbundet", points: 5 },
      { text: "Ja, regelbundet med tränare", points: 10 },
    ],
  },
  {
    id: 3,
    text: "Hur skulle du beskriva ditt bolltempo och rally?",
    options: [
      { text: "Har svårt att hålla bollen i spel", points: 0 },
      { text: "Kan bolla i lågt tempo", points: 10 },
      { text: "Håller normalt tempo med säkerhet", points: 20 },
      { text: "Spelar i högt tempo utan problem", points: 30 },
    ],
  },
  {
    id: 4,
    text: "Vilken teknik använder du mest?",
    options: [
      { text: "Ingen särskild teknik", points: 0 },
      { text: "Mest platta slag (drive)", points: 10 },
      { text: "Kan spela med slice/spinn", points: 15 },
      { text: "Behärskar alla slagtyper (slice, toppspinn, platt)", points: 20 },
    ],
  },
  {
    id: 5,
    text: "Hur ofta gör du oprovocerade misstag?",
    options: [
      { text: "Ofta (många enkla fel)", points: 0 },
      { text: "Ibland", points: 5 },
      { text: "Sällan (ganska säker)", points: 10 },
      { text: "Mycket sällan (hög säkerhet)", points: 15 },
    ],
  },
  {
    id: 6,
    text: "Hur är ditt taktiska spel och avslut?",
    options: [
      { text: "Tänker inte så mycket på taktik", points: 0 },
      { text: "Har svårt att avgöra poängen", points: 5 },
      { text: "Har bra spelförståelse och taktik", points: 10 },
      { text: "Dominerar taktiskt och avgör ofta", points: 15 },
    ],
  },
  {
    id: 7,
    text: "Hur hanterar du glasväggar och försvar?",
    options: [
      { text: "Undviker väggarna / Enbart grundslag", points: 0 },
      { text: "Godkänt returspel från glas", points: 5 },
      { text: "Avancerat försvar och snabba 'bajadas'", points: 10 },
    ],
  },
  {
    id: 8,
    text: "Tävlar du i padel?",
    options: [
      { text: "Nej, spelar bara för skojs skull", points: 0 },
      { text: "Ja, i seriespel eller turneringar", points: 5 },
      { text: "Ja, professionellt (Topp 30 WPT)", points: 200 },
    ],
  },
];

export function calculateLevel(score: number): Level {
  if (score >= 200) return levels.find((l) => l.id === 7.0)!;
  if (score >= 110) return levels.find((l) => l.id === 6.0)!;
  if (score >= 96) return levels.find((l) => l.id === 5.5)!;
  if (score >= 86) return levels.find((l) => l.id === 5.0)!;
  if (score >= 79) return levels.find((l) => l.id === 4.5)!;
  if (score >= 69) return levels.find((l) => l.id === 4.0)!;
  if (score >= 59) return levels.find((l) => l.id === 3.5)!;
  if (score >= 49) return levels.find((l) => l.id === 3.0)!;
  if (score >= 39) return levels.find((l) => l.id === 2.5)!;
  if (score >= 29) return levels.find((l) => l.id === 2.0)!;
  if (score >= 19) return levels.find((l) => l.id === 1.5)!;
  if (score >= 9) return levels.find((l) => l.id === 1.0)!;
  if (score >= 1) return levels.find((l) => l.id === 0.5)!;
  return levels.find((l) => l.id === 0)!;
}
