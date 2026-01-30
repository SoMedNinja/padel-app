import { Box, Typography } from "@mui/material";

export const RefreshingContent = () => (
  <Box className="ptr-animation-container">
    <Box sx={{ position: 'relative', height: 40, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', width: 40 }}>
      <Box className="padel-ball bouncing-ball" />
      <Box className="ball-shadow" sx={{ position: 'absolute', bottom: -2 }} />
    </Box>
    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', mt: 1 }}>
      Uppdaterar...
    </Typography>
  </Box>
);

export const PullingContent = () => (
  <Box sx={{ p: 2, textAlign: 'center', opacity: 0.6 }}>
    <Typography variant="body2">Dra för att uppdatera...</Typography>
  </Box>
);
