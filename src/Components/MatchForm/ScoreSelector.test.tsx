import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom";
import ScoreSelector from "./ScoreSelector";

describe("ScoreSelector", () => {
  it("renders main scores", () => {
    const onChange = vi.fn();
    const setShowExtraScores = vi.fn();
    render(
      <ScoreSelector
        value=""
        onChange={onChange}
        showExtraScores={false}
        setShowExtraScores={setShowExtraScores}
      />
    );

    const radiogroup = screen.getByRole("radiogroup");
    expect(radiogroup).toBeInTheDocument();
    expect(radiogroup).toHaveAttribute("aria-label", "Välj poäng");

    // "Mer..." button should NOT be in the radiogroup
    const toggleButton = screen.getByLabelText("Visa fler poängalternativ");
    expect(radiogroup).not.toContainElement(toggleButton);

    // Main scores should be in the radiogroup
    const score0 = screen.getByLabelText("Poäng: 0");
    expect(radiogroup).toContainElement(score0);
  });

  it("renders extra scores when showExtraScores is true", () => {
    const onChange = vi.fn();
    const setShowExtraScores = vi.fn();
    render(
      <ScoreSelector
        value=""
        onChange={onChange}
        showExtraScores={true}
        setShowExtraScores={setShowExtraScores}
      />
    );

    const radiogroup = screen.getByRole("radiogroup");

    // Extra scores should be in the radiogroup
    const score12 = screen.getByLabelText("Poäng: 12");
    expect(radiogroup).toContainElement(score12);

    // "Göm" button should NOT be in the radiogroup
    const toggleButton = screen.getByLabelText("Visa färre poängalternativ");
    expect(radiogroup).not.toContainElement(toggleButton);
  });
});
