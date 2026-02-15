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

export const isIosSafariBrowser = () => {
  if (typeof navigator === "undefined") return false;

  const userAgent = navigator.userAgent || "";
  const isSafariEngine = /Safari/i.test(userAgent);
  const isOtherIosBrowser = /CriOS|FxiOS|EdgiOS|OPiOS/i.test(userAgent);

  // Note for non-coders: iOS browsers all run on Safari's engine,
  // so we filter out known non-Safari app browser names.
  return isIosDevice() && isSafariEngine && !isOtherIosBrowser;
};
