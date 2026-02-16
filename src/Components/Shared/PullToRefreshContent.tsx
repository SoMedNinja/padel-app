import { Box, Typography } from "@mui/material";
import { isIosDevice } from "../../utils/platform";

const IOS_PULL_LABEL = "Dra för att ladda senaste padelnytt...";
const DEFAULT_PULL_LABEL = "Dra för att se vad som hänt...";

const IOS_REFRESH_LABEL = "Padelbollarna studsar medan vi laddar...";
const DEFAULT_REFRESH_LABEL = "Hämtar senaste resultaten...";

export const getPullToRefreshTuning = () => {
  const isIos = isIosDevice();

  // Note for non-coders: these values ensure the content stays down enough to show the full
  // animation without overlapping the page content, matching the height of our custom balls/text.
  return {
    pullDownThreshold: isIos ? 100 : 100,
    maxPullDownDistance: isIos ? 150 : 150,
    resistance: isIos ? 0.72 : 1,
  };
};

export const RefreshingContent = () => {
  const isIos = isIosDevice();

  if (!isIos) {
    return (
      <Box className="ptr-animation-container" sx={{ zIndex: 1601, position: "relative" }}>
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
    <Box className="ptr-animation-container ptr-ios-refreshing" sx={{ zIndex: 1601, position: "relative" }}>
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
    <Box className="ptr-animation-container ptr-ios-pulling" sx={{ zIndex: 1601, position: "relative" }}>
      <Box className="ptr-ios-pull-ball-wrapper" aria-hidden="true">
        <Box className="padel-ball ptr-ios-pull-ball" />
        <Box className="ball-shadow ptr-ios-pull-shadow" />
      </Box>
      <Typography variant="body2" sx={{ fontWeight: 700, color: "primary.main" }}>{IOS_PULL_LABEL}</Typography>
    </Box>
  );
};
