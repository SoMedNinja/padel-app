import { describe, it, expect } from "vitest";
import { sortRows } from "./sort";

describe("sortRows", () => {
  interface Item {
    id: number;
    name: string;
    score: number;
  }

  const items: Item[] = [
    { id: 1, name: "Alice", score: 10 },
    { id: 2, name: "Bob", score: 5 },
    { id: 3, name: "Charlie", score: 10 },
    { id: 4, name: "David", score: 8 },
  ];

  it("should sort by number ascending", () => {
    const sorted = sortRows(items, "score", true);
    expect(sorted.map(i => i.score)).toEqual([5, 8, 10, 10]);
  });

  it("should sort by number descending", () => {
    const sorted = sortRows(items, "score", false);
    expect(sorted.map(i => i.score)).toEqual([10, 10, 8, 5]);
  });

  it("should sort by string ascending", () => {
    const sorted = sortRows(items, "name", true);
    expect(sorted.map(i => i.name)).toEqual(["Alice", "Bob", "Charlie", "David"]);
  });

  it("should sort by string descending", () => {
    const sorted = sortRows(items, "name", false);
    expect(sorted.map(i => i.name)).toEqual(["David", "Charlie", "Bob", "Alice"]);
  });

  it("should handle empty arrays", () => {
    const sorted = sortRows([], "score", true);
    expect(sorted).toEqual([]);
  });

  it("should handle single element arrays", () => {
    const single = [{ id: 1, name: "Alice", score: 10 }];
    const sorted = sortRows(single, "score", true);
    expect(sorted).toEqual(single);
  });

  it("should not mutate the original array", () => {
    const original = [...items];
    sortRows(items, "score", true);
    expect(items).toEqual(original);
  });
});
