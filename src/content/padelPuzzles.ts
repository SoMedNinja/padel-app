import { editablePadelPuzzles, type PuzzleDifficulty, type PuzzleType, type TargetCoordinate } from "./padelPuzzlesEditable";

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
  targetCoordinate?: TargetCoordinate;
}

const toPadelPuzzle = (
  questionId: string,
  difficulty: PuzzleDifficulty,
  type: PuzzleType | undefined,
  title: string,
  scenario: string,
  options: { text: string; isCorrect: boolean }[],
  coachingTip: string,
  diagramUrl?: string,
  videoUrl?: string,
  targetCoordinate?: TargetCoordinate,
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

  return {
    questionId,
    difficulty,
    type: type ?? "text",
    title,
    scenario,
    options: options.map((option) => option.text),
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
    puzzle.type,
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
