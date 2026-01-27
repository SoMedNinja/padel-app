import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";
import Avatar from "./Avatar";
import {
  cropAvatarImage,
  getStoredAvatar,
  removeStoredAvatar,
  setStoredAvatar
} from "../utils/avatar";
import {
  ELO_BASELINE,
  calculateElo,
} from "../utils/elo";
import { GUEST_ID } from "../utils/guest";
import {
  getProfileDisplayName,
  makeNameToIdMap,
  makeProfileMap,
  resolveTeamIds,
  resolveTeamNames
} from "../utils/profileMap";
import {
  getPartnerSynergy,
  getToughestOpponent
} from "../utils/stats";
import {
  getMvpWinner,
  scorePlayersForMvp,
  EVENING_MIN_GAMES
} from "../utils/mvp";
import { getBadgeLabelById } from "../utils/badges";
import ProfileName from "./ProfileName";
import { supabase } from "../supabaseClient";
import { Match, Profile, TournamentResult, PlayerStats } from "../types";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  TextField,
  Stack,
  Divider,
  Slider,
  IconButton,
  Tooltip as MuiTooltip,
  Paper,
  Tab,
  Tabs,
  MenuItem,
  Chip,
} from "@mui/material";
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  PhotoCamera as PhotoIcon,
  Delete as DeleteIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
} from "@mui/icons-material";
import { alpha } from "@mui/material/styles";

const percent = (wins: number, losses: number) => {
  const total = wins + losses;
  return total === 0 ? 0 : Math.round((wins / total) * 100);
};

const formatEloDelta = (delta: number | string) => {
  const numericDelta = Number(delta);
  if (!Number.isFinite(numericDelta) || numericDelta === 0) return "0";
  const roundedDelta = Math.round(numericDelta);
  return roundedDelta > 0 ? `+${roundedDelta}` : `${roundedDelta}`;
};

const getEloDeltaClass = (delta: number | string) => {
  const numericDelta = Number(delta);
  if (!Number.isFinite(numericDelta) || numericDelta === 0) return "";
  return numericDelta > 0 ? "stat-delta-positive" : "stat-delta-negative";
};

const formatMvpDays = (days: number) => {
  if (!days) return "0 dagar";
  if (days >= 365) return `${(days / 365).toFixed(1)} år`;
  return `${days} dagar`;
};

const formatChartTimestamp = (value: string | number, includeTime = false) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const options: Intl.DateTimeFormatOptions = includeTime
    ? { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }
    : { year: "numeric", month: "short", day: "numeric" };
  return new Intl.DateTimeFormat("sv-SE", options).format(date);
};

const getPlayerOptionLabel = (profile: Profile) => {
  if (!profile) return "Okänd";
  const badgeLabel = getBadgeLabelById(profile.featured_badge_id || null);
  const baseName = getProfileDisplayName(profile);
  return badgeLabel ? `${baseName} ${badgeLabel}` : baseName;
};

const normalizeTeam = (team: any): string[] =>
  Array.isArray(team) ? team.filter(id => id && id !== GUEST_ID) : [];

const buildMvpSummary = (matches: Match[], profiles: Profile[], allEloPlayers: PlayerStats[]) => {
  const profileMap = makeProfileMap(profiles);
  const dateMap = new Map<string, Match[]>();
  const matchEntries = matches
    .map(match => {
      const normalizedMatch = {
        ...match,
        team1: resolveTeamNames(match.team1_ids, match.team1, profileMap),
        team2: resolveTeamNames(match.team2_ids, match.team2, profileMap)
      };
      return {
        match: normalizedMatch,
        time: new Date(match.created_at).getTime(),
        dateKey: match.created_at?.slice(0, 10),
      };
    })
    .filter((entry): entry is { match: Match, time: number, dateKey: string } =>
      Number.isFinite(entry.time) && entry.dateKey !== undefined
    );

  matchEntries.forEach(({ match, dateKey }) => {
    if (!dateMap.has(dateKey)) dateMap.set(dateKey, []);
    dateMap.get(dateKey)!.push(match);
  });

  const monthlyMvpDays: Record<string, number> = {};
  if (matchEntries.length) {
    const sortedEntries = [...matchEntries].sort((a, b) => a.time - b.time);
    const startDate = new Date(sortedEntries[0].dateKey);
    const latestMatchDate = new Date(sortedEntries[sortedEntries.length - 1].dateKey);
    const today = new Date();
    const endDate = latestMatchDate > today ? latestMatchDate : today;

    let windowStartIndex = 0;
    let windowEndIndex = 0;

    for (
      const cursor = new Date(startDate);
      cursor <= endDate;
      cursor.setDate(cursor.getDate() + 1)
    ) {
      const dateKey = cursor.toISOString().slice(0, 10);
      const dayEndTime = new Date(`${dateKey}T23:59:59.999Z`).getTime();
      const cutoff = dayEndTime - 30 * 24 * 60 * 60 * 1000;

      while (windowEndIndex < sortedEntries.length && sortedEntries[windowEndIndex].time <= dayEndTime) {
        windowEndIndex += 1;
      }

      while (windowStartIndex < windowEndIndex && sortedEntries[windowStartIndex].time <= cutoff) {
        windowStartIndex += 1;
      }

      const rollingMatches = sortedEntries
        .slice(windowStartIndex, windowEndIndex)
        .map(entry => entry.match);
      const results = scorePlayersForMvp(rollingMatches, allEloPlayers, 0);
      const winner = getMvpWinner(results);
      if (!winner) continue;
      monthlyMvpDays[winner.name] = (monthlyMvpDays[winner.name] || 0) + 1;
    }
  }

  const eveningMvpCounts: Record<string, number> = {};
  dateMap.forEach((dayMatches) => {
    const results = scorePlayersForMvp(dayMatches, allEloPlayers, EVENING_MIN_GAMES);
    const winner = getMvpWinner(results);
    if (!winner) return;
    eveningMvpCounts[winner.name] = (eveningMvpCounts[winner.name] || 0) + 1;
  });

  return { monthlyMvpDays, eveningMvpCounts };
};

const buildComparisonChartData = (players: PlayerStats[], profiles: Profile[], playerIds: string[]) => {
  if (!playerIds.length) return [];
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const profileNameMap = profiles.reduce((acc, profile) => {
    acc[profile.id] = getProfileDisplayName(profile);
    return acc;
  }, {} as Record<string, string>);

  const timelineEntries = new Map<string, { date: string, timestamp: number, matchId: string }>();
  playerIds.forEach(id => {
    const player = players.find(p => p.id === id);
    if (!player) return;
    player.history.forEach((entry) => {
      if (!entry.date) return;
      const entryDate = new Date(entry.date);
      if (Number.isNaN(entryDate.getTime()) || entryDate < oneYearAgo) return;
      const key = `${entry.date}::${entry.matchId}`;
      if (!timelineEntries.has(key)) {
        timelineEntries.set(key, { date: entry.date, timestamp: entry.timestamp, matchId: entry.matchId });
      }
    });
  });

  const dates = Array.from(timelineEntries.values()).sort((a, b) => {
    if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
    return a.matchId.localeCompare(b.matchId);
  });
  if (!dates.length) return [];

  const historyPointers = playerIds.map(id => {
    const player = players.find(p => p.id === id);
    return {
      id,
      name: profileNameMap[id] || "Okänd",
      history: (player?.history || []).filter(h => h.date),
      index: 0,
      lastElo: player?.startElo ?? ELO_BASELINE
    };
  });

  const isEntryBeforeOrEqual = (entry: any, dateEntry: any) => {
    if (entry.timestamp < dateEntry.timestamp) return true;
    if (entry.timestamp > dateEntry.timestamp) return false;
    return entry.matchId.localeCompare(dateEntry.matchId) <= 0;
  };

  return dates.map(dateEntry => {
    const row: any = { date: dateEntry.date };
    historyPointers.forEach(pointer => {
      while (
        pointer.index < pointer.history.length &&
        isEntryBeforeOrEqual(pointer.history[pointer.index], dateEntry)
      ) {
        pointer.lastElo = pointer.history[pointer.index].elo;
        pointer.index += 1;
      }
      row[pointer.name] = pointer.lastElo;
    });
    return row;
  });
};

const getHighestEloRating = (playerStats: PlayerStats | undefined) => {
  if (!playerStats) return ELO_BASELINE;
  const historyMax = playerStats.history.reduce(
    (max, entry) => Math.max(max, entry.elo),
    playerStats.startElo
  );
  return Math.max(historyMax, playerStats.elo);
};

const buildHeadToHead = (matches: Match[], playerId: string | undefined, opponentId: string, mode: string, nameToIdMap: Map<string, string>) => {
  if (!playerId || !opponentId) {
    return { wins: 0, losses: 0, matches: 0, avgSetDiff: 0, totalSetsFor: 0, totalSetsAgainst: 0 };
  }

  let wins = 0;
  let losses = 0;
  let total = 0;
  let totalSetsFor = 0;
  let totalSetsAgainst = 0;

  matches.forEach(match => {
    const team1 = normalizeTeam(resolveTeamIds(match.team1_ids, match.team1, nameToIdMap));
    const team2 = normalizeTeam(resolveTeamIds(match.team2_ids, match.team2, nameToIdMap));

    const isTeam1 = team1.includes(playerId);
    const isTeam2 = team2.includes(playerId);
    if (!isTeam1 && !isTeam2) return;

    const opponentTeam1 = team1.includes(opponentId);
    const opponentTeam2 = team2.includes(opponentId);

    if (!opponentTeam1 && !opponentTeam2) return;

    const together = (isTeam1 && opponentTeam1) || (isTeam2 && opponentTeam2);
    const against = (isTeam1 && opponentTeam2) || (isTeam2 && opponentTeam1);

    if ((mode === "together" && !together) || (mode === "against" && !against)) {
      return;
    }

    if (match.team1_sets == null || match.team2_sets == null) return;

    const s1 = Number(match.team1_sets || 0);
    const s2 = Number(match.team2_sets || 0);
    const team1Won = s1 > s2;
    const playerWon = (isTeam1 && team1Won) || (isTeam2 && !team1Won);

    total++;
    if (playerWon) {
      wins++;
    } else {
      losses++;
    }

    let setsFor = isTeam1 ? s1 : s2;
    let setsAgainst = isTeam1 ? s2 : s1;

    // Normalize point-based matches (from tournaments) to a 1-set win/loss
    // so they don't skew the "Set difference" average.
    if (match.score_type === "points") {
      if (setsFor > setsAgainst) {
        setsFor = 1;
        setsAgainst = 0;
      } else if (setsAgainst > setsFor) {
        setsFor = 0;
        setsAgainst = 1;
      } else {
        setsFor = 0;
        setsAgainst = 0;
      }
    }

    totalSetsFor += setsFor;
    totalSetsAgainst += setsAgainst;
  });

  const avgSetDiff = total ? (totalSetsFor - totalSetsAgainst) / total : 0;

  return { wins, losses, matches: total, avgSetDiff, totalSetsFor, totalSetsAgainst };
};

const buildHeadToHeadTournaments = (tournamentResults: TournamentResult[], playerId: string | undefined, opponentId: string) => {
  if (!playerId || !opponentId) return { wins: 0, matches: 0 };

  const playerResults = tournamentResults.filter(r => r.profile_id === playerId);
  const opponentResults = tournamentResults.filter(r => r.profile_id === opponentId);

  // Find tournaments where both played
  const playerTournamentIds = new Set(playerResults.map(r => r.tournament_id));
  const sharedTournaments = opponentResults.filter(r => playerTournamentIds.has(r.tournament_id));

  let wins = 0;
  let matches = 0;

  sharedTournaments.forEach(oppRes => {
    const playRes = playerResults.find(r => r.tournament_id === oppRes.tournament_id);
    if (!playRes) return;

    matches++;
    if (playRes.rank === 1) wins++;
  });

  return { wins, matches };
};

const buildHeadToHeadRecentResults = (
  matches: Match[],
  playerId: string | undefined,
  opponentId: string,
  mode: string,
  limit = 5,
  nameToIdMap: Map<string, string>
) => {
  if (!playerId || !opponentId) return [];
  const sortedMatches = [...matches].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const results = [];

  for (const match of sortedMatches) {
    const team1 = normalizeTeam(resolveTeamIds(match.team1_ids, match.team1, nameToIdMap));
    const team2 = normalizeTeam(resolveTeamIds(match.team2_ids, match.team2, nameToIdMap));

    const isTeam1 = team1.includes(playerId);
    const isTeam2 = team2.includes(playerId);
    if (!isTeam1 && !isTeam2) continue;

    const opponentTeam1 = team1.includes(opponentId);
    const opponentTeam2 = team2.includes(opponentId);
    if (!opponentTeam1 && !opponentTeam2) continue;

    const together = (isTeam1 && opponentTeam1) || (isTeam2 && opponentTeam2);
    const against = (isTeam1 && opponentTeam2) || (isTeam2 && opponentTeam1);

    if ((mode === "together" && !together) || (mode === "against" && !against)) {
      continue;
    }

    if (match.team1_sets == null || match.team2_sets == null) continue;

    const team1Won = match.team1_sets > match.team2_sets;
    const playerWon = (isTeam1 && team1Won) || (isTeam2 && !team1Won);
    results.push(playerWon ? "V" : "F");

    if (results.length >= limit) break;
  }

  return results;
};

interface PlayerSectionProps {
  user: any;
  profiles?: Profile[];
  matches?: Match[];
  allEloPlayers?: PlayerStats[];
  tournamentResults?: TournamentResult[];
  onProfileUpdate?: (profile: Profile) => void;
  mode?: "overview" | "chart";
}

export default function PlayerSection({
  user,
  profiles = [],
  matches = [],
  allEloPlayers = [],
  tournamentResults = [],
  onProfileUpdate,
  mode = "overview",
}: PlayerSectionProps) {
  const playerProfile = useMemo(
    () => profiles.find(profile => profile.id === user?.id),
    [profiles, user]
  );

  const playerName = playerProfile
    ? getProfileDisplayName(playerProfile)
    : user?.email || "Din profil";

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(playerName);

  useEffect(() => {
    setEditedName(playerName);
  }, [playerName]);

  const handleNameSave = async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from("profiles")
      .update({ name: editedName })
      .eq("id", user.id)
      .select()
      .single();
    if (error) {
      alert(error.message);
    } else {
      setIsEditingName(false);
      onProfileUpdate?.(data);
    }
  };

  const avatarStorageId = user?.id || null;
  const [avatarUrl, setAvatarUrl] = useState<string | null>(() =>
    avatarStorageId ? getStoredAvatar(avatarStorageId) : null
  );
  const [pendingAvatar, setPendingAvatar] = useState<string | null>(null);
  const [avatarZoom, setAvatarZoom] = useState<number>(1);
  const [savingAvatar, setSavingAvatar] = useState<boolean>(false);

  // Stats based on filtered matches (matches prop)
  const filteredEloPlayers = useMemo(
    () => calculateElo(matches, profiles),
    [matches, profiles]
  );

  const filteredStats = useMemo(
    () => filteredEloPlayers.find(p => p.id === user?.id),
    [filteredEloPlayers, user?.id]
  );

  const globalStats = useMemo(
    () => allEloPlayers.find(p => p.id === user?.id),
    [allEloPlayers, user?.id]
  );

  const currentEloDisplay = globalStats?.elo ?? ELO_BASELINE;

  const recentForm = useMemo(() => {
    const results = filteredStats?.recentResults ?? [];
    return results.slice(-5);
  }, [filteredStats]);

  const recentFormStats = useMemo(() => {
    const wins = recentForm.filter(result => result === "W").length;
    return { wins, losses: recentForm.length - wins };
  }, [recentForm]);

  const last30DaysDelta = useMemo(() => {
    const history = globalStats?.history ?? [];
    if (history.length === 0) return 0;
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return history
      .filter(h => h.timestamp >= thirtyDaysAgo)
      .reduce((sum, h) => sum + h.delta, 0);
  }, [globalStats]);

  const lastSessionDelta = useMemo(() => {
    const history = globalStats?.history ?? [];
    if (history.length === 0) return 0;
    const lastDate = history[history.length - 1].date?.slice(0, 10);
    return history
      .filter(h => h.date?.slice(0, 10) === lastDate)
      .reduce((sum, h) => sum + h.delta, 0);
  }, [globalStats]);

  const tournamentMerits = useMemo(() => {
    if (!user?.id) return [];
    const myResults = tournamentResults.filter(r => (r.profile_id || r.player_id) === user.id);
    const counts = myResults.reduce((acc, r) => {
      const type = r.tournament_type === 'americano' ? 'Americano' : 'Mexicano';
      acc[type] = (acc[type] || 0) + 1;
      if (r.rank === 1) {
        acc[`${type}-vinster`] = (acc[`${type}-vinster`] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts).map(([label, count]) => ({ label, count }));
  }, [tournamentResults, user]);

  const selectablePlayers = useMemo(
    () => profiles.filter(profile => profile.id !== user?.id),
    [profiles, user]
  );

  const [compareTarget, setCompareTarget] = useState<string>("none");
  const [isEloChartFullscreen, setIsEloChartFullscreen] = useState(false);
  const [selectedBadgeId, setSelectedBadgeId] = useState<string | null>(
    playerProfile?.featured_badge_id || null
  );

  const comparisonIds = useMemo(() => {
    if (!user?.id) return [];
    if (compareTarget === "all") {
      return [user.id, ...selectablePlayers.map(player => player.id)];
    }
    if (compareTarget && compareTarget !== "none") {
      return [user.id, compareTarget].filter(Boolean);
    }
    return [user.id];
  }, [compareTarget, selectablePlayers, user]);

  const comparisonData = useMemo(
    () => buildComparisonChartData(allEloPlayers, profiles, comparisonIds),
    [allEloPlayers, profiles, comparisonIds]
  );

  const comparisonNames = useMemo(() => {
    const profileNameMap = profiles.reduce((acc, profile) => {
      acc[profile.id] = getProfileDisplayName(profile);
      return acc;
    }, {} as Record<string, string>);
    return comparisonIds.map(id => profileNameMap[id] || "Okänd");
  }, [comparisonIds, profiles]);

  const comparisonDateLabels = useMemo(() => {
    const map = new Map<string, string>();
    let lastDate = "";
    comparisonData.forEach(row => {
      if (!row.date) return;
      const dateKey = row.date.split("T")[0];
      if (!dateKey) return;
      if (dateKey !== lastDate) {
        map.set(row.date, formatChartTimestamp(dateKey));
        lastDate = dateKey;
      } else {
        map.set(row.date, "");
      }
    });
    return map;
  }, [comparisonData]);

  useEffect(() => {
    // Lock the page scroll while the full-screen chart is open so it feels like a modal.
    document.body.classList.toggle("chart-fullscreen-active", isEloChartFullscreen);
    return () => {
      document.body.classList.remove("chart-fullscreen-active");
    };
  }, [isEloChartFullscreen]);

  useEffect(() => {
    if (!avatarStorageId || !user?.id) return;
    const stored = getStoredAvatar(avatarStorageId);
    const serverAvatar = playerProfile?.avatar_url || null;

    if (serverAvatar) {
      if (stored !== serverAvatar) {
        setStoredAvatar(avatarStorageId, serverAvatar);
      }
      setAvatarUrl(serverAvatar);
      return;
    }

    if (stored) {
      setAvatarUrl(stored);
      supabase
        .from("profiles")
        .update({ avatar_url: stored })
        .eq("id", user.id)
        .select()
        .single()
        .then(({ data }) => {
          if (data) onProfileUpdate?.(data);
        });
    }
  }, [avatarStorageId, playerProfile?.avatar_url, user?.id, onProfileUpdate]);

  useEffect(() => {
    setSelectedBadgeId(playerProfile?.featured_badge_id || null);
  }, [playerProfile?.featured_badge_id]);

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !avatarStorageId) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPendingAvatar(reader.result);
        setAvatarZoom(1);
      }
    };
    reader.readAsDataURL(file);
  };

  const saveAvatar = async () => {
    if (!pendingAvatar || !avatarStorageId) return;
    setSavingAvatar(true);
    try {
      const cropped = await cropAvatarImage(pendingAvatar, avatarZoom);
      setStoredAvatar(avatarStorageId, cropped);
      setAvatarUrl(cropped);
      setPendingAvatar(null);
      if (user?.id) {
        const { data, error } = await supabase
          .from("profiles")
          .update({ avatar_url: cropped })
          .eq("id", user.id)
          .select();
        if (error) {
          alert(error.message || "Kunde inte spara profilbilden.");
        } else if (data?.length) {
          onProfileUpdate?.(data[0]);
        }
      }
    } catch (error: any) {
      alert(error.message || "Kunde inte beskära bilden.");
    } finally {
      setSavingAvatar(false);
    }
  };

  const cancelAvatar = () => {
    setPendingAvatar(null);
    setAvatarZoom(1);
  };

  const resetAvatar = async () => {
    if (!avatarStorageId) return;
    removeStoredAvatar(avatarStorageId);
    setAvatarUrl(null);
    setPendingAvatar(null);
    if (user?.id) {
      const { data, error } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", user.id)
        .select();
      if (error) {
        alert(error.message || "Kunde inte återställa profilbilden.");
      } else if (data?.length) {
        onProfileUpdate?.(data[0]);
      }
    }
  };

  const chartPalette = ["#d32f2f", "#1976d2", "#388e3c", "#f57c00", "#7b1fa2", "#00796b"];

  if (mode === "chart") {
    return (
      <Card
        variant="outlined"
        sx={{
          borderRadius: 3,
          boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
          ...(isEloChartFullscreen && {
            position: 'fixed',
            inset: 0,
            zIndex: 1300,
            borderRadius: 0,
            m: 0,
            p: 2,
          })
        }}
      >
        <CardContent sx={{ height: isEloChartFullscreen ? '100%' : 'auto', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>ELO-utveckling (senaste året)</Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <TextField
                select
                size="small"
                label="Jämför med"
                value={compareTarget}
                onChange={(e) => setCompareTarget(e.target.value)}
                sx={{ minWidth: 160 }}
              >
                <MenuItem value="none">Ingen</MenuItem>
                <MenuItem value="all">Alla</MenuItem>
                {selectablePlayers.map(player => (
                  <MenuItem key={player.id} value={player.id}>
                    {getPlayerOptionLabel(player)}
                  </MenuItem>
                ))}
              </TextField>
              <IconButton onClick={() => setIsEloChartFullscreen(!isEloChartFullscreen)}>
                {isEloChartFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
              </IconButton>
            </Stack>
          </Box>

          <Box sx={{ height: isEloChartFullscreen ? '80vh' : 300, minHeight: 300, width: '100%', mt: 2 }}>
            {comparisonData.length ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <LineChart data={comparisonData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => comparisonDateLabels.get(value) ?? ""}
                  />
                  <YAxis domain={["dataMin - 20", "dataMax + 20"]} />
                  <Tooltip labelFormatter={(value) => formatChartTimestamp(value, true)} />
                  <Legend />
                  {comparisonNames.map((name, index) => (
                    <Line
                      key={name}
                      type="monotone"
                      dataKey={(row) => row[name]}
                      name={name}
                      stroke={chartPalette[index % chartPalette.length]}
                      strokeWidth={3}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Typography color="text.secondary" align="center" sx={{ py: 8 }}>
                Spela matcher senaste året för att se ELO-utvecklingen.
              </Typography>
            )}
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="outlined" sx={{ borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'center', mb: 4 }}>
          <Avatar
            sx={{ width: 100, height: 100, fontSize: '2.5rem' }}
            src={avatarUrl}
            name={playerName}
          />

          <Box sx={{ flex: 1, minWidth: 240 }}>
            {isEditingName ? (
              <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                <TextField
                  size="small"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                />
                <Button variant="contained" size="small" onClick={handleNameSave}>Spara</Button>
                <Button variant="outlined" size="small" onClick={() => setIsEditingName(false)}>Avbryt</Button>
              </Stack>
            ) : (
              <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
                <ProfileName name={playerName} badgeId={selectedBadgeId} />
              </Typography>
            )}

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button
                variant="outlined"
                component="label"
                size="small"
                startIcon={<PhotoIcon />}
              >
                Byt bild
                <input type="file" hidden accept="image/*" onChange={handleAvatarChange} />
              </Button>
              {!isEditingName && (
                <Button variant="outlined" size="small" startIcon={<EditIcon />} onClick={() => setIsEditingName(true)}>
                  Ändra namn
                </Button>
              )}
              <Button variant="text" size="small" color="error" startIcon={<DeleteIcon />} onClick={resetAvatar}>
                Återställ bild
              </Button>
            </Stack>
          </Box>
        </Box>

        {pendingAvatar && (
          <Box sx={{ p: 2, border: 1, borderColor: 'primary.light', borderRadius: 2, bgcolor: 'grey.50', mb: 4 }}>
            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 700 }}>Justera profilbild</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'center' }}>
              <Box
                sx={{
                  width: 100,
                  height: 100,
                  borderRadius: '50%',
                  border: 2,
                  borderColor: 'primary.main',
                  backgroundImage: `url(${pendingAvatar})`,
                  backgroundSize: `${avatarZoom * 100}%`,
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  bgcolor: '#fff'
                }}
              />
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <Typography variant="caption">Zoom</Typography>
                <Slider
                  value={avatarZoom}
                  min={1}
                  max={2.5}
                  step={0.1}
                  onChange={(_, val) => setAvatarZoom(val as number)}
                />
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  <Button variant="contained" size="small" onClick={saveAvatar} disabled={savingAvatar}>Använd</Button>
                  <Button variant="text" size="small" onClick={cancelAvatar}>Avbryt</Button>
                </Stack>
              </Box>
            </Box>
          </Box>
        )}

        <Grid container spacing={2}>
          {tournamentMerits.map(merit => (
            <Grid key={merit.label} size={{ xs: 6, sm: 4, md: 3 }}>
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderRadius: 2, bgcolor: 'grey.50' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>{merit.label}</Typography>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>{merit.count}</Typography>
              </Paper>
            </Grid>
          ))}
          {[
            { label: "Matcher", value: filteredStats ? filteredStats.wins + filteredStats.losses : 0 },
            { label: "Vinster", value: filteredStats ? filteredStats.wins : 0 },
            { label: "Förluster", value: filteredStats ? filteredStats.losses : 0 },
            { label: "Vinst %", value: `${filteredStats ? percent(filteredStats.wins, filteredStats.losses) : 0}%` },
            { label: "ELO", value: currentEloDisplay },
            { label: "ELO +/- (30d)", value: formatEloDelta(last30DaysDelta), color: getEloDeltaClass(last30DaysDelta) },
            { label: "ELO +/- (Pass)", value: formatEloDelta(lastSessionDelta), color: getEloDeltaClass(lastSessionDelta) },
            { label: "Form (L5)", value: `${recentFormStats.wins}V - ${recentFormStats.losses}F` },
          ].map(stat => (
            <Grid key={stat.label} size={{ xs: 6, sm: 4, md: 3 }}>
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>{stat.label}</Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: stat.color === 'stat-delta-positive' ? 'success.main' : stat.color === 'stat-delta-negative' ? 'error.main' : 'inherit' }}>
                  {stat.value}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {mode === "overview" && (
          <Box sx={{ mt: 6 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 3 }}>Synergi & Rivalitet (30d)</Typography>
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
                  {(() => {
                    const synergy = getPartnerSynergy(matches, playerName);
                    if (!synergy) return <Typography variant="h6">—</Typography>;
                    return (
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>{synergy.name}</Typography>
                        <Typography variant="caption">
                          {synergy.wins} vinster på {synergy.games} matcher ({Math.round((synergy.wins / synergy.games) * 100)}%)
                        </Typography>
                      </Box>
                    );
                  })()}
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
                  {(() => {
                    const rival = getToughestOpponent(matches, playerName);
                    if (!rival) return <Typography variant="h6">—</Typography>;
                    return (
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>{rival.name}</Typography>
                        <Typography variant="caption">
                          {rival.losses} förluster på {rival.games} matcher ({Math.round((rival.losses / rival.games) * 100)}%)
                        </Typography>
                      </Box>
                    );
                  })()}
                </Paper>
              </Grid>
            </Grid>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

interface HeadToHeadSectionProps {
  user: any;
  profiles?: Profile[];
  matches?: Match[];
  allEloPlayers?: PlayerStats[];
  tournamentResults?: TournamentResult[];
}

export function HeadToHeadSection({
  user,
  profiles = [],
  matches = [],
  allEloPlayers = [],
  tournamentResults = []
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
  const selectablePlayers = useMemo(
    () => profiles.filter(profile => profile.id !== user?.id),
    [profiles, user]
  );

  const [opponentId, setOpponentId] = useState<string>("");
  const resolvedOpponentId =
    selectablePlayers.find(player => player.id === opponentId)?.id ||
    selectablePlayers[0]?.id ||
    "";

  const headToHead = useMemo(
    () => buildHeadToHead(matches, user?.id, resolvedOpponentId, mode, nameToIdMap),
    [matches, user, resolvedOpponentId, mode, nameToIdMap]
  );

  const recentResults = useMemo(
    () =>
      buildHeadToHeadRecentResults(
        matches,
        user?.id,
        resolvedOpponentId,
        mode,
        5,
        nameToIdMap
      ),
    [matches, user, resolvedOpponentId, mode, nameToIdMap]
  );

  const tournamentH2H = useMemo(
    () => buildHeadToHeadTournaments(tournamentResults, user?.id, resolvedOpponentId),
    [tournamentResults, user?.id, resolvedOpponentId]
  );

  const mvpSummary = useMemo(
    () => buildMvpSummary(matches, profiles, allEloPlayers),
    [matches, profiles, allEloPlayers]
  );

  const opponentProfile = selectablePlayers.find(player => player.id === resolvedOpponentId);
  const opponentAvatarUrl = opponentProfile?.avatar_url || getStoredAvatar(opponentProfile?.id);
  const opponentName = opponentProfile ? getProfileDisplayName(opponentProfile) : "Motståndare";
  const opponentBadgeId = opponentProfile?.featured_badge_id || null;

  const currentPlayerStats = allEloPlayers.find(p => p.id === user?.id);
  const opponentPlayerStats = allEloPlayers.find(p => p.id === resolvedOpponentId);

  const currentPlayerElo = currentPlayerStats?.elo ?? ELO_BASELINE;
  const opponentElo = opponentPlayerStats?.elo ?? ELO_BASELINE;

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

  return (
    <Card variant="outlined" sx={{ borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
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
                    {getPlayerOptionLabel(player)}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: { xs: 2, sm: 4 }, flexWrap: 'wrap', mb: 6 }}>
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderRadius: 3, flex: 1, minWidth: 140, bgcolor: 'grey.50' }}>
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

              <Typography variant="h4" sx={{ fontWeight: 900, color: 'divider' }}>
                {mode === "against" ? "VS" : "&"}
              </Typography>

              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderRadius: 3, flex: 1, minWidth: 140, bgcolor: 'grey.50' }}>
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
            </Box>

            <Grid container spacing={2}>
              {[
                { label: "Matcher", value: headToHead.matches },
                { label: "Vinster", value: headToHead.wins },
                { label: "Förluster", value: headToHead.losses },
                { label: "Vinst %", value: `${percent(headToHead.wins, headToHead.losses)}%` },
                {
                  label: "Snitt setdiff",
                  value: `${headToHead.avgSetDiff > 0 ? '+' : ''}${headToHead.avgSetDiff.toFixed(1)}`,
                  color: headToHead.avgSetDiff > 0 ? 'success.main' : headToHead.avgSetDiff < 0 ? 'error.main' : 'inherit'
                },
              ].map(stat => (
                <Grid key={stat.label} size={{ xs: 6, sm: 4, md: 2.4 }}>
                  <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>{stat.label}</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: stat.color || 'inherit' }}>{stat.value}</Typography>
                  </Paper>
                </Grid>
              ))}

              <Grid size={{ xs: 12 }}>
                 <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', display: 'block', mb: 1 }}>Senaste 5</Typography>
                    {recentResults.length ? (
                      <Stack direction="row" spacing={1} justifyContent="center">
                        {recentResults.map((result, index) => (
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
