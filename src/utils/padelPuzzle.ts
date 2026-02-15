import type { PuzzleDifficulty } from "../content/padelPuzzlesEditable";

export interface PadelPuzzleAnswerRecord {
  questionId: string;
  difficulty: PuzzleDifficulty;
  selectedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  answeredAt: string;
}

export function puzzleStorageKeyForUser(userId: string | null | undefined) {
  return `padel-puzzle-answers-v1:${userId ?? "guest"}`;
}


export function readPuzzleAnswerMap(userId: string | null | undefined): Record<string, PadelPuzzleAnswerRecord> {
  const raw = window.localStorage.getItem(puzzleStorageKeyForUser(userId));
  if (!raw) return {};

  try {
    return JSON.parse(raw) as Record<string, PadelPuzzleAnswerRecord>;
  } catch {
    return {};
  }
}
