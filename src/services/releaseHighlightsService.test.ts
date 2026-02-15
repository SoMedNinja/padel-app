import { describe, expect, it } from "vitest";
import { resolveCurrentRelease } from "./releaseHighlightsService";

describe("resolveCurrentRelease", () => {
  it("returns null when payload is empty", () => {
    expect(resolveCurrentRelease(null, "1.0.0", null)).toBeNull();
  });

  it("prefers matching currentVersion from payload", () => {
    const result = resolveCurrentRelease(
      {
        currentVersion: "1.2.0",
        releases: [
          { version: "1.1.0", title: "Old", changes: ["a"] },
          { version: "1.2.0", title: "New", changes: ["b"] },
        ],
      },
      "1.2.0",
      "1.1.0",
    );

    expect(result?.appVersion).toBe("1.2.0");
    expect(result?.release.title).toBe("New");
    expect(result?.shouldShowDialog).toBe(true);
  });

  it("silently stores baseline on first install", () => {
    const result = resolveCurrentRelease(
      {
        releases: [{ version: "1.1.0", title: "Old", changes: ["a"] }],
      },
      "1.1.0",
      null,
    );

    expect(result?.shouldShowDialog).toBe(false);
    expect(result?.shouldStoreAsSeenWithoutDialog).toBe(true);
  });

  it("hides dialog when current release is not newer than last seen", () => {
    const result = resolveCurrentRelease(
      {
        releases: [{ version: "1.1.0", title: "Old", changes: ["a"] }],
      },
      "1.1.0",
      "1.1.0",
    );

    expect(result?.shouldShowDialog).toBe(false);
    expect(result?.shouldStoreAsSeenWithoutDialog).toBe(false);
  });
});
