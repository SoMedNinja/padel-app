import { describe, it, expect, vi, afterEach } from "vitest";
import { getPlatformIntent, isIosDevice, isIosSafariBrowser } from "./platform";

describe("Platform Utils", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("getPlatformIntent", () => {
    it("should return 'desktop' when navigator is undefined", () => {
      vi.stubGlobal("navigator", undefined);
      expect(getPlatformIntent()).toBe("desktop");
    });

    it("should return 'ios_safari' for iPhone Safari", () => {
      vi.stubGlobal("navigator", {
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1",
        platform: "iPhone",
        maxTouchPoints: 5,
      });
      expect(getPlatformIntent()).toBe("ios_safari");
    });

    it("should return 'ios_safari' for iPad Safari", () => {
      vi.stubGlobal("navigator", {
        userAgent: "Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1",
        platform: "iPad",
        maxTouchPoints: 5,
      });
      expect(getPlatformIntent()).toBe("ios_safari");
    });

    it("should return 'ios_safari' for iPadOS (Desktop Mode)", () => {
      vi.stubGlobal("navigator", {
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Safari/605.1.15",
        platform: "MacIntel",
        maxTouchPoints: 5,
      });
      expect(getPlatformIntent()).toBe("ios_safari");
    });

    it("should return 'android_chrome' for Android Chrome", () => {
      vi.stubGlobal("navigator", {
        userAgent: "Mozilla/5.0 (Linux; Android 10; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.162 Mobile Safari/537.36",
        platform: "Linux armv8l",
        maxTouchPoints: 5,
      });
      expect(getPlatformIntent()).toBe("android_chrome");
    });

    it("should return 'desktop' for Mac Desktop (No Touch)", () => {
      vi.stubGlobal("navigator", {
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        platform: "MacIntel",
        maxTouchPoints: 0,
      });
      expect(getPlatformIntent()).toBe("desktop");
    });

    it("should return 'desktop' for Windows Desktop", () => {
      vi.stubGlobal("navigator", {
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        platform: "Win32",
        maxTouchPoints: 0,
      });
      expect(getPlatformIntent()).toBe("desktop");
    });

    it("should return 'other_mobile' for iOS Chrome (CriOS)", () => {
      vi.stubGlobal("navigator", {
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/87.0.4280.77 Mobile/15E148 Safari/604.1",
        platform: "iPhone",
        maxTouchPoints: 5,
      });
      expect(getPlatformIntent()).toBe("other_mobile");
    });

    it("should return 'other_mobile' for iOS Firefox (FxiOS)", () => {
      vi.stubGlobal("navigator", {
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/29.0 Mobile/15E148 Safari/604.1",
        platform: "iPhone",
        maxTouchPoints: 5,
      });
      expect(getPlatformIntent()).toBe("other_mobile");
    });

    it("should return 'other_mobile' for Android Edge (EdgA)", () => {
      vi.stubGlobal("navigator", {
        userAgent: "Mozilla/5.0 (Linux; Android 10; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.162 Mobile Safari/537.36 EdgA/45.0.4.4958",
        platform: "Linux armv8l",
        maxTouchPoints: 5,
      });
      expect(getPlatformIntent()).toBe("other_mobile");
    });

    it("should return 'other_mobile' for Android Opera (OPR)", () => {
      vi.stubGlobal("navigator", {
        userAgent: "Mozilla/5.0 (Linux; Android 10; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.162 Mobile Safari/537.36 OPR/55.2.2719.50740",
        platform: "Linux armv8l",
        maxTouchPoints: 5,
      });
      expect(getPlatformIntent()).toBe("other_mobile");
    });
  });

  describe("isIosDevice", () => {
    it("should return false when navigator is undefined", () => {
      vi.stubGlobal("navigator", undefined);
      expect(isIosDevice()).toBe(false);
    });

    it("should return true for iPhone", () => {
      vi.stubGlobal("navigator", {
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1",
        platform: "iPhone",
        maxTouchPoints: 5,
      });
      expect(isIosDevice()).toBe(true);
    });

    it("should return true for iPad", () => {
      vi.stubGlobal("navigator", {
        userAgent: "Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1",
        platform: "iPad",
        maxTouchPoints: 5,
      });
      expect(isIosDevice()).toBe(true);
    });

    it("should return true for iPadOS (Desktop Mode)", () => {
      vi.stubGlobal("navigator", {
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Safari/605.1.15",
        platform: "MacIntel",
        maxTouchPoints: 5,
      });
      expect(isIosDevice()).toBe(true);
    });

    it("should return false for Android", () => {
      vi.stubGlobal("navigator", {
        userAgent: "Mozilla/5.0 (Linux; Android 10; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.162 Mobile Safari/537.36",
        platform: "Linux armv8l",
        maxTouchPoints: 5,
      });
      expect(isIosDevice()).toBe(false);
    });

    it("should return false for Desktop (Mac)", () => {
      vi.stubGlobal("navigator", {
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        platform: "MacIntel",
        maxTouchPoints: 0,
      });
      expect(isIosDevice()).toBe(false);
    });
  });

  describe("isIosSafariBrowser", () => {
    it("should return true when platform intent is 'ios_safari'", () => {
      vi.stubGlobal("navigator", {
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1",
        platform: "iPhone",
        maxTouchPoints: 5,
      });
      expect(isIosSafariBrowser()).toBe(true);
    });

    it("should return false when platform intent is 'other_mobile' (e.g. Chrome on iOS)", () => {
      vi.stubGlobal("navigator", {
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/87.0.4280.77 Mobile/15E148 Safari/604.1",
        platform: "iPhone",
        maxTouchPoints: 5,
      });
      expect(isIosSafariBrowser()).toBe(false);
    });

    it("should return false when platform intent is 'desktop'", () => {
      vi.stubGlobal("navigator", {
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        platform: "MacIntel",
        maxTouchPoints: 0,
      });
      expect(isIosSafariBrowser()).toBe(false);
    });
  });
});
