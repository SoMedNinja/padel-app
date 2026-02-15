export type PlatformIntent = "ios_safari" | "android_chrome" | "desktop" | "other_mobile";

export const getPlatformIntent = (): PlatformIntent => {
  if (typeof navigator === "undefined") return "desktop";

  const userAgent = navigator.userAgent || "";
  const platform = navigator.platform || "";
  const hasTouch = navigator.maxTouchPoints > 1;
  const isAndroid = /Android/i.test(userAgent);
  const isMobileKeyword = /Mobile/i.test(userAgent);
  const isClassicIos = /iPad|iPhone|iPod/i.test(userAgent) || /iPad|iPhone|iPod/i.test(platform);
  const isIpadOsDesktopUa = platform === "MacIntel" && hasTouch;
  const isIosFamily = isClassicIos || isIpadOsDesktopUa;
  const isSafariEngine = /Safari/i.test(userAgent);
  const isOtherIosBrowser = /CriOS|FxiOS|EdgiOS|OPiOS/i.test(userAgent);
  const isAndroidChrome = isAndroid && /Chrome/i.test(userAgent) && !/EdgA|OPR/i.test(userAgent);

  if (isIosFamily && isSafariEngine && !isOtherIosBrowser) {
    return "ios_safari";
  }

  if (isAndroidChrome) {
    return "android_chrome";
  }

  // Note for non-coders: if it is not clearly iPhone/Android phone traffic, we treat it as desktop behavior.
  if (!isMobileKeyword && !isAndroid && !isIosFamily) {
    return "desktop";
  }

  return "other_mobile";
};

export const isIosDevice = () => {
  if (typeof navigator === "undefined") return false;

  const userAgent = navigator.userAgent || "";
  const platform = navigator.platform || "";
  const hasTouch = navigator.maxTouchPoints > 1;
  const isClassicIos = /iPad|iPhone|iPod/i.test(userAgent) || /iPad|iPhone|iPod/i.test(platform);
  const isIpadOsDesktopUa = platform === "MacIntel" && hasTouch;

  // Note for non-coders: newer iPads sometimes identify themselves like laptops, so touch support helps us spot them.
  return isClassicIos || isIpadOsDesktopUa;
};

export const isIosSafariBrowser = () => {
  return getPlatformIntent() === "ios_safari";
};
