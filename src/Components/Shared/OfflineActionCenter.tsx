import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  Collapse,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Alert,
} from "@mui/material";
import {
  CloudQueue,
  CloudOff,
  ExpandMore,
  ExpandLess,
  SyncProblem,
  Refresh,
  ErrorOutline,
  CheckCircle
} from "@mui/icons-material";
import { useMatchSyncStatus } from "../../hooks/useMatchSyncStatus";
import { matchService, QueuedMatchMutation } from "../../services/matchService";

export default function OfflineActionCenter() {
  const sync = useMatchSyncStatus();
  const [expanded, setExpanded] = useState(false);
  const [items, setItems] = useState<QueuedMatchMutation[]>([]);

  useEffect(() => {
    // Initial fetch
    setItems(matchService.getQueueItems());
  }, [sync]);

  // If fully synced and no pending/failed items, don't show anything
  if (sync.status === "synced" && !sync.pendingCount && !sync.failedCount) {
    return null;
  }

  const handleToggle = () => {
    setExpanded(!expanded);
  };

  const handleRetry = async () => {
    await matchService.flushMutationQueue();
  };

  const hasConflict = (sync.lastError || "").toLowerCase().includes("konflikt");
  const isFailed = sync.status === "failed";

  const getStatusColor = () => {
    if (hasConflict) return "error";
    if (isFailed) return "error";
    return "warning";
  };

  const getStatusIcon = () => {
    if (hasConflict) return <SyncProblem />;
    if (isFailed) return <CloudOff />;
    return <CloudQueue />;
  };

  const getTitle = () => {
    if (hasConflict) return "Synkroniseringskonflikt";
    if (isFailed) return "Synkronisering stoppad";
    return "Offline-kö aktiv";
  };

  const getDescription = () => {
    if (hasConflict) return "En match i kön krockar med servern.";
    if (isFailed) return `${sync.failedCount} ändringar kunde inte skickas.`;
    return `${sync.pendingCount} ändringar väntar på uppladdning.`;
  };

  return (
    <Paper
      elevation={3}
      sx={{
        overflow: 'hidden',
        borderLeft: 6,
        borderColor: `${getStatusColor()}.main`,
        bgcolor: 'background.paper',
        mb: 2,
        borderRadius: 2
      }}
    >
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer'
        }}
        onClick={handleToggle}
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleToggle();
        }
      }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ color: `${getStatusColor()}.main`, display: 'flex' }}>
            {getStatusIcon()}
          </Box>
          <Box>
            <Typography variant="subtitle1" fontWeight="bold">
              {getTitle()}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {getDescription()}
            </Typography>
          </Box>
        </Box>
        <IconButton
          component="div"
          size="small"
          aria-hidden="true"
          tabIndex={-1}
        >
          {expanded ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        <Box sx={{ px: 2, pb: 2 }}>
            {sync.lastError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {sync.lastError}
              </Alert>
            )}

            <List disablePadding>
              {items.map((item) => {
                // We show details for the first match in the batch payload for brevity
                const matchData = item.payload[0];
                if (!matchData) return null;

                const team1Name = Array.isArray(matchData.team1) ? matchData.team1.join(" & ") : matchData.team1;
                const team2Name = Array.isArray(matchData.team2) ? matchData.team2.join(" & ") : matchData.team2;
                const score = `${matchData.team1_sets}–${matchData.team2_sets}`;
                const isItemFailed = item.attempts > 0;
                const isConflict = isItemFailed && hasConflict; // Rough check, but visually enough

                return (
                  <ListItem
                    key={item.queueId}
                    sx={{
                      bgcolor: 'action.hover',
                      borderRadius: 1,
                      mb: 1,
                      border: '1px solid',
                      borderColor: 'divider'
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40 }}>
                       {isConflict ? (
                         <SyncProblem color="error" fontSize="small" />
                       ) : isItemFailed ? (
                         <ErrorOutline color="error" fontSize="small" />
                       ) : (
                         <CloudQueue color="action" fontSize="small" />
                       )}
                    </ListItemIcon>
                    <ListItemText
                      primary={`${team1Name} vs ${team2Name}`}
                      secondary={`Resultat: ${score} • ${isItemFailed ? `Försök: ${item.attempts}` : "Väntar på nätverk"}`}
                      primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                  </ListItem>
                );
              })}
            </List>

            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
               <Button
                 variant="outlined"
                 size="small"
                 startIcon={<Refresh />}
                 onClick={handleRetry}
                 // Allow retry if failed, conflict, or even pending (force sync)
               >
                 Försök synka nu
               </Button>
            </Box>
        </Box>
      </Collapse>
    </Paper>
  );
}
