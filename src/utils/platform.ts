export const isIosDevice = () => {
  if (typeof navigator === "undefined") return false;

  const userAgent = navigator.userAgent || "";
  const platform = navigator.platform || "";
  const hasTouch = navigator.maxTouchPoints > 1;

  const isClassicIos = /iPad|iPhone|iPod/i.test(userAgent) || /iPad|iPhone|iPod/i.test(platform);
  const isIpadOsDesktopUa = platform === "MacIntel" && hasTouch;

  // Note for non-coders: newer iPads sometimes say they are "Mac", so we also check for touch support.
  return isClassicIos || isIpadOsDesktopUa;
};

