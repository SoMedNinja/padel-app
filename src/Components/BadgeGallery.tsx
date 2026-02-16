import { useMemo } from "react";
import { Grid, Button, Typography, Paper, ButtonBase, LinearProgress, Box, Tooltip, Tab, Tabs, Stack } from "@mui/material";
import { Lock as LockIcon } from "@mui/icons-material";
import { buildPlayerBadges } from "../utils/badges";
import AppBottomSheet from "./Shared/AppBottomSheet";
import { useState } from "react";
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
  const [tab, setTab] = useState(0);
  const { earnedBadges, lockedBadges } = useMemo(() => buildPlayerBadges(stats, allPlayerStats, playerId), [stats, allPlayerStats, playerId]);

  return (
    <AppBottomSheet open={open} onClose={onClose} title="Meriter">
      <Tabs
        value={tab}
        onChange={(_, newValue) => setTab(newValue)}
        sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
        variant="fullWidth"
      >
        <Tab label={`Intjänade (${earnedBadges.length})`} sx={{ fontWeight: 700 }} />
        <Tab label="Kommande" sx={{ fontWeight: 700 }} />
      </Tabs>

      <Box sx={{ pb: 2 }}>
        {tab === 0 ? (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Välj en merit att visa bredvid ditt namn på topplistan.
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
                    <Tooltip
                      title={badge.description}
                      arrow
                      enterTouchDelay={0}
                      leaveTouchDelay={3000}
                    >
                      <ButtonBase
                        component={Paper}
                        variant="outlined"
                        aria-label={`Välj merit: ${badge.title}`}
                        aria-pressed={isSelected}
                        sx={{
                          p: 1.5,
                          width: '100%',
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
                          justifyContent: 'center',
                          border: '1px solid',
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
                        {badge.tier !== "Unique" && (
                          <Typography variant="caption" sx={{ fontSize: '0.6rem', opacity: 0.6, fontWeight: 900 }}>
                            {badge.tier}
                          </Typography>
                        )}
                      </ButtonBase>
                    </Tooltip>
                  </Grid>
                );
              })}
            </Grid>
          </>
        ) : (
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Här ser du framsteg mot nästa nivå av meriter.
            </Typography>
            {lockedBadges
              .filter(b => b.progress && b.progress.current > 0) // Only show those with some progress
              .sort((a, b) => ((b.progress?.current || 0) / (b.progress?.target || 1)) - ((a.progress?.current || 0) / (a.progress?.target || 1)))
              .slice(0, 10)
              .map(badge => (
              <Box key={badge.id} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                  <Box sx={{ fontSize: '1.5rem', opacity: 0.5 }}><LockIcon fontSize="small" /></Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{badge.title}</Typography>
                    <Typography variant="caption" color="text.secondary">{badge.description}</Typography>
                  </Box>
                  <Typography variant="caption" sx={{ fontWeight: 800 }}>
                    {badge.progress?.current} / {badge.progress?.target}
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={((badge.progress?.current || 0) / (badge.progress?.target || 1)) * 100}
                  sx={{ height: 6, borderRadius: 3 }}
                />
              </Box>
            ))}
            {lockedBadges.filter(b => b.progress && b.progress.current > 0).length === 0 && (
              <Typography variant="body2" sx={{ textAlign: 'center', py: 4, opacity: 0.6 }}>
                Inga påbörjade meriter ännu. Fortsätt spela!
              </Typography>
            )}
          </Stack>
        )}
      </Box>
    </AppBottomSheet>
  );
}
