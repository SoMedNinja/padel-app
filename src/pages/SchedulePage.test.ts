import { describe, expect, it } from "vitest";
import { mergeExpandedPollsState } from "./SchedulePage";

describe("mergeExpandedPollsState", () => {
  it("keeps previous state reference when poll ids are unchanged", () => {
    const previousState = {
      "poll-1": true,
      "poll-2": false,
    };

    const samePolls = [{ id: "poll-1" }, { id: "poll-2" }];

    const firstPass = mergeExpandedPollsState(previousState, samePolls);
    const secondPass = mergeExpandedPollsState(firstPass, samePolls);

    // Note for non-coders: this checks "same object in memory", which means no unnecessary rerender trigger.
    expect(firstPass).toBe(previousState);
    expect(secondPass).toBe(firstPass);
  });

  it("adds only new poll ids and returns same object once synced", () => {
    const initialState = { "poll-1": true };

    const withNewPoll = mergeExpandedPollsState(initialState, [{ id: "poll-1" }, { id: "poll-2" }]);

    expect(withNewPoll).not.toBe(initialState);
    expect(withNewPoll).toEqual({
      "poll-1": true,
      "poll-2": false,
    });

    const rerenderWithSamePollList = mergeExpandedPollsState(withNewPoll, [{ id: "poll-1" }, { id: "poll-2" }]);

    // Note for non-coders: after the new id is registered once, next render should not create a new object again.
    expect(rerenderWithSamePollList).toBe(withNewPoll);
  });
});
