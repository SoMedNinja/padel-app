import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import "@testing-library/jest-dom";
import { Sparkline } from "./Sparkline";

describe("Sparkline", () => {
  it("renders with correct ARIA label for rising trend", () => {
    const data = [1200, 1210, 1220, 1230];
    render(<Sparkline data={data} />);

    const svg = screen.getByRole("img");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute("aria-label", "ELO-trend: stigande (1200 till 1230)");
  });

  it("renders with correct ARIA label for falling trend", () => {
    const data = [1300, 1290, 1280, 1250];
    render(<Sparkline data={data} />);

    const svg = screen.getByRole("img");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute("aria-label", "ELO-trend: fallande (1300 till 1250)");
  });

  it("renders with correct ARIA label for flat trend", () => {
    const data = [1200, 1210, 1190, 1200];
    render(<Sparkline data={data} />);

    const svg = screen.getByRole("img");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute("aria-label", "ELO-trend: oförändrad (1200 till 1200)");
  });
});
