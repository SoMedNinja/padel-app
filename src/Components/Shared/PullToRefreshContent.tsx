import { Box, Typography } from "@mui/material";

export const RefreshingContent = () => (
  <Box className="ptr-animation-container">
    <Box sx={{ position: 'relative', height: 40, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', width: 40 }}>
      <Box className="padel-ball bouncing-ball" />
      <Box className="ball-shadow" sx={{ position: 'absolute', bottom: -2 }} />
    </Box>
    <Typography variant="caption" sx={{ fontWeight: 800, color: 'primary.main', mt: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      Hämtar senaste resultaten...
    </Typography>
  </Box>
);

export const PullingContent = () => (
  <Box sx={{ p: 2, textAlign: 'center', opacity: 0.6 }}>
    <Box sx={{ mb: 1, fontSize: '1.2rem' }}>🎾</Box>
    <Typography variant="body2" sx={{ fontWeight: 600 }}>Dra för att se vad som hänt...</Typography>
  </Box>
);
