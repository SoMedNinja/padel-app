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

  it("should return deterministic colors for known strings", () => {
    // "okbCMP" produces a negative hash (-1015328416)
    // index = Math.abs(-1015328416) % 20 = 16
    // PALETTE[16] is #66aa00
    expect(getPlayerColor("okbCMP")).toBe("#66aa00");

    // "gäst" (lowercase) hashes to index 2 (#2ca02c)
    // Ensures case sensitivity (distinct from "Gäst" which is #7f7f7f)
    expect(getPlayerColor("gäst")).toBe("#2ca02c");

    // "Åke" hashes to index 15 (#dd4477)
    // Tests special characters handling
    expect(getPlayerColor("Åke")).toBe("#dd4477");

    // "Tennis 🎾" hashes to index 15 (#dd4477)
    // Tests emoji handling
    expect(getPlayerColor("Tennis 🎾")).toBe("#dd4477");
  });

  it("should handle long strings without crashing", () => {
    const longString = "a".repeat(1000);
    expect(() => getPlayerColor(longString)).not.toThrow();
    const color = getPlayerColor(longString);
    expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
  });
});
