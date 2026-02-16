import { describe, it, expect } from "vitest";
import { getPlayerColor } from "./colors";

describe("getPlayerColor", () => {
  it("should return consistent colors for the same name", () => {
    const name = "Test Player";
    const color1 = getPlayerColor(name);
    const color2 = getPlayerColor(name);
    expect(color1).toBe(color2);
  });

  it("should return different colors for different names", () => {
    // Note: Hash collisions are possible, but unlikely for these specific strings given the palette size
    const color1 = getPlayerColor("Player A");
    const color2 = getPlayerColor("Player B");
    expect(color1).not.toBe(color2);
  });

  it("should return default color for 'Gäst'", () => {
    expect(getPlayerColor("Gäst")).toBe("#7f7f7f");
  });

  it("should return default color for empty or invalid names", () => {
    expect(getPlayerColor("")).toBe("#7f7f7f");
    // @ts-expect-error Testing runtime check for null
    expect(getPlayerColor(null)).toBe("#7f7f7f");
    // @ts-expect-error Testing runtime check for undefined
    expect(getPlayerColor(undefined)).toBe("#7f7f7f");
  });

  it("should return a valid hex color", () => {
    const color = getPlayerColor("Random Name");
    expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
  });
});
