import { editablePadelPuzzles, type PuzzleDifficulty, type PuzzleType } from "./padelPuzzlesEditable";

export interface PadelPuzzle {
  questionId: string;
  difficulty: PuzzleDifficulty;
  type: PuzzleType;
  title: string;
  scenario: string;
  options: string[];
  correctAnswer: string;
  coachingTip: string;
  diagramUrl?: string;
  videoUrl?: string;
  targetCoordinate?: { x: number; y: number };
}

function shuffle<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

const toPadelPuzzle = (
  questionId: string,
  difficulty: PuzzleDifficulty,
  type: PuzzleType,
  title: string,
  scenario: string,
  options: { text: string; isCorrect: boolean }[],
  coachingTip: string,
  diagramUrl?: string,
  videoUrl?: string,
  targetCoordinate?: { x: number; y: number },
): PadelPuzzle => {
  // Note for non-coders: this guard catches content mistakes early during development.
  // It ensures each puzzle follows the same game rules: 3 options and 1 correct answer.
  if (options.length !== 3) {
    throw new Error(`Puzzle ${questionId} must have exactly 3 options.`);
  }

  const correctOptions = options.filter((option) => option.isCorrect);
  if (correctOptions.length !== 1) {
    throw new Error(`Puzzle ${questionId} must have exactly one option marked isCorrect: true.`);
  }

  const shuffledOptions = shuffle(options);

  return {
    questionId,
    difficulty,
    type,
    title,
    scenario,
    options: shuffledOptions.map((option) => option.text),
    correctAnswer: correctOptions[0].text,
    coachingTip,
    diagramUrl,
    videoUrl,
    targetCoordinate,
  };
};

export const padelPuzzles: PadelPuzzle[] = editablePadelPuzzles.map((puzzle) =>
  toPadelPuzzle(
    puzzle.questionId,
    puzzle.difficulty,
    puzzle.type ?? "text",
    puzzle.title,
    puzzle.scenario,
    puzzle.options,
    puzzle.coachingTip,
    puzzle.diagramUrl,
    puzzle.videoUrl,
    puzzle.targetCoordinate,
  ),
);

export const puzzleDifficulties: PuzzleDifficulty[] = ["easy", "medium", "hard"];

export function getPuzzlesByDifficulty(difficulty: PuzzleDifficulty): PadelPuzzle[] {
  return padelPuzzles.filter((puzzle) => puzzle.difficulty === difficulty);
}
