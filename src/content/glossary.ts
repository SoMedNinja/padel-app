export interface GlossaryItem {
  term: string;
  definition: string;
}

export interface PadelRule {
  title: string;
  description: string;
}

export const glossary: GlossaryItem[] = [
  { term: "Bandeja", definition: "Ett defensivt/neutralt overheadslag med slice för att behålla nätposition." },
  { term: "Vibora", definition: "Ett mer aggressivt overheadslag med sidoskruv." },
  { term: "Chiquita", definition: "Ett långsamt slag mot fötterna på motståndare som står vid nät." },
  { term: "Lobb", definition: "Ett högt slag som syftar till att flytta motståndarna från nätet." },
  { term: "Bajada", definition: "Ett hårt slag från bakväggen efter en hög studs." },
  { term: "Galler", definition: "Ståltrådsnätet som omger banan. Studs i gallret är ofta oförutsägbar." },
  { term: "Glas", definition: "De genomskinliga väggarna. Bollen får studsa i glaset efter studs i marken." },
  { term: "Kick-smash", definition: "En smash som skruvas så att den kickar ut ur banan efter träff i bakväggen." },
];

export const padelRules: PadelRule[] = [
  { title: "Serve", description: "Måste slås under midjehöjd och landa i den diagonala serverutan." },
  { title: "Poängräkning", description: "Samma som i tennis: 15, 30, 40, Game. Golden Point vid 40-40 är vanligt." },
  { title: "Väggträff", description: "Bollen får träffa väggen (glas/galler) på motståndarens sida ENDAST efter att den studsat i marken först." },
  { title: "Beröring", description: "Du får aldrig röra nätet eller motståndarens sida av banan med kropp eller racket." },
];
