import {
  Box,
  Typography,
  Grid,
  Paper,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { MVP_WINDOW_DAYS } from "../../utils/mvp";

interface SynergyRivalryProps {
  synergy: { name: string; games: number; wins: number } | null;
  rival: { name: string; games: number; losses: number } | null;
  resolvePlayerName: (nameOrId: string) => string;
}

export default function SynergyRivalry({
  synergy,
  rival,
  resolvePlayerName,
}: SynergyRivalryProps) {
  return (
    <Box sx={{ mt: 6 }}>
      <Typography variant="h6" sx={{ fontWeight: 800, mb: 3 }}>Synergi & Rivalitet ({MVP_WINDOW_DAYS}d)</Typography>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          {/* Note for non-coders: We use a lighter tinted background so the text is easier to read. */}
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: (theme) => alpha(theme.palette.success.light, 0.25),
              color: "text.primary",
            }}
          >
            <Typography variant="overline" sx={{ fontWeight: 700, opacity: 0.9 }}>Bästa Partner</Typography>
            {synergy ? (
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>{resolvePlayerName(synergy.name)}</Typography>
                <Typography variant="caption">
                  {synergy.wins} vinster på {synergy.games} matcher ({Math.round((synergy.wins / synergy.games) * 100)}%)
                </Typography>
              </Box>
            ) : (
              <Typography variant="h6">—</Typography>
            )}
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          {/* Note for non-coders: This lighter red keeps the warning feel without hurting contrast. */}
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: (theme) => alpha(theme.palette.error.light, 0.2),
              color: "text.primary",
            }}
          >
            <Typography variant="overline" sx={{ fontWeight: 700, opacity: 0.9 }}>Tuffaste Motståndare</Typography>
            {rival ? (
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>{resolvePlayerName(rival.name)}</Typography>
                <Typography variant="caption">
                  {rival.losses} förluster på {rival.games} matcher ({Math.round((rival.losses / rival.games) * 100)}%)
                </Typography>
              </Box>
            ) : (
              <Typography variant="h6">—</Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
