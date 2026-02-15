import { describe, expect, it } from "vitest";
import { compareVersions, evaluateWebVersionPolicy } from "./appVersionService";

describe("appVersionService", () => {
  it("marks update as required when below minimum version", () => {
    const result = evaluateWebVersionPolicy("1.2.0", {
      minimumSupportedVersion: "1.3.0",
      latestAvailableVersion: "1.5.0",
      releaseNotes: null,
    });

    expect(result.kind).toBe("updateRequired");
  });

  it("marks update as recommended when below latest but above minimum", () => {
    const result = evaluateWebVersionPolicy("1.4.0", {
      minimumSupportedVersion: "1.3.0",
      latestAvailableVersion: "1.5.0",
      releaseNotes: null,
    });

    expect(result.kind).toBe("updateRecommended");
  });

  it("marks app as up-to-date when already on latest", () => {
    const result = evaluateWebVersionPolicy("1.5.0", {
      minimumSupportedVersion: "1.3.0",
      latestAvailableVersion: "1.5.0",
      releaseNotes: null,
    });

    expect(result.kind).toBe("upToDate");
  });

  it("compares semantic-like dotted versions", () => {
    expect(compareVersions("1.2.0", "1.10.0")).toBe(-1);
    expect(compareVersions("2.0", "1.9.9")).toBe(1);
    expect(compareVersions("1.2", "1.2.0")).toBe(0);
  });
});
