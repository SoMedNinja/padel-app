import { useEffect, useState } from "react";
import { Box, Paper, Typography, CircularProgress } from "@mui/material";
import { matchService } from "../../services/matchService";
import { alpha } from "@mui/material/styles";

export default function OfflineQueueList() {
  const [queueState, setQueueState] = useState(matchService.getMutationQueueState());
  const [items, setItems] = useState(matchService.getQueueItems());

  useEffect(() => {
    return matchService.subscribeToMutationQueue((newState) => {
      setQueueState(newState);
      setItems(matchService.getQueueItems());
    });
  }, []);

  if (queueState.status === "synced" && items.length === 0) {
    return null;
  }

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="overline" color="text.secondary" fontWeight={700} sx={{ mb: 1, display: 'block' }}>
        Köade matcher (Offline)
      </Typography>
      {items.map((item) => {
        // We display the first match in the batch as representative
        const matchData = item.payload[0];
        const team1 = Array.isArray(matchData.team1) ? matchData.team1.join(" & ") : matchData.team1;
        const team2 = Array.isArray(matchData.team2) ? matchData.team2.join(" & ") : matchData.team2;
        const result = `${matchData.team1_sets}–${matchData.team2_sets}`;

        return (
          <Paper
            key={item.queueId}
            variant="outlined"
            sx={{
              p: 2,
              mb: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              bgcolor: (theme) => alpha(theme.palette.warning.main, 0.08),
              borderColor: "warning.main",
              borderRadius: "12px",
            }}
          >
            <Box>
              <Typography variant="subtitle2" fontWeight={700}>
                {team1} vs {team2}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                Resultat: {result}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {item.attempts > 0 ? `Försök ${item.attempts}...` : "Väntar på anslutning..."}
              </Typography>
            </Box>
            <CircularProgress size={20} color="warning" thickness={5} />
          </Paper>
        );
      })}
      {queueState.lastError && (
        <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block', fontWeight: 500 }}>
          Fel: {queueState.lastError}
        </Typography>
      )}
    </Box>
  );
}
