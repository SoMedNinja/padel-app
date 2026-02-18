import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getStoredAvatar, setStoredAvatar, removeStoredAvatar } from "./avatar";

describe("avatar utils", () => {
  const mockValue = "data:image/png;base64,...";

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return null if id is missing", () => {
    expect(getStoredAvatar(null)).toBeNull();
    expect(getStoredAvatar(undefined)).toBeNull();
  });

  it("should return null if item not in storage", () => {
    const id = "test-id-1";
    expect(getStoredAvatar(id)).toBeNull();
  });

  it("should return value from storage", () => {
    const id = "test-id-2";
    localStorage.setItem(`padel-avatar:${id}`, mockValue);
    expect(getStoredAvatar(id)).toBe(mockValue);
  });

  it("should cache value after first read", () => {
    const id = "test-id-3";
    localStorage.setItem(`padel-avatar:${id}`, mockValue);
    const getItemSpy = vi.spyOn(Storage.prototype, "getItem");

    // First read: hits localStorage
    expect(getStoredAvatar(id)).toBe(mockValue);
    expect(getItemSpy).toHaveBeenCalledTimes(1);

    // Second read: should hit cache
    expect(getStoredAvatar(id)).toBe(mockValue);
    expect(getItemSpy).toHaveBeenCalledTimes(1);
  });

  it("setStoredAvatar should update storage and cache", () => {
    const id = "test-id-4";
    setStoredAvatar(id, mockValue);
    expect(localStorage.getItem(`padel-avatar:${id}`)).toBe(mockValue);

    // Verify cache is updated by mocking getItem and seeing if it is called (it shouldn't be needed)
    const getItemSpy = vi.spyOn(Storage.prototype, "getItem");
    expect(getStoredAvatar(id)).toBe(mockValue);
    expect(getItemSpy).not.toHaveBeenCalled();
  });

  it("removeStoredAvatar should remove from storage and cache", () => {
    const id = "test-id-5";
    setStoredAvatar(id, mockValue);
    removeStoredAvatar(id);
    expect(localStorage.getItem(`padel-avatar:${id}`)).toBeNull();

    // Verify cache is updated
    const getItemSpy = vi.spyOn(Storage.prototype, "getItem");
    expect(getStoredAvatar(id)).toBeNull();
    expect(getItemSpy).not.toHaveBeenCalled();
  });
});
