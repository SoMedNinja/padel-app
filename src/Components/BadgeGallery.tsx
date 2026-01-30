import { useMemo } from "react";
import { Dialog, DialogTitle, DialogContent, Grid, Button, Typography, Paper, IconButton } from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import { buildPlayerBadges } from "../utils/badges";
import { Profile } from "../types";

interface BadgeGalleryProps {
  open: boolean;
  onClose: () => void;
  onSelect: (badgeId: string | null) => void;
  currentBadgeId: string | null | undefined;
  stats: any;
  allPlayerStats: Record<string, any>;
  playerId: string;
}

export default function BadgeGallery({
  open,
  onClose,
  onSelect,
  currentBadgeId,
  stats,
  allPlayerStats,
  playerId
}: BadgeGalleryProps) {
  const { earnedBadges } = useMemo(() => buildPlayerBadges(stats, allPlayerStats, playerId), [stats, allPlayerStats, playerId]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Välj framhävd merit
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ px: { xs: 2, sm: 3 }, pb: 4 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Välj en merit att visa bredvid ditt namn.
        </Typography>

        <Grid container spacing={1.5}>
          <Grid size={{ xs: 12 }}>
            <Button
              fullWidth
              variant={!currentBadgeId ? "contained" : "outlined"}
              onClick={() => onSelect(null)}
              sx={{ py: 1.5, borderRadius: 2, mb: 1 }}
            >
              Ingen merit
            </Button>
          </Grid>
          {earnedBadges.map((badge) => {
            const isSelected = currentBadgeId === badge.id;
            return (
              <Grid size={{ xs: 4, sm: 3 }} key={badge.id}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    cursor: 'pointer',
                    textAlign: 'center',
                    borderRadius: 3,
                    transition: 'all 0.2s',
                    borderColor: isSelected ? 'primary.main' : 'divider',
                    bgcolor: isSelected ? 'rgba(211, 47, 47, 0.08)' : 'background.paper',
                    '&:hover': {
                      borderColor: 'primary.light',
                      bgcolor: 'rgba(211, 47, 47, 0.04)',
                    },
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 0.5,
                    height: '100%',
                    justifyContent: 'center'
                  }}
                  onClick={() => onSelect(badge.id)}
                >
                  <Typography variant="h5">{badge.icon}</Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 800,
                      fontSize: '0.65rem',
                      textTransform: 'uppercase',
                      lineHeight: 1.1,
                      wordBreak: 'break-word'
                    }}
                  >
                    {badge.title}
                  </Typography>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      </DialogContent>
    </Dialog>
  );
}
