import { describe, it, expect } from "vitest";
import { padelPuzzles } from "./padelPuzzles";
import { editablePadelPuzzles } from "./padelPuzzlesEditable";

describe("padelPuzzles", () => {
  it("should have correct answers", () => {
    padelPuzzles.forEach((puzzle) => {
      // Find the corresponding editable puzzle
      const editable = editablePadelPuzzles.find((p) => p.questionId === puzzle.questionId);
      expect(editable).toBeDefined();
      if (!editable) return;

      // Find the correct option in editable
      const correctOption = editable.options.find((o) => o.isCorrect);
      expect(correctOption).toBeDefined();
      if (!correctOption) return;

      // Assert the puzzle has the correct answer set
      expect(puzzle.correctAnswer).toBe(correctOption.text);
    });
  });

  it("should have randomized options", () => {
    // This test checks that options are shuffled.
    // Since shuffling is random, there is a tiny chance they all align with index 0,
    // but given enough puzzles (there are ~20), the probability is astronomically low.

    let allFirstOptionsAreCorrect = true;
    let checkedCount = 0;

    padelPuzzles.forEach((puzzle) => {
        if (puzzle.type === 'tap-to-target') return;

        checkedCount++;
        // Check if the first option is the correct answer
        if (puzzle.options[0] !== puzzle.correctAnswer) {
            allFirstOptionsAreCorrect = false;
        }
    });

    expect(checkedCount).toBeGreaterThan(0);
    // We expect that NOT all first options are correct (meaning randomization happened)
    expect(allFirstOptionsAreCorrect).toBe(false);
  });
});
