import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  buildPlayerBadgeStats,
  buildPlayerBadges,
} from "../utils/badges";
import { makeNameToIdMap } from "../utils/profileMap";
import { supabase } from "../supabaseClient";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Stack,
  Divider,
  LinearProgress,
  IconButton,
  Chip,
  Paper,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  EmojiEvents as TrophyIcon,
  Star as StarIcon,
} from "@mui/icons-material";

const groupBadgesByType = (badges = []) => {
  const grouped = new Map();
  badges.forEach((badge) => {
    const group = badge.group || "Övrigt";
    if (!grouped.has(group)) {
      grouped.set(group, { label: group, order: badge.groupOrder ?? 999, items: [] });
    }
    grouped.get(group).items.push(badge);
  });

  return [...grouped.values()].sort((a, b) => a.order - b.order);
};

export default function MeritsSection({
  user,
  profiles = [],
  matches = [],
  tournamentResults = [],
  onProfileUpdate,
}) {
  const playerProfile = useMemo(
    () => profiles.find(profile => profile.id === user?.id),
    [profiles, user]
  );
  const nameToIdMap = useMemo(() => makeNameToIdMap(profiles), [profiles]);

  const [isEarnedExpanded, setIsEarnedExpanded] = useState(true);
  const [isLockedExpanded, setIsLockedExpanded] = useState(true);
  const [selectedBadgeId, setSelectedBadgeId] = useState(
    playerProfile?.featured_badge_id || null
  );
  const [savingBadgeId, setSavingBadgeId] = useState(null);

  const handleBadgeSelection = async (badgeId) => {
    if (!user?.id) return;
    const nextBadgeId = badgeId === selectedBadgeId ? null : badgeId;
    setSavingBadgeId(badgeId);
    setSelectedBadgeId(nextBadgeId);

    try {
      const { data, error } = await supabase
        .from("profiles")
        .update({ featured_badge_id: nextBadgeId })
        .eq("id", user.id)
        .select();

      if (error) {
        toast.error(error.message || "Kunde inte uppdatera visad merit.");
        setSelectedBadgeId(playerProfile?.featured_badge_id || null);
      } else if (data?.length) {
        onProfileUpdate?.(data[0]);
      }
    } catch (error) {
      toast.error(error?.message || "Kunde inte uppdatera visad merit.");
      setSelectedBadgeId(playerProfile?.featured_badge_id || null);
    } finally {
      setSavingBadgeId(null);
    }
  };

  const allPlayerStats = useMemo(() => {
    const statsMap: Record<string, any> = {};
    profiles.forEach(profile => {
      statsMap[profile.id] = buildPlayerBadgeStats(matches, profiles, profile.id, nameToIdMap, tournamentResults);
    });
    return statsMap;
  }, [matches, profiles, nameToIdMap, tournamentResults]);

  const badgeStats = useMemo(
    () => allPlayerStats[user?.id || ''],
    [allPlayerStats, user]
  );

  const badgeSummary = useMemo(
    () => buildPlayerBadges(badgeStats, allPlayerStats, user?.id),
    [badgeStats, allPlayerStats, user]
  );
  const earnedBadgeGroups = useMemo(
    () => groupBadgesByType(badgeSummary.earnedBadges),
    [badgeSummary.earnedBadges]
  );
  const lockedBadgeGroups = useMemo(
    () => groupBadgesByType(badgeSummary.lockedBadges),
    [badgeSummary.lockedBadges]
  );

  return (
    <Card variant="outlined" sx={{ borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>Meriter</Typography>
          <Typography variant="body2" color="text.secondary">
            {badgeSummary.totalEarned} av {badgeSummary.totalBadges} meriter upplåsta
          </Typography>
        </Box>

        <Box sx={{ mb: 6 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Upplåsta</Typography>
            <IconButton onClick={() => setIsEarnedExpanded(!isEarnedExpanded)}>
              {isEarnedExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>

          {isEarnedExpanded && (
            <Stack spacing={4}>
              {earnedBadgeGroups.length ? (
                earnedBadgeGroups.map(group => (
                  <Box key={`earned-${group.label}`}>
                    <Typography variant="overline" sx={{ fontWeight: 700, color: 'primary.main', mb: 2, display: 'block' }}>{group.label}</Typography>
                    <Grid container spacing={2}>
                      {group.items.map(badge => (
                        <Grid key={badge.id} size={{ xs: 12, sm: 6, md: 4 }}>
                          <Paper
                            variant="outlined"
                            sx={{
                              p: 2,
                              height: '100%',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 1,
                              borderRadius: 2,
                              bgcolor: '#f1f8f4',
                              color: 'success.dark',
                              border: 2,
                              borderColor: selectedBadgeId === badge.id ? 'primary.main' : 'success.light',
                              transition: 'all 0.2s',
                            }}
                          >
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="h4">{badge.icon}</Typography>
                              {badge.tier && <Chip label={badge.tier} size="small" variant="outlined" color="success" sx={{ fontWeight: 800 }} />}
                            </Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary' }}>{badge.title}</Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary', flexGrow: 1 }}>{badge.description}</Typography>
                            {badge.meta && <Typography variant="caption" sx={{ fontWeight: 700, color: 'success.main' }}>{badge.meta}</Typography>}
                            <Button
                              variant={selectedBadgeId === badge.id ? "contained" : "outlined"}
                              size="small"
                              color="success"
                              fullWidth
                              onClick={() => handleBadgeSelection(badge.id)}
                              disabled={savingBadgeId === badge.id}
                              sx={{ mt: 1, fontWeight: 700 }}
                            >
                              {selectedBadgeId === badge.id ? "Ta bort visning" : "Visa vid namn"}
                            </Button>
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                ))
              ) : (
                <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Inga upplåsta ännu</Typography>
                  <Typography variant="body2" color="text.secondary">Fortsätt spela för att låsa upp dina första badges.</Typography>
                </Paper>
              )}
            </Stack>
          )}
        </Box>

        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>På väg</Typography>
            <IconButton onClick={() => setIsLockedExpanded(!isLockedExpanded)}>
              {isLockedExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>

          {isLockedExpanded && (
            <Stack spacing={4}>
              {lockedBadgeGroups.map(group => (
                <Box key={`locked-${group.label}`}>
                  <Typography variant="overline" sx={{ fontWeight: 700, color: 'text.secondary', mb: 2, display: 'block' }}>{group.label}</Typography>
                  <Grid container spacing={2}>
                    {group.items.map(badge => {
                      const progress = badge.progress;
                      const progressPercent = progress
                        ? Math.round((progress.current / progress.target) * 100)
                        : 0;
                      return (
                        <Grid key={badge.id} size={{ xs: 12, sm: 6, md: 4 }}>
                          <Paper variant="outlined" sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', gap: 1, borderRadius: 2, bgcolor: 'grey.50', opacity: 0.8 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="h4" sx={{ filter: 'grayscale(1)' }}>{badge.icon}</Typography>
                              {badge.tier && <Chip label={badge.tier} size="small" variant="outlined" />}
                            </Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{badge.title}</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ flexGrow: 1 }}>{badge.description}</Typography>
                            {progress && (
                              <Box sx={{ mt: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                  <Typography variant="caption" sx={{ fontWeight: 700 }}>{progress.current}/{progress.target}</Typography>
                                  <Typography variant="caption" sx={{ fontWeight: 700 }}>{progressPercent}%</Typography>
                                </Box>
                                <LinearProgress variant="determinate" value={progressPercent} sx={{ borderRadius: 1, height: 6 }} />
                              </Box>
                            )}
                          </Paper>
                        </Grid>
                      );
                    })}
                  </Grid>
                </Box>
              ))}
            </Stack>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
