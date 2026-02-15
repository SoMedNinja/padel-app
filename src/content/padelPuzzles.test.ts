import { describe, expect, it } from "vitest";
import { getPuzzlesByDifficulty, padelPuzzles } from "./padelPuzzles";

describe("padel puzzles content", () => {
  it("keeps exactly three options and one correct answer per puzzle", () => {
    for (const puzzle of padelPuzzles) {
      expect(puzzle.options).toHaveLength(3);
      expect(puzzle.options.filter((option) => option === puzzle.correctAnswer)).toHaveLength(1);
    }
  });

  it("contains a larger scenario bank for replay value", () => {
    expect(padelPuzzles.length).toBeGreaterThanOrEqual(14);
  });

  it("includes puzzles for each difficulty", () => {
    expect(getPuzzlesByDifficulty("easy").length).toBeGreaterThan(0);
    expect(getPuzzlesByDifficulty("medium").length).toBeGreaterThan(0);
    expect(getPuzzlesByDifficulty("hard").length).toBeGreaterThan(0);
  });
});
