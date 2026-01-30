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
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Välj en av dina intjänade meriter för att visa den bredvid ditt namn i appen.
        </Typography>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <Button
              fullWidth
              variant={!currentBadgeId ? "contained" : "outlined"}
              onClick={() => onSelect(null)}
              sx={{ py: 1.5, borderRadius: 2 }}
            >
              Ingen merit
            </Button>
          </Grid>
          {earnedBadges.map((badge) => {
            const isSelected = currentBadgeId === badge.id;
            return (
              <Grid size={{ xs: 6 }} key={badge.id}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    cursor: 'pointer',
                    textAlign: 'center',
                    borderRadius: 3,
                    transition: 'all 0.2s',
                    borderColor: isSelected ? 'primary.main' : 'divider',
                    bgcolor: isSelected ? 'rgba(211, 47, 47, 0.04)' : 'background.paper',
                    '&:hover': {
                      borderColor: 'primary.light',
                      bgcolor: 'rgba(211, 47, 47, 0.02)',
                    }
                  }}
                  onClick={() => onSelect(badge.id)}
                >
                  <Typography variant="h4" sx={{ mb: 1 }}>{badge.icon}</Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5 }}>{badge.title}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>
                    {badge.description}
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
