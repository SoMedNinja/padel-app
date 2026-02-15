import { educationTopics } from "../content/educationTopics";

export interface CompletedQuizRecord {
  topicId: string;
  badgeId: string;
  badgeLabel: string;
  badgeIcon: string;
  answeredAt: string;
  correctCount: number;
  passed: boolean;
  answers: Record<string, string>;
}

export function storageKeyForUser(userId: string | null | undefined) {
  return `education-quiz-completion-v1:${userId ?? "guest"}`;
}

export function readCompletedQuizMap(userId: string | null | undefined): Record<string, CompletedQuizRecord> {
  const raw = window.localStorage.getItem(storageKeyForUser(userId));
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as Record<string, CompletedQuizRecord>;
    // Note for non-coders: older saved quiz results may miss the `passed` field,
    // so we safely recompute it from the score to keep old and new app versions compatible.
    return Object.fromEntries(
      Object.entries(parsed).map(([key, value]) => [
        key,
        {
          ...value,
          passed: value.passed ?? value.correctCount === educationTopics.find((topic) => topic.id === key)?.quiz.length,
        },
      ]),
    ) as Record<string, CompletedQuizRecord>;
  } catch {
    return {};
  }
}
