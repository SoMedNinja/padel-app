import { useMemo, useState, ReactNode } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  Stack,
  MenuItem,
  Paper,
  Chip,
} from "@mui/material";
import Avatar from "../Avatar";
import ProfileName from "../ProfileName";
import { Match, Profile, TournamentResult, PlayerStats } from "../../types";
import {
  getProfileDisplayName,
  makeNameToIdMap,
  resolveTeamIds,
} from "../../utils/profileMap";
import { getStoredAvatar } from "../../utils/avatar";
import { normalizeTeam } from "../../utils/stats";
import {
  ELO_BASELINE,
  getWinProbability,
} from "../../utils/elo";
import {
  buildHeadToHeadStats,
  buildHeadToHeadTournaments,
  buildMvpSummary,
  getHighestEloRating
} from "../../utils/playerStats";
import { formatDate, formatScore, percent, formatMvpDays } from "../../utils/format";
import "./HeadToHeadSection.css";

const renderPlayerOptionLabel = (profile: Profile | null | undefined): ReactNode => {
  if (!profile) return "Okänd";
  const baseName = getProfileDisplayName(profile);
  // Note for non-coders: we pass the plain name and the badge separately so the UI can
  // show the badge as its own little tag instead of text glued onto the name.
  return <ProfileName name={baseName} badgeId={profile.featured_badge_id} />;
};

interface HeadToHeadSectionProps {
  user: any;
  profiles?: Profile[];
  matches?: Match[];
  allEloPlayers?: PlayerStats[];
  tournamentResults?: TournamentResult[];
  eloDeltaByMatch?: Record<string, Record<string, number>>;
}

export default function HeadToHeadSection({
  user,
  profiles = [],
  matches = [],
  allEloPlayers = [],
  tournamentResults = [],
  eloDeltaByMatch,
}: HeadToHeadSectionProps) {
  const playerProfile = useMemo(
    () => profiles.find(profile => profile.id === user?.id),
    [profiles, user]
  );
  const playerName = playerProfile
    ? getProfileDisplayName(playerProfile)
    : user?.email || "Din profil";
  const playerBadgeId = playerProfile?.featured_badge_id || null;
  const playerAvatarUrl = playerProfile?.avatar_url || getStoredAvatar(user?.id);

  const nameToIdMap = useMemo(() => makeNameToIdMap(profiles), [profiles]);
  const [mode, setMode] = useState<string>("against");

  const playerMatchCounts = useMemo(() => {
    const counts = new Map<string, number>();
    const uid = user?.id;
    if (!uid) return counts;

    for (const m of matches) {
      const t1 = normalizeTeam(resolveTeamIds(m.team1_ids, m.team1, nameToIdMap));
      const t2 = normalizeTeam(resolveTeamIds(m.team2_ids, m.team2, nameToIdMap));
      if (t1.includes(uid) || t2.includes(uid)) {
        [...t1, ...t2].forEach(id => {
          if (id !== uid) counts.set(id, (counts.get(id) || 0) + 1);
        });
      }
    }
    return counts;
  }, [matches, user?.id, nameToIdMap]);

  const selectablePlayers = useMemo(
    () => profiles
      .filter(profile => profile.id !== user?.id)
      .sort((a, b) => (playerMatchCounts.get(b.id) || 0) - (playerMatchCounts.get(a.id) || 0)),
    [profiles, user, playerMatchCounts]
  );

  const [opponentId, setOpponentId] = useState<string>("");
  const resolvedOpponentId =
    selectablePlayers.find(player => player.id === opponentId)?.id ||
    selectablePlayers[0]?.id ||
    "";

  const playerDeltaMap = useMemo(() => {
    // Optimization: If eloDeltaByMatch is passed, we can build this map in O(M_player)
    // instead of scanning all player history.
    const map = new Map<string, number>();
    const uid = user?.id;
    if (!uid) return map;

    if (eloDeltaByMatch) {
      for (let i = 0; i < matches.length; i++) {
        const mid = matches[i].id;
        const delta = eloDeltaByMatch[mid]?.[uid];
        if (delta !== undefined) {
          map.set(mid, delta);
        }
      }
      return map;
    }

    const currentPlayerStats = allEloPlayers.find(p => p.id === uid);
    currentPlayerStats?.history.forEach(h => {
      map.set(h.matchId, h.delta);
    });
    return map;
  }, [allEloPlayers, user?.id, eloDeltaByMatch, matches]);

  const headToHeadStats = useMemo(
    () => buildHeadToHeadStats(matches, user?.id, resolvedOpponentId, mode, nameToIdMap, playerDeltaMap),
    [matches, user, resolvedOpponentId, mode, nameToIdMap, playerDeltaMap]
  );

  const tournamentH2H = useMemo(
    () => buildHeadToHeadTournaments(tournamentResults, user?.id, resolvedOpponentId),
    [tournamentResults, user?.id, resolvedOpponentId]
  );

  const mvpSummary = useMemo(
    () => buildMvpSummary(matches, profiles, allEloPlayers, eloDeltaByMatch),
    [matches, profiles, allEloPlayers, eloDeltaByMatch]
  );

  const opponentProfile = selectablePlayers.find(player => player.id === resolvedOpponentId);
  const opponentAvatarUrl = opponentProfile?.avatar_url || getStoredAvatar(opponentProfile?.id);
  const opponentName = opponentProfile ? getProfileDisplayName(opponentProfile) : "Motståndare";
  const opponentBadgeId = opponentProfile?.featured_badge_id || null;

  const currentPlayerStats = allEloPlayers.find(p => p.id === user?.id);
  const opponentPlayerStats = allEloPlayers.find(p => p.id === resolvedOpponentId);

  const currentPlayerElo = currentPlayerStats?.elo ?? ELO_BASELINE;
  const opponentElo = opponentPlayerStats?.elo ?? ELO_BASELINE;

  const winProbability = useMemo(
    () => getWinProbability(currentPlayerElo, opponentElo),
    [currentPlayerElo, opponentElo]
  );

  const playerHighestElo = useMemo(
    () => getHighestEloRating(currentPlayerStats),
    [currentPlayerStats]
  );
  const opponentHighestElo = useMemo(
    () => getHighestEloRating(opponentPlayerStats),
    [opponentPlayerStats]
  );
  const playerMvpDays = mvpSummary.monthlyMvpDays[playerName] || 0;
  const opponentMvpDays = mvpSummary.monthlyMvpDays[opponentName] || 0;
  const playerEveningMvps = mvpSummary.eveningMvpCounts[playerName] || 0;
  const opponentEveningMvps = mvpSummary.eveningMvpCounts[opponentName] || 0;
  // Note for non-coders: these helpers build the colored win/loss text without repeating UI markup everywhere.
  const renderWinLossSplit = (wins: number, losses: number) => (
    <>
      <Box component="span" sx={{ color: 'success.main' }}>{wins}</Box>
      <Box component="span" sx={{ color: 'text.secondary', mx: 0.5 }}>–</Box>
      <Box component="span" sx={{ color: 'error.main' }}>{losses}</Box>
    </>
  );
  // Note for non-coders: set scores are shown as "you-opponent", so we color each side separately for clarity.
  const renderSetSplit = (setsFor: number, setsAgainst: number) => (
    <>
      <Box component="span" sx={{ color: 'success.main' }}>{setsFor}</Box>
      <Box component="span" sx={{ color: 'text.secondary', mx: 0.5 }}>–</Box>
      <Box component="span" sx={{ color: 'error.main' }}>{setsAgainst}</Box>
    </>
  );
  // Note for non-coders: this single style object keeps all stat "modules" visually consistent,
  // so iOS Safari and the installed PWA present the same card layout.
  const statModuleSx = {
    p: 2,
    textAlign: 'center' as const,
    borderRadius: 2,
    height: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    backgroundColor: 'background.paper',
  };
  // Note for non-coders: this fixed order mirrors the PWA layout exactly and prevents browser-specific wrapping
  // from changing which stat appears first.
  const primaryStats = [
    { label: 'Matcher', value: headToHeadStats.matches },
    {
      label: 'Vinst/förlust',
      value: renderWinLossSplit(headToHeadStats.wins, headToHeadStats.losses),
    },
    { label: 'Vinst %', value: `${percent(headToHeadStats.wins, headToHeadStats.losses)}%` },
    {
      label: 'Totala set',
      value: renderSetSplit(headToHeadStats.totalSetsFor, headToHeadStats.totalSetsAgainst),
    },
    {
      label: 'Din vinst/förlust med start-serve',
      value: renderWinLossSplit(headToHeadStats.serveFirstWins, headToHeadStats.serveFirstLosses),
    },
    {
      label: 'Din vinst/förlust utan start-serve',
      value: renderWinLossSplit(headToHeadStats.serveSecondWins, headToHeadStats.serveSecondLosses),
    },
    ...(mode === 'against'
      ? [
        {
          label: 'Vinstchans',
          value: `${Math.round(winProbability * 100)}%`,
        },
        {
          label: 'ELO-utbyte',
          value: `${headToHeadStats.totalEloExchange > 0 ? '+' : ''}${headToHeadStats.totalEloExchange}`,
          color:
              headToHeadStats.totalEloExchange > 0
                ? 'success.main'
                : headToHeadStats.totalEloExchange < 0
                  ? 'error.main'
                  : 'inherit',
        },
      ]
      : []),
  ];

  return (
    <Card className="head-to-head-section" variant="outlined" sx={{ borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 4 }}>Head-to-head</Typography>

        {selectablePlayers.length ? (
          <>
            <Stack direction="row" spacing={2} sx={{ mb: 4 }} flexWrap="wrap" useFlexGap>
              <TextField
                select
                label="Lägesval"
                size="small"
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                sx={{ minWidth: 200 }}
              >
                <MenuItem value="against">Jag mot spelare</MenuItem>
                <MenuItem value="together">Jag med spelare</MenuItem>
              </TextField>

              <TextField
                select
                label="Spelare"
                size="small"
                value={resolvedOpponentId}
                onChange={(e) => setOpponentId(e.target.value)}
                sx={{ minWidth: 200 }}
              >
                {selectablePlayers.map(player => (
                  <MenuItem key={player.id} value={player.id}>
                    {renderPlayerOptionLabel(player)}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>

            <div className="head-to-head-row">
              <Paper variant="outlined" className="head-to-head-card">
                <Avatar
                  sx={{ width: 64, height: 64, mx: 'auto', mb: 1 }}
                  src={playerAvatarUrl}
                  name={playerName}
                />
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  <ProfileName name={playerName} badgeId={playerBadgeId} />
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Du • ELO {currentPlayerElo}</Typography>
                <Typography variant="caption" color="text.secondary">Högst: {playerHighestElo}</Typography>
              </Paper>

              <Typography variant="h4" className="head-to-head-vs">
                {mode === "against" ? "VS" : "&"}
              </Typography>

              <Paper variant="outlined" className="head-to-head-card">
                <Avatar
                  sx={{ width: 64, height: 64, mx: 'auto', mb: 1 }}
                  src={opponentAvatarUrl}
                  name={opponentName}
                />
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  <ProfileName name={opponentName} badgeId={opponentBadgeId} />
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  {mode === "against" ? "Motstånd" : "Partner"} • ELO {opponentElo}
                </Typography>
                <Typography variant="caption" color="text.secondary">Högst: {opponentHighestElo}</Typography>
              </Paper>
            </div>

            <Grid container spacing={2}>
              {headToHeadStats.lastMatch && (
                <Grid size={{ xs: 12 }}>
                  {/* Note for non-coders: "Last game" is shown first as its own module, matching the PWA order and making the latest result easy to spot. */}
                  <Paper variant="outlined" sx={statModuleSx}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', display: 'block', mb: 1 }}>Senaste match</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                      {formatDate(headToHeadStats.lastMatch.date)}: {formatScore(headToHeadStats.lastMatch.setsFor, headToHeadStats.lastMatch.setsAgainst)} ({headToHeadStats.lastMatch.won ? 'Vinst' : 'Förlust'})
                    </Typography>
                  </Paper>
                </Grid>
              )}

              {/* Note for non-coders: we render stat modules from one ordered list so web and iOS show the same sequence. */}
              {primaryStats.map(stat => (
                <Grid key={stat.label} size={{ xs: 6, sm: 4, md: mode === 'against' ? 3 : 2.4 }}>
                  <Paper variant="outlined" sx={statModuleSx}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>{stat.label}</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: (stat as { color?: string }).color || 'inherit' }}>{stat.value}</Typography>
                  </Paper>
                </Grid>
              ))}

              <Grid size={{ xs: 12 }}>
                 <Paper variant="outlined" sx={statModuleSx}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', display: 'block', mb: 1 }}>Senaste 5</Typography>
                    {headToHeadStats.recentResults.length ? (
                      <Stack direction="row" spacing={1} justifyContent="center">
                        {headToHeadStats.recentResults.map((result, index) => (
                          <Chip
                            key={`${result}-${index}`}
                            label={result}
                            size="small"
                            color={result === "V" ? "success" : "error"}
                            sx={{ fontWeight: 800, width: 32 }}
                          />
                        ))}
                      </Stack>
                    ) : (
                      <Typography variant="h6">—</Typography>
                    )}
                 </Paper>
              </Grid>

              {[
                { label: "Antal dagar som månadens MVP", val1: formatMvpDays(playerMvpDays), val2: formatMvpDays(opponentMvpDays) },
                { label: "Turneringar (Gemensamma / Dina vinster)", val1: tournamentH2H.matches, val2: tournamentH2H.wins, labels: ["Gemensamma", "Dina vinster"] },
                { label: "Antal kvällens MVP", val1: playerEveningMvps, val2: opponentEveningMvps },
              ].map((comp, idx) => (
                <Grid key={idx} size={{ xs: 12 }}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', display: 'block', mb: 2 }}>{comp.label}</Typography>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 6 }}>
                        <Typography variant="caption" color="text.secondary">{comp.labels ? comp.labels[0] : "Du"}</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>{comp.val1}</Typography>
                      </Grid>
                      <Grid size={{ xs: 6 }} sx={{ textAlign: 'right' }}>
                        <Typography variant="caption" color="text.secondary">{comp.labels ? comp.labels[1] : opponentName}</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>{comp.val2}</Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </>
        ) : (
          <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
            Lägg till fler spelare för head-to-head statistik.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
