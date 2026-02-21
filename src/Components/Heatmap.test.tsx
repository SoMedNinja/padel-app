import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Heatmap from "./Heatmap";
import { Profile } from "../types";

describe("Heatmap", () => {
  it("renders without crashing when profiles are present and matches are empty", () => {
    const profiles: Profile[] = [
      { id: "p1", name: "Anna" },
      { id: "p2", name: "Bella" },
    ];

    render(<Heatmap matches={[]} profiles={profiles} />);

    expect(screen.getByText("Heatmap")).toBeTruthy();
    expect(screen.getAllByText("Anna").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Bella").length).toBeGreaterThan(0);
  });
});
