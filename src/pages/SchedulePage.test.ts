import { describe, expect, it } from "vitest";
import { mergeExpandedPollsState } from "./SchedulePage";

describe("mergeExpandedPollsState", () => {
  it("keeps previous state reference when poll ids are unchanged", () => {
    const previousState = {
      "poll-1": true,
      "poll-2": false,
    };

    const samePolls = [{ id: "poll-1", status: "open" as const }, { id: "poll-2", status: "open" as const }];

    const firstPass = mergeExpandedPollsState(previousState, samePolls);
    const secondPass = mergeExpandedPollsState(firstPass, samePolls);

    // Note for non-coders: this checks "same object in memory", which means no unnecessary rerender trigger.
    expect(firstPass).toBe(previousState);
    expect(secondPass).toBe(firstPass);
  });

  it("adds only new poll ids and returns same object once synced", () => {
    const initialState = { "poll-1": true };

    const withNewPoll = mergeExpandedPollsState(initialState, [
      { id: "poll-1", status: "open" as const },
      { id: "poll-2", status: "open" as const }
    ]);

    expect(withNewPoll).not.toBe(initialState);
    expect(withNewPoll).toEqual({
      "poll-1": true,
      "poll-2": false,
    });

    const rerenderWithSamePollList = mergeExpandedPollsState(withNewPoll, [
      { id: "poll-1", status: "open" as const },
      { id: "poll-2", status: "open" as const }
    ]);

    // Note for non-coders: after the new id is registered once, next render should not create a new object again.
    expect(rerenderWithSamePollList).toBe(withNewPoll);
  });

  it("collapses closed polls even if they are first", () => {
    const initialState = {};
    const polls = [{ id: "poll-1", status: "closed" as const }];

    const state = mergeExpandedPollsState(initialState, polls);
    expect(state["poll-1"]).toBe(false);
  });
});
