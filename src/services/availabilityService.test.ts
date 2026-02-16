import { describe, expect, it } from "vitest";
import { mapCreatePollError } from "./availabilityService";

describe("availabilityService", () => {
  describe("mapCreatePollError", () => {
    it("should return a friendly error message for duplicate key error (code 23505)", () => {
      const error = { code: "23505", message: "duplicate key value violates unique constraint" };
      const result = mapCreatePollError(error);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe("Det finns redan en omröstning för den veckan. Välj en annan vecka.");
    });

    it("should return original error for other errors", () => {
      const error = { code: "OTHER_ERROR", message: "Some other error" };
      const result = mapCreatePollError(error);
      expect(result).toBe(error);
    });

    it("should return original input for null/undefined", () => {
      expect(mapCreatePollError(null)).toBe(null);
      expect(mapCreatePollError(undefined)).toBe(undefined);
    });

    it("should return original input for non-error objects without code", () => {
        const error = { message: "Just a message" };
        const result = mapCreatePollError(error);
        expect(result).toBe(error);
    });
  });
});
