import { describe, expect, it } from "vitest";
import { findCurrentRelease } from "./releaseHighlightsService";

describe("findCurrentRelease", () => {
  it("returns null when payload is empty", () => {
    expect(findCurrentRelease(null)).toBeNull();
  });

  it("prefers matching currentVersion", () => {
    const result = findCurrentRelease({
      currentVersion: "1.2.0",
      releases: [
        { version: "1.1.0", title: "Old", changes: ["a"] },
        { version: "1.2.0", title: "New", changes: ["b"] },
      ],
    });

    expect(result?.appVersion).toBe("1.2.0");
    expect(result?.release.title).toBe("New");
  });

  it("falls back to first release when currentVersion is missing", () => {
    const result = findCurrentRelease({
      releases: [{ version: "1.1.0", title: "Old", changes: ["a"] }],
    });

    expect(result?.appVersion).toBe("1.1.0");
    expect(result?.release.title).toBe("Old");
  });
});
