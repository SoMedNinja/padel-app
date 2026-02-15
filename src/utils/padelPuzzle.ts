import type { PuzzleDifficulty } from "../content/padelPuzzlesEditable";

export interface PadelPuzzleAnswerRecord {
  questionId: string;
  difficulty: PuzzleDifficulty;
  selectedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  answeredAt: string;
}

export interface PadelPuzzleFirstPerfectRecord {
  userId: string;
  achievedAt: string;
}

export function puzzleStorageKeyForUser(userId: string | null | undefined) {
  return `padel-puzzle-answers-v1:${userId ?? "guest"}`;
}

export const firstPerfectPuzzlePlayerStorageKey = "padel-puzzle-first-perfect-v1";

export function readPuzzleAnswerMap(userId: string | null | undefined): Record<string, PadelPuzzleAnswerRecord> {
  const raw = window.localStorage.getItem(puzzleStorageKeyForUser(userId));
  if (!raw) return {};

  try {
    return JSON.parse(raw) as Record<string, PadelPuzzleAnswerRecord>;
  } catch {
    return {};
  }
}

export function readFirstPerfectPuzzlePlayer(): PadelPuzzleFirstPerfectRecord | null {
  const raw = window.localStorage.getItem(firstPerfectPuzzlePlayerStorageKey);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as PadelPuzzleFirstPerfectRecord;
    if (!parsed?.userId || !parsed?.achievedAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function claimFirstPerfectPuzzlePlayer(userId: string | null | undefined) {
  if (!userId) return readFirstPerfectPuzzlePlayer();

  const existing = readFirstPerfectPuzzlePlayer();
  if (existing) return existing;

  const createdRecord: PadelPuzzleFirstPerfectRecord = {
    userId,
    achievedAt: new Date().toISOString(),
  };

  // Note for non-coders: this saves the very first all-correct winner locally
  // so we can show one unique "first" merit in the app UI.
  window.localStorage.setItem(firstPerfectPuzzlePlayerStorageKey, JSON.stringify(createdRecord));
  return createdRecord;
}
