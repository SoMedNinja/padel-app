import { Box, Typography } from "@mui/material";

const isIosDevice = () => {
  if (typeof navigator === "undefined") return false;

  const userAgent = navigator.userAgent || "";
  const platform = navigator.platform || "";
  const hasTouch = navigator.maxTouchPoints > 1;

  const isClassicIos = /iPad|iPhone|iPod/i.test(userAgent) || /iPad|iPhone|iPod/i.test(platform);
  const isIpadOsDesktopUa = platform === "MacIntel" && hasTouch;

  // Note for non-coders: newer iPads can pretend to be "Mac" in the browser, so we also check if touch is available.
  return isClassicIos || isIpadOsDesktopUa;
};

const IOS_PULL_LABEL = "Dra för att ladda senaste padelnytt...";
const DEFAULT_PULL_LABEL = "Dra för att se vad som hänt...";

const IOS_REFRESH_LABEL = "Padelbollarna studsar medan vi laddar...";
const DEFAULT_REFRESH_LABEL = "Hämtar senaste resultaten...";

export const RefreshingContent = () => {
  const isIos = isIosDevice();

  if (!isIos) {
    return (
      <Box className="ptr-animation-container">
        <Box sx={{ position: "relative", height: 40, display: "flex", alignItems: "flex-end", justifyContent: "center", width: 40 }}>
          <Box className="padel-ball bouncing-ball" />
          <Box className="ball-shadow" sx={{ position: "absolute", bottom: -2 }} />
        </Box>
        <Typography variant="caption" sx={{ fontWeight: 800, color: "primary.main", mt: 1, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {DEFAULT_REFRESH_LABEL}
        </Typography>
      </Box>
    );
  }

  return (
    <Box className="ptr-animation-container ptr-ios-refreshing">
      <Box className="ptr-ios-ball-cluster" aria-hidden="true">
        {[0, 1, 2, 3].map((ballIndex) => (
          <Box key={ballIndex} className={`padel-ball ptr-ios-ball ptr-ios-ball-${ballIndex + 1}`}>
            <Box className="ball-shadow ptr-ios-ball-shadow" />
          </Box>
        ))}
      </Box>
      <Typography variant="caption" sx={{ fontWeight: 800, color: "primary.main", mt: 1, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {IOS_REFRESH_LABEL}
      </Typography>
    </Box>
  );
};

export const PullingContent = () => {
  const isIos = isIosDevice();

  if (!isIos) {
    return (
      <Box sx={{ p: 2, textAlign: "center", opacity: 0.6 }}>
        <Box sx={{ mb: 1, fontSize: "1.2rem" }}>🎾</Box>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>{DEFAULT_PULL_LABEL}</Typography>
      </Box>
    );
  }

  return (
    <Box className="ptr-animation-container ptr-ios-pulling">
      <Box className="ptr-ios-pull-ball-wrapper" aria-hidden="true">
        <Box className="padel-ball ptr-ios-pull-ball" />
        <Box className="ball-shadow ptr-ios-pull-shadow" />
      </Box>
      <Typography variant="body2" sx={{ fontWeight: 700, color: "primary.main" }}>{IOS_PULL_LABEL}</Typography>
    </Box>
  );
};
