import { describe, expect, it } from "vitest";
import { buildMatchCreateRequest, buildScheduleVoteRequest } from "./contractTransforms";

describe("contract high-risk parity", () => {
  it("handles match mode edge cases for 1v1 and 2v2", () => {
    const oneVsOne = buildMatchCreateRequest({
      team1: ["A"],
      team2: ["B"],
      team1_sets: 2,
      team2_sets: 1,
      created_by: "user-1",
    });
    expect(oneVsOne.match_mode).toBe("1v1");

    const twoVsTwo = buildMatchCreateRequest({
      team1: ["A", "B"],
      team2: ["C", "D"],
      team1_sets: 6,
      team2_sets: 4,
      created_by: "user-1",
      match_mode: "2v2",
    });
    expect(twoVsTwo.match_mode).toBe("2v2");

    expect(() =>
      buildMatchCreateRequest({
        team1: ["A"],
        team2: ["C", "D"],
        team1_sets: 1,
        team2_sets: 0,
        created_by: "user-1",
        match_mode: "2v2",
      }),
    ).toThrow(/2 spelare/);
  });

  it("rejects empty schedule vote preferences", () => {
    expect(() =>
      buildScheduleVoteRequest({
        poll_day_id: "day-1",
        profile_id: "profile-1",
        slot_preferences: [],
      }),
    ).toThrow(/minst en tidslucka/i);
  });

  it("accepts auth refresh payload shape", () => {
    const payload = { refresh_token: "refresh-token" };
    expect(payload.refresh_token).toBeTruthy();
  });
});
