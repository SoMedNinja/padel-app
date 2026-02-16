import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  puzzleStorageKeyForUser,
  readPuzzleAnswerMap,
  savePuzzleAnswerMap,
  clearPuzzleAnswers,
  type PadelPuzzleAnswerRecord,
} from "./padelPuzzle";

// Mock localStorage for environments without window (like Bun test without JSDOM)
if (typeof window === "undefined") {
  const storage = new Map<string, string>();
  global.window = {
    localStorage: {
      getItem: vi.fn((key: string) => storage.get(key) || null),
      setItem: vi.fn((key: string, value: string) => storage.set(key, value)),
      removeItem: vi.fn((key: string) => storage.delete(key)),
      clear: vi.fn(() => storage.clear()),
    },
  } as any;
}

describe("padelPuzzle storage", () => {
  const userId = "test-user-123";
  const guestKey = "padel-puzzle-answers-v1:guest";
  const userKey = `padel-puzzle-answers-v1:${userId}`;

  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  describe("puzzleStorageKeyForUser", () => {
    it("should return guest key when userId is null", () => {
      expect(puzzleStorageKeyForUser(null)).toBe(guestKey);
    });

    it("should return guest key when userId is undefined", () => {
      expect(puzzleStorageKeyForUser(undefined)).toBe(guestKey);
    });

    it("should return user key when userId is provided", () => {
      expect(puzzleStorageKeyForUser(userId)).toBe(userKey);
    });
  });

  describe("readPuzzleAnswerMap", () => {
    it("should return empty object if nothing is in localStorage", () => {
      expect(readPuzzleAnswerMap(userId)).toEqual({});
    });

    it("should return parsed object if valid JSON is in localStorage", () => {
      const mockRecord: PadelPuzzleAnswerRecord = {
        questionId: "1",
        difficulty: "easy",
        selectedAnswer: "A",
        correctAnswer: "A",
        isCorrect: true,
        answeredAt: new Date().toISOString(),
      };
      const mockMap = { "1": mockRecord };
      window.localStorage.setItem(userKey, JSON.stringify(mockMap));

      expect(readPuzzleAnswerMap(userId)).toEqual(mockMap);
    });

    it("should return empty object and not throw if localStorage contains invalid JSON", () => {
      window.localStorage.setItem(userKey, "invalid-json");
      expect(readPuzzleAnswerMap(userId)).toEqual({});
    });
  });

  describe("savePuzzleAnswerMap", () => {
    it("should save the map to localStorage", () => {
      const mockRecord: PadelPuzzleAnswerRecord = {
        questionId: "1",
        difficulty: "easy",
        selectedAnswer: "A",
        correctAnswer: "A",
        isCorrect: true,
        answeredAt: new Date().toISOString(),
      };
      const mockMap = { "1": mockRecord };

      savePuzzleAnswerMap(userId, mockMap);

      const stored = window.localStorage.getItem(userKey);
      expect(stored).toBe(JSON.stringify(mockMap));
    });

    it("should work for guest users", () => {
      const mockMap = {};
      savePuzzleAnswerMap(null, mockMap);
      expect(window.localStorage.getItem(guestKey)).toBe(JSON.stringify(mockMap));
    });
  });

  describe("clearPuzzleAnswers", () => {
    it("should remove the item from localStorage", () => {
      window.localStorage.setItem(userKey, "{}");
      clearPuzzleAnswers(userId);
      expect(window.localStorage.getItem(userKey)).toBeNull();
    });

    it("should work for guest users", () => {
      window.localStorage.setItem(guestKey, "{}");
      clearPuzzleAnswers(null);
      expect(window.localStorage.getItem(guestKey)).toBeNull();
    });
  });
});
