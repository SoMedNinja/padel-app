import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  buildAllPlayersBadgeStats,
  buildPlayerBadges,
  type Badge,
} from "../utils/badges";
import { makeNameToIdMap } from "../utils/profileMap";
import { profileService } from "../services/profileService";
import { educationTopics } from "../content/educationTopics";
import { readCompletedQuizMap } from "../utils/educationQuiz";
import { padelPuzzles } from "../content/padelPuzzles";
import { readFirstPerfectPuzzlePlayer, readPuzzleAnswerMap } from "../utils/padelPuzzle";
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
  Avatar,
  CircularProgress,
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

const buildEducationBadges = (userId: string | null | undefined): Badge[] => {
  if (!userId) return [];
  const completedByTopicId = readCompletedQuizMap(userId);

  // Note for non-coders: this converts each training topic into a profile merit card
  // so quiz-earned merits appear in the same place as match and tournament merits.
  return educationTopics.map((topic) => {
    const completion = completedByTopicId[topic.id];
    const earned = Boolean(completion?.passed);
    const answeredCount = completion?.correctCount ?? 0;

    return {
      id: topic.badgeId,
      icon: topic.badgeIcon,
      tier: "Quiz",
      title: topic.badgeLabel,
      description: `Klara quizet för ${topic.title}`,
      earned,
      group: "Utbildning",
      groupOrder: 27,
      meta: earned
        ? `Klarad ${new Date(completion.answeredAt).toLocaleDateString("sv-SE")}`
        : undefined,
      progress: {
        current: completion?.passed ? topic.quiz.length : answeredCount,
        target: topic.quiz.length,
      },
    } satisfies Badge;
  });
};

const buildPuzzleBadges = (
  userId: string | null | undefined,
  profiles: Array<{ id: string; name: string }>,
): { earned: Badge[]; locked: Badge[]; otherUnique: Badge[] } => {
  if (!userId) return { earned: [], locked: [], otherUnique: [] };

  const answersByQuestionId = readPuzzleAnswerMap(userId);
  const totalCorrect = Object.values(answersByQuestionId).filter((record) => record.isCorrect).length;
  const totalPuzzleCount = padelPuzzles.length;
  const firstPerfect = readFirstPerfectPuzzlePlayer();
  const firstPerfectOwner = firstPerfect
    ? profiles.find((profile) => String(profile.id) === String(firstPerfect.userId))
    : null;

  const thresholdBadges: Badge[] = [
    {
      id: "padel-quiz-correct-10",
      icon: "🎯",
      tier: "I",
      title: "Quizsäker 10",
      description: "Få 10 korrekta svar i Padel Quiz.",
      earned: totalCorrect >= 10,
      group: "Padel Quiz",
      groupOrder: 28,
      progress: { current: Math.min(totalCorrect, 10), target: 10 },
    },
    {
      id: "padel-quiz-correct-15",
      icon: "🧠",
      tier: "II",
      title: "Quizmästare 15",
      description: "Få 15 korrekta svar i Padel Quiz.",
      earned: totalCorrect >= 15,
      group: "Padel Quiz",
      groupOrder: 28,
      progress: { current: Math.min(totalCorrect, 15), target: 15 },
    },
  ];

  // Note for non-coders: this unique merit has one owner at a time in this app data,
  // and represents who first reached all puzzle scenarios with correct answers.
  const uniqueFirstPerfectBadge: Badge = {
    id: "padel-quiz-first-perfect",
    icon: "🥇",
    tier: "Unique",
    title: "Först till alla rätt",
    description: "Personen som nådde alla Quiz-scenarion rätt först.",
    earned: Boolean(firstPerfect?.userId && String(firstPerfect.userId) === String(userId)),
    group: "Padel Quiz",
    groupOrder: 28,
    progress: null,
    holderId:
      firstPerfect?.userId && String(firstPerfect.userId) !== String(userId)
        ? firstPerfect.userId
        : undefined,
    holderValue:
      firstPerfect?.userId && String(firstPerfect.userId) !== String(userId)
        ? firstPerfectOwner?.name ?? "Annan spelare"
        : undefined,
    meta: firstPerfect
      ? `Satt ${new Date(firstPerfect.achievedAt).toLocaleDateString("sv-SE")}`
      : `Ingen ägare ännu — första spelaren som når ${totalPuzzleCount} rätt tar meriten.`,
  };

  const earned = [...thresholdBadges.filter((badge) => badge.earned)];
  const locked = [...thresholdBadges.filter((badge) => !badge.earned)];
  const otherUnique: Badge[] = [];

  if (uniqueFirstPerfectBadge.earned) {
    earned.push(uniqueFirstPerfectBadge);
  } else if (uniqueFirstPerfectBadge.holderId) {
    otherUnique.push(uniqueFirstPerfectBadge);
  } else {
    locked.push(uniqueFirstPerfectBadge);
  }

  return { earned, locked, otherUnique };
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
  const [isOtherExpanded, setIsOtherExpanded] = useState(true);
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
      const data = await profileService.updateProfile(user.id, { featured_badge_id: nextBadgeId });
      onProfileUpdate?.(data);
    } catch (error: any) {
      toast.error(error?.message || "Kunde inte uppdatera visad merit.");
      setSelectedBadgeId(playerProfile?.featured_badge_id || null);
    } finally {
      setSavingBadgeId(null);
    }
  };

  const allPlayerStats = useMemo(() => {
    return buildAllPlayersBadgeStats(matches, profiles, nameToIdMap, tournamentResults);
  }, [matches, profiles, nameToIdMap, tournamentResults]);

  const badgeStats = useMemo(
    () => allPlayerStats[user?.id || ''],
    [allPlayerStats, user]
  );

  const badgeSummary = useMemo(
    () => buildPlayerBadges(badgeStats, allPlayerStats, user?.id),
    [badgeStats, allPlayerStats, user]
  );

  const educationBadges = useMemo(
    () => buildEducationBadges(user?.id),
    [user?.id]
  );

  const puzzleBadges = useMemo(
    () => buildPuzzleBadges(user?.id, profiles),
    [user?.id, profiles]
  );

  const mergedEarnedBadges = useMemo(
    () => [...badgeSummary.earnedBadges, ...educationBadges.filter((badge) => badge.earned), ...puzzleBadges.earned],
    [badgeSummary.earnedBadges, educationBadges, puzzleBadges.earned]
  );

  const mergedOtherUniqueBadges = useMemo(
    () => [...badgeSummary.otherUniqueBadges, ...puzzleBadges.otherUnique],
    [badgeSummary.otherUniqueBadges, puzzleBadges.otherUnique]
  );

  const mergedLockedBadges = useMemo(
    () => [...badgeSummary.lockedBadges, ...educationBadges.filter((badge) => !badge.earned), ...puzzleBadges.locked],
    [badgeSummary.lockedBadges, educationBadges, puzzleBadges.locked]
  );

  const mergedTotalBadges = badgeSummary.totalBadges + educationBadges.length + puzzleBadges.earned.length + puzzleBadges.locked.length + puzzleBadges.otherUnique.length;
  const mergedTotalEarned = mergedEarnedBadges.length;

  const earnedBadgeGroups = useMemo(
    () => groupBadgesByType(mergedEarnedBadges),
    [mergedEarnedBadges]
  );
  const lockedBadgeGroups = useMemo(
    () => groupBadgesByType(mergedLockedBadges),
    [mergedLockedBadges]
  );

  return (
    <Card variant="outlined" sx={{ borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>Meriter</Typography>
          <Typography variant="body2" color="text.secondary">
            {mergedTotalEarned} av {mergedTotalBadges} meriter upplåsta
          </Typography>
        </Box>

        <Box sx={{ mb: 6 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Upplåsta</Typography>
            <IconButton
              onClick={() => setIsEarnedExpanded(!isEarnedExpanded)}
              aria-label={isEarnedExpanded ? "Dölj upplåsta meriter" : "Visa upplåsta meriter"}
            >
              {isEarnedExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>

          {isEarnedExpanded && (
            <Stack spacing={4}>
              {earnedBadgeGroups.length ? (
                earnedBadgeGroups.map(group => (
                  <Box key={`earned-${group.label}`}>
                    <Typography variant="overline" sx={{ fontWeight: 700, color: 'primary.main', mb: 2, display: 'block' }}>{group.label}</Typography>
                    <Grid container spacing={1.5}>
                      {group.items.map(badge => (
                        <Grid key={badge.id} size={{ xs: 6, sm: 4, md: 4 }}>
                          <Paper
                            variant="outlined"
                            sx={{
                              p: 1.5,
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
                              <Typography variant="h5">{badge.icon}</Typography>
                              {badge.tier && <Chip label={badge.tier} size="small" variant="outlined" color="success" sx={{ fontWeight: 800, fontSize: '0.6rem', height: 20 }} />}
                            </Box>
                            <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1.2 }}>{badge.title}</Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary', flexGrow: 1 }}>{badge.description}</Typography>
                            {badge.meta && <Typography variant="caption" sx={{ fontWeight: 700, color: 'success.main' }}>{badge.meta}</Typography>}
                            <Button
                              variant={selectedBadgeId === badge.id ? "contained" : "outlined"}
                              size="small"
                              color="success"
                              fullWidth
                              onClick={() => handleBadgeSelection(badge.id)}
                              disabled={savingBadgeId === badge.id}
                              startIcon={savingBadgeId === badge.id ? <CircularProgress size={16} color="inherit" /> : null}
                              sx={{ mt: 1, fontWeight: 700 }}
                            >
                              {savingBadgeId === badge.id ? "Sparar..." : (selectedBadgeId === badge.id ? "Ta bort visning" : "Visa vid namn")}
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

        {mergedOtherUniqueBadges?.length > 0 && (
          <Box sx={{ mb: 6 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Unika meriter som kan byta ägare</Typography>
              <IconButton
                onClick={() => setIsOtherExpanded(!isOtherExpanded)}
                aria-label={isOtherExpanded ? "Dölj unika meriter" : "Visa unika meriter"}
              >
                {isOtherExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Box>

            {isOtherExpanded && (
              <Grid container spacing={1.5}>
                {mergedOtherUniqueBadges.map((badge: any) => {
                  const holder = profiles.find((p: any) => String(p.id) === String(badge.holderId));
                  return (
                    <Grid key={badge.id} size={{ xs: 6, sm: 4, md: 4 }}>
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 1.5,
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 1,
                          borderRadius: 2,
                          bgcolor: 'rgba(25, 118, 210, 0.04)',
                          borderColor: 'divider',
                          opacity: 0.9
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="h5">{badge.icon}</Typography>
                          <Chip label="Unik" size="small" variant="outlined" color="primary" sx={{ fontWeight: 800, fontSize: '0.6rem', height: 20 }} />
                        </Box>
                        <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1.2 }}>{badge.title}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', flexGrow: 1 }}>{badge.description}</Typography>

                        <Divider sx={{ my: 0.5 }} />

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar src={holder?.avatar_url} sx={{ width: 18, height: 18, fontSize: '0.6rem' }}>
                            {holder?.name?.charAt(0)}
                          </Avatar>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main', fontSize: '0.65rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {holder?.name || 'Okänd'} ({badge.holderValue})
                          </Typography>
                        </Box>
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>
            )}
          </Box>
        )}

        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>På väg</Typography>
            <IconButton
              onClick={() => setIsLockedExpanded(!isLockedExpanded)}
              aria-label={isLockedExpanded ? "Dölj låsta meriter" : "Visa låsta meriter"}
            >
              {isLockedExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>

          {isLockedExpanded && (
            <Stack spacing={4}>
              {lockedBadgeGroups.map(group => (
                <Box key={`locked-${group.label}`}>
                  <Typography variant="overline" sx={{ fontWeight: 700, color: 'text.secondary', mb: 2, display: 'block' }}>{group.label}</Typography>
                  <Grid container spacing={1.5}>
                    {group.items.map(badge => {
                      const progress = badge.progress;
                      const progressPercent = progress
                        ? Math.round((progress.current / progress.target) * 100)
                        : 0;
                      return (
                        <Grid key={badge.id} size={{ xs: 6, sm: 4, md: 4 }}>
                          <Paper variant="outlined" sx={{ p: 1.5, height: '100%', display: 'flex', flexDirection: 'column', gap: 0.5, borderRadius: 2, bgcolor: 'grey.50', opacity: 0.8 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="h5" sx={{ filter: 'grayscale(1)' }}>{badge.icon}</Typography>
                              {badge.tier && <Chip label={badge.tier} size="small" variant="outlined" sx={{ fontSize: '0.6rem', height: 20 }} />}
                            </Box>
                            <Typography variant="caption" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{badge.title}</Typography>
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
