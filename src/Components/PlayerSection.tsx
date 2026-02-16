import { ReactNode, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import Avatar from "./Avatar";
import Cropper, { Area } from "react-easy-crop";
import {
  getStoredAvatar,
  removeStoredAvatar,
  setStoredAvatar
} from "../utils/avatar";
import {
  ELO_BASELINE,
  calculateElo,
  getWinProbability,
} from "../utils/elo";
import { GUEST_ID } from "../utils/guest";
import {
  getProfileDisplayName,
  makeNameToIdMap,
  resolveTeamIds,
} from "../utils/profileMap";
import { stripBadgeLabelFromName } from "../utils/profileName";
import {
  getPartnerSynergy,
  getToughestOpponent
} from "../utils/stats";
import { buildAllPlayersBadgeStats } from "../utils/badges";
import {
  getMvpWinner,
  scorePlayersForMvp,
  EVENING_MIN_GAMES
} from "../utils/mvp";
import ProfileName from "./ProfileName";
import BadgeGallery from "./BadgeGallery";
import { Match, Profile, TournamentResult, PlayerStats } from "../types";
import { profileService } from "../services/profileService";
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
  InputAdornment,
  Paper,
  Tab,
  Tabs,
  CircularProgress,
  MenuItem,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Autorenew as ResetIcon,
  Close as CloseIcon,
  PhotoCamera as PhotoIcon,
  Delete as DeleteIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  EmojiEvents as TrophyIcon,
} from "@mui/icons-material";
import { alpha } from "@mui/material/styles";
// Note for non-coders: alpha is a helper that makes a color transparent so highlight
// backgrounds are soft instead of solid blocks.
import "./PlayerSection.css";
import { formatDate, formatScore } from "../utils/format";
import { getCroppedImg } from "../utils/image";

const percent = (wins: number, losses: number) => {
  const total = wins + losses;
  return total === 0 ? 0 : Math.round((wins / total) * 100);
};

const renderWinLossSplit = (wins: number, losses: number, includePercent = false) => {
  const total = wins + losses;
  if (!total) return "—";
  // Note for non-coders: we render wins/losses as separate colored spans so it's easy to scan at a glance.
  return (
    <Box component="span" sx={{ display: "inline-flex", alignItems: "baseline", gap: 0.75, flexWrap: "wrap" }}>
      <Typography component="span" variant="inherit" sx={{ color: "success.main", fontWeight: 800 }}>
        {wins}
      </Typography>
      <Typography component="span" variant="inherit" sx={{ color: "text.primary" }}>
        -
      </Typography>
      <Typography component="span" variant="inherit" sx={{ color: "error.main", fontWeight: 800 }}>
        {losses}
      </Typography>
      {includePercent && (
        <Typography component="span" variant="body2" sx={{ color: "text.secondary", fontWeight: 600 }}>
          ({percent(wins, losses)}%)
        </Typography>
      )}
    </Box>
  );
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


// Optimization: Pre-define options as constants to leverage identity-based cache hits in formatDate
const CHART_DATE_OPTIONS: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric" };
const CHART_DATETIME_OPTIONS: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" };

const formatChartTimestamp = (value: string | number, includeTime = false) => {
  if (!value) return "";
  const date = typeof value === "number" ? new Date(value) : value;
  const options = includeTime ? CHART_DATETIME_OPTIONS : CHART_DATE_OPTIONS;
  return formatDate(date, options);
};

const renderPlayerOptionLabel = (profile: Profile | null | undefined): ReactNode => {
  if (!profile) return "Okänd";
  const baseName = getProfileDisplayName(profile);
  // Note for non-coders: we pass the plain name and the badge separately so the UI can
  // show the badge as its own little tag instead of text glued onto the name.
  return <ProfileName name={baseName} badgeId={profile.featured_badge_id} />;
};

const normalizeTeam = (team: any): string[] =>
  Array.isArray(team) ? team.filter(id => id && id !== GUEST_ID) : [];

const buildMvpSummary = (
  matches: Match[],
  profiles: Profile[],
  allEloPlayers: PlayerStats[],
  eloDeltaByMatch?: Record<string, Record<string, number>>
) => {
  const dateMap = new Map<string, Match[]>();
  const matchEntries = matches
    .map(match => {
      // Optimization: skip expensive name resolution here. scorePlayersForMvp
      // already uses team1_ids and eloDeltaByMatch for its high-performance path.
      return {
        match,
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
    const playerMap = new Map(allEloPlayers.map(p => [p.id, p]));

    // Optimization: Pre-map match deltas to avoid re-searching player history in every window step
    const matchDeltaMap = new Map<string, Map<string, { delta: number, result: string }>>();
    allEloPlayers.forEach(p => {
      p.history.forEach(h => {
        if (!matchDeltaMap.has(h.matchId)) matchDeltaMap.set(h.matchId, new Map());
        matchDeltaMap.get(h.matchId)!.set(p.id, { delta: h.delta, result: h.result });
      });
    });

    const startDate = new Date(sortedEntries[0].dateKey);
    const latestMatchDate = new Date(sortedEntries[sortedEntries.length - 1].dateKey);
    const today = new Date();
    const endDate = latestMatchDate > today ? latestMatchDate : today;

    // Optimization: use a rolling window approach O(M + D*P) instead of O(D*P*M)
    const rollingStats = new Map<string, { wins: number; games: number; eloGain: number }>();
    allEloPlayers.forEach(p => rollingStats.set(p.id, { wins: 0, games: 0, eloGain: 0 }));

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

      // Add matches entering the 30-day window
      while (windowEndIndex < sortedEntries.length && sortedEntries[windowEndIndex].time <= dayEndTime) {
        const m = sortedEntries[windowEndIndex].match;
        matchDeltaMap.get(m.id)?.forEach(({ delta, result }, pid) => {
          const s = rollingStats.get(pid);
          if (s) {
            s.games++;
            s.eloGain += delta;
            if (result === "W") s.wins++;
          }
        });
        windowEndIndex += 1;
      }

      // Remove matches leaving the 30-day window
      while (windowStartIndex < windowEndIndex && sortedEntries[windowStartIndex].time <= cutoff) {
        const m = sortedEntries[windowStartIndex].match;
        matchDeltaMap.get(m.id)?.forEach(({ delta, result }, pid) => {
          const s = rollingStats.get(pid);
          if (s) {
            s.games--;
            s.eloGain -= delta;
            if (result === "W") s.wins--;
          }
        });
        windowStartIndex += 1;
      }

      // Find winner for this rolling window day
      let bestScore = -Infinity;
      let winnerName = "";
      let bestEloGain = -Infinity;
      let bestEloNet = -Infinity;
      let bestWins = -Infinity;

      rollingStats.forEach((s, pid) => {
        if (s.games === 0) return;

        const winRate = s.wins / s.games;
        const score = s.eloGain + winRate * 15 + s.games * 0.5;
        const player = playerMap.get(pid);
        if (!player) return;

        let isBetter = false;
        if (score > bestScore + 0.001) isBetter = true;
        else if (Math.abs(score - bestScore) <= 0.001) {
          if (s.eloGain > bestEloGain + 0.001) isBetter = true;
          else if (Math.abs(s.eloGain - bestEloGain) <= 0.001) {
            if (player.elo > bestEloNet) isBetter = true;
            else if (player.elo === bestEloNet) {
              if (s.wins > bestWins) isBetter = true;
              else if (s.wins === bestWins) {
                if (!winnerName || player.name.localeCompare(winnerName) < 0) isBetter = true;
              }
            }
          }
        }

        if (isBetter) {
          bestScore = score;
          winnerName = player.name;
          bestEloGain = s.eloGain;
          bestEloNet = player.elo;
          bestWins = s.wins;
        }
      });

      if (winnerName) {
        monthlyMvpDays[winnerName] = (monthlyMvpDays[winnerName] || 0) + 1;
      }
    }
  }

  const eveningMvpCounts: Record<string, number> = {};
  dateMap.forEach((dayMatches) => {
    // Optimization: passing eloDeltaByMatch here avoids O(P * H) scan for every day
    const results = scorePlayersForMvp(dayMatches, allEloPlayers, EVENING_MIN_GAMES, eloDeltaByMatch);
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

const buildServeSplitStats = (
  matches: Match[],
  playerId: string | undefined,
  nameToIdMap: Map<string, string>
) => {
  if (!playerId) {
    return {
      serveFirstWins: 0,
      serveFirstLosses: 0,
      serveSecondWins: 0,
      serveSecondLosses: 0,
    };
  }

  let serveFirstWins = 0;
  let serveFirstLosses = 0;
  let serveSecondWins = 0;
  let serveSecondLosses = 0;

  matches.forEach(match => {
    if (match.team1_sets == null || match.team2_sets == null) return;

    const team1 = normalizeTeam(resolveTeamIds(match.team1_ids, match.team1, nameToIdMap));
    const team2 = normalizeTeam(resolveTeamIds(match.team2_ids, match.team2, nameToIdMap));
    const isTeam1 = team1.includes(playerId);
    const isTeam2 = team2.includes(playerId);
    if (!isTeam1 && !isTeam2) return;

    // Note for non-coders: the app always starts matches with team A serving,
    // so we treat team 1 as the starter to keep these splits consistent.
    const team1ServesFirst = true;
    const playerServedFirst = (team1ServesFirst && isTeam1) || (!team1ServesFirst && isTeam2);

    const team1Won = match.team1_sets > match.team2_sets;
    const playerWon = (isTeam1 && team1Won) || (isTeam2 && !team1Won);

    if (playerServedFirst) {
      if (playerWon) {
        serveFirstWins += 1;
      } else {
        serveFirstLosses += 1;
      }
    } else {
      if (playerWon) {
        serveSecondWins += 1;
      } else {
        serveSecondLosses += 1;
      }
    }
  });

  return {
    serveFirstWins,
    serveFirstLosses,
    serveSecondWins,
    serveSecondLosses,
  };
};

const buildHeadToHeadStats = (
  matches: Match[],
  playerId: string | undefined,
  opponentId: string,
  mode: string,
  nameToIdMap: Map<string, string>,
  playerDeltaMap: Map<string, number>
) => {
  const result = {
    wins: 0,
    losses: 0,
    matches: 0,
    totalSetsFor: 0,
    totalSetsAgainst: 0,
    totalEloExchange: 0,
    lastMatch: null as { date: string; setsFor: number; setsAgainst: number; won: boolean } | null,
    serveFirstWins: 0,
    serveFirstLosses: 0,
    serveSecondWins: 0,
    serveSecondLosses: 0,
    recentResults: [] as string[]
  };

  if (!playerId || !opponentId) return result;

  // Optimization: use a for-loop for better performance in the match processing loop.
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    // Optimization: skip matches where the player did not participate using the pre-indexed delta map.
    if (!playerDeltaMap.has(match.id)) continue;

    // Optimization: identify teams directly from IDs if possible to avoid redundant string normalization.
    const isT1 = (match.team1_ids && match.team1_ids.length > 0)
      ? (match.team1_ids[0] === playerId || match.team1_ids[1] === playerId)
      : normalizeTeam(resolveTeamIds(match.team1_ids, match.team1, nameToIdMap)).includes(playerId);

    const isT2 = !isT1 && ((match.team2_ids && match.team2_ids.length > 0)
      ? (match.team2_ids[0] === playerId || match.team2_ids[1] === playerId)
      : normalizeTeam(resolveTeamIds(match.team2_ids, match.team2, nameToIdMap)).includes(playerId));

    if (!isT1 && !isT2) continue;

    const oppT1 = (match.team1_ids && match.team1_ids.length > 0)
      ? (match.team1_ids[0] === opponentId || match.team1_ids[1] === opponentId)
      : normalizeTeam(resolveTeamIds(match.team1_ids, match.team1, nameToIdMap)).includes(opponentId);

    const oppT2 = (match.team2_ids && match.team2_ids.length > 0)
      ? (match.team2_ids[0] === opponentId || match.team2_ids[1] === opponentId)
      : normalizeTeam(resolveTeamIds(match.team2_ids, match.team2, nameToIdMap)).includes(opponentId);

    if (!oppT1 && !oppT2) continue;

    const together = (isT1 && oppT1) || (isT2 && oppT2);
    const against = (isT1 && oppT2) || (isT2 && oppT1);

    if ((mode === "together" && !together) || (mode === "against" && !against)) continue;

    if (match.team1_sets == null || match.team2_sets == null) continue;

    const s1 = Number(match.team1_sets || 0);
    const s2 = Number(match.team2_sets || 0);
    const team1Won = s1 > s2;
    const playerWon = (isT1 && team1Won) || (isT2 && !team1Won);

    result.matches++;
    if (playerWon) result.wins++; else result.losses++;

    let setsFor = isT1 ? s1 : s2;
    let setsAgainst = isT1 ? s2 : s1;

    // Track ELO exchange
    result.totalEloExchange += playerDeltaMap.get(match.id) || 0;

    // Track last match (assuming matches are already sorted descending as they come from Dashboard)
    if (!result.lastMatch) {
      result.lastMatch = {
        date: match.created_at,
        setsFor,
        setsAgainst,
        won: playerWon
      };
    }

    // Recent results (last 5)
    if (result.recentResults.length < 5) {
      result.recentResults.push(playerWon ? "V" : "F");
    }

    // Normalize point-based matches (from tournaments) to a 1-set win/loss
    if (match.score_type === "points") {
      if (setsFor > setsAgainst) { setsFor = 1; setsAgainst = 0; }
      else if (setsAgainst > setsFor) { setsFor = 0; setsAgainst = 1; }
      else { setsFor = 0; setsAgainst = 0; }
    }
    result.totalSetsFor += setsFor;
    result.totalSetsAgainst += setsAgainst;

    // Serve stats
    const playerServedFirst = isT1; // Team 1 always serves first
    if (playerServedFirst) {
      if (playerWon) result.serveFirstWins++; else result.serveFirstLosses++;
    } else {
      if (playerWon) result.serveSecondWins++; else result.serveSecondLosses++;
    }
  }

  return result;
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

interface PlayerSectionProps {
  user: any;
  profiles?: Profile[];
  matches?: Match[];
  allEloPlayers?: PlayerStats[];
  tournamentResults?: TournamentResult[];
  onProfileUpdate?: (profile: Profile) => void;
  mode?: "overview" | "chart";
  eloDeltaByMatch?: Record<string, Record<string, number>>;
}

export default function PlayerSection({
  user,
  profiles = [],
  matches = [],
  allEloPlayers = [],
  tournamentResults = [],
  onProfileUpdate,
  mode = "overview",
  eloDeltaByMatch,
}: PlayerSectionProps) {
  const playerProfile = useMemo(
    () => profiles.find(profile => profile.id === user?.id),
    [profiles, user]
  );

  const playerName = playerProfile
    ? getProfileDisplayName(playerProfile)
    : user?.email || "Din profil";

  const nameToIdMap = useMemo(() => makeNameToIdMap(profiles), [profiles]);

  const [isEditingName, setIsEditingName] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [editedName, setEditedName] = useState(playerName);

  useEffect(() => {
    setEditedName(playerName);
  }, [playerName]);

  const handleBadgeSelect = async (badgeId: string | null) => {
    if (!user?.id) return;
    try {
      const data = await profileService.updateProfile(user.id, { featured_badge_id: badgeId });
      setSelectedBadgeId(badgeId);
      setBadgeGalleryOpen(false);
      onProfileUpdate?.(data);
      toast.success("Meriten har uppdaterats!");
    } catch (error: any) {
      toast.error(error.message || "Kunde inte uppdatera meriten.");
    }
  };

  const handleNameSave = async () => {
    if (!user?.id) return;
    const cleanedName = stripBadgeLabelFromName(editedName, playerProfile?.featured_badge_id);
    // Note for non-coders: this keeps badge tags out of the saved name since badges are stored separately.
    if (!cleanedName) {
      toast.error("Spelarnamn krävs.");
      return;
    }
    setIsSavingName(true);
    try {
      const data = await profileService.updateProfile(user.id, { name: cleanedName });
      setIsEditingName(false);
      onProfileUpdate?.(data);
      toast.success("Namnet har uppdaterats!");
    } catch (error: any) {
      toast.error(error.message || "Kunde inte uppdatera namnet.");
    } finally {
      setIsSavingName(false);
    }
  };

  const avatarStorageId = user?.id || null;
  const [avatarUrl, setAvatarUrl] = useState<string | null>(() =>
    avatarStorageId ? getStoredAvatar(avatarStorageId) : null
  );
  const [pendingAvatar, setPendingAvatar] = useState<string | null>(null);
  const [avatarZoom, setAvatarZoom] = useState<number>(1);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
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

  const badgeStatsMap = useMemo(() => {
    return buildAllPlayersBadgeStats(matches, profiles, nameToIdMap, tournamentResults);
  }, [matches, profiles, nameToIdMap, tournamentResults]);

  const currentPlayerBadgeStats = useMemo(
    () => badgeStatsMap[user?.id || ""],
    [badgeStatsMap, user?.id]
  );

  const serveSplitStats = useMemo(
    () => buildServeSplitStats(matches, user?.id, nameToIdMap),
    [matches, user?.id, nameToIdMap]
  );

  const currentEloDisplay = globalStats?.elo ?? ELO_BASELINE;

  const recentForm = useMemo(() => {
    const results = filteredStats?.recentResults ?? [];
    return results.slice(-5);
  }, [filteredStats]);

  const profileNameById = useMemo(() => {
    // Note for non-coders: we build a quick lookup so we can swap IDs for readable player names.
    return profiles.reduce((acc, profile) => {
      acc[profile.id] = getProfileDisplayName(profile);
      return acc;
    }, {} as Record<string, string>);
  }, [profiles]);

  const resolvePlayerName = (nameOrId?: string) => {
    // Note for non-coders: if we get a raw ID from stats, replace it with the human-friendly name.
    return nameOrId ? (profileNameById[nameOrId] ?? nameOrId) : "";
  };

  const recentFormStats = useMemo(() => {
    const wins = recentForm.filter(result => result === "W").length;
    return { wins, losses: recentForm.length - wins };
  }, [recentForm]);

  const last30DaysDelta = useMemo(() => {
    const history = globalStats?.history ?? [];
    const len = history.length;
    if (len === 0) return 0;
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    // Optimization: use a reverse loop and break early as history is chronological.
    // This reduces O(H) to O(H_recent) and avoids extra array allocation from .filter().
    let sum = 0;
    for (let i = len - 1; i >= 0; i--) {
      if (history[i].timestamp < thirtyDaysAgo) break;
      sum += history[i].delta;
    }
    return sum;
  }, [globalStats]);

  const lastSessionDelta = useMemo(() => {
    const history = globalStats?.history ?? [];
    const len = history.length;
    if (len === 0) return 0;
    const lastDate = history[len - 1].date?.slice(0, 10);

    // Optimization: use a reverse loop and break early once the date changes.
    let sum = 0;
    for (let i = len - 1; i >= 0; i--) {
      if (history[i].date?.slice(0, 10) !== lastDate) break;
      sum += history[i].delta;
    }
    return sum;
  }, [globalStats]);

  // Optimization: memoize synergy/rivalry stats to avoid expensive O(M) re-scans on every render.
  // Using eloDeltaByMatch and user.id avoids expensive O(M * P) string-based lookups.
  const synergy = useMemo(
    () => getPartnerSynergy(matches, playerName, user?.id, eloDeltaByMatch),
    [matches, playerName, user?.id, eloDeltaByMatch]
  );
  const rival = useMemo(
    () => getToughestOpponent(matches, playerName, user?.id, eloDeltaByMatch),
    [matches, playerName, user?.id, eloDeltaByMatch]
  );

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
  const [eloTrendStartDate, setEloTrendStartDate] = useState<string>("");
  const [eloTrendEndDate, setEloTrendEndDate] = useState<string>("");
  const [eloTrendRangeTouched, setEloTrendRangeTouched] = useState(false);
  const getTodayDateString = () => new Date().toISOString().slice(0, 10);
  const [selectedBadgeId, setSelectedBadgeId] = useState<string | null>(
    playerProfile?.featured_badge_id || null
  );
  const [badgeGalleryOpen, setBadgeGalleryOpen] = useState(false);

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

  const toInputDate = (isoDate: string | null) => {
    if (!isoDate) return "";
    return new Date(isoDate).toISOString().slice(0, 10);
  };

  const { minComparisonDate, maxComparisonDate } = useMemo(() => {
    if (!comparisonData.length) return { minComparisonDate: null, maxComparisonDate: null };
    return {
      minComparisonDate: comparisonData[0].date ?? null,
      maxComparisonDate: comparisonData[comparisonData.length - 1].date ?? null,
    };
  }, [comparisonData]);

  useEffect(() => {
    if (!minComparisonDate || !maxComparisonDate) {
      setEloTrendStartDate("");
      setEloTrendEndDate("");
      setEloTrendRangeTouched(false);
      return;
    }
    if (eloTrendRangeTouched) return;
    // Note for non-coders: we only auto-fill the range before the user makes their own choice.
    const minDateInput = toInputDate(minComparisonDate);
    const maxDateInput = toInputDate(maxComparisonDate);
    setEloTrendStartDate((prev) => prev || minDateInput);
    setEloTrendEndDate((prev) => prev || maxDateInput);
  }, [eloTrendRangeTouched, maxComparisonDate, minComparisonDate]);

  const filteredComparisonData = useMemo(() => {
    if (!eloTrendStartDate && !eloTrendEndDate) return comparisonData;

    const start = eloTrendStartDate ? new Date(`${eloTrendStartDate}T00:00:00`) : null;
    const end = eloTrendEndDate ? new Date(`${eloTrendEndDate}T23:59:59`) : null;

    return comparisonData.filter(row => {
      const rowDate = new Date(row.date);
      if (start && rowDate < start) return false;
      if (end && rowDate > end) return false;
      return true;
    });
  }, [comparisonData, eloTrendEndDate, eloTrendStartDate]);

  const comparisonYDomain = useMemo(() => {
    // Note for non-coders: we only use the dates to zoom the chart, not to recalculate any ELO numbers.
    if (!filteredComparisonData.length) return ["dataMin - 20", "dataMax + 20"] as const;

    let min = Infinity;
    let max = -Infinity;

    filteredComparisonData.forEach(row => {
      comparisonNames.forEach(name => {
        const value = row[name];
        if (typeof value === "number") {
          min = Math.min(min, value);
          max = Math.max(max, value);
        }
      });
    });

    if (!Number.isFinite(min) || !Number.isFinite(max)) return ["dataMin - 20", "dataMax + 20"] as const;

    const padding = Math.max(5, Math.round((max - min) * 0.05));
    return [min - padding, max + padding] as const;
  }, [comparisonNames, filteredComparisonData]);

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
      profileService.updateProfile(user.id, { avatar_url: stored })
        .then((data) => {
          if (data) onProfileUpdate?.(data);
        })
        .catch(err => console.error("Failed to sync avatar to DB", err));
    }
  }, [avatarStorageId, playerProfile?.avatar_url, user?.id, onProfileUpdate]);

  useEffect(() => {
    setSelectedBadgeId(playerProfile?.featured_badge_id || null);
  }, [playerProfile?.featured_badge_id]);

  const onCropComplete = (croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

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
    if (!pendingAvatar || !avatarStorageId || !croppedAreaPixels) return;
    setSavingAvatar(true);
    try {
      const cropped = await getCroppedImg(pendingAvatar, croppedAreaPixels);
      setStoredAvatar(avatarStorageId, cropped);
      setAvatarUrl(cropped);
      setPendingAvatar(null);
      if (user?.id) {
        try {
          const data = await profileService.updateProfile(user.id, { avatar_url: cropped });
          onProfileUpdate?.(data);
          toast.success("Profilbilden har sparats!");
        } catch (error: any) {
          toast.error(error.message || "Kunde inte spara profilbilden.");
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Kunde inte beskära bilden.");
    } finally {
      setSavingAvatar(false);
    }
  };

  const cancelAvatar = () => {
    setPendingAvatar(null);
    setAvatarZoom(1);
    setCrop({ x: 0, y: 0 });
  };

  const resetAvatar = async () => {
    if (!avatarStorageId) return;
    if (!window.confirm("Är du säker på att du vill återställa din profilbild?")) return;
    removeStoredAvatar(avatarStorageId);
    setAvatarUrl(null);
    setPendingAvatar(null);
    if (user?.id) {
      try {
        const data = await profileService.updateProfile(user.id, { avatar_url: null });
        onProfileUpdate?.(data);
        toast.success("Profilbilden har återställts.");
      } catch (error: any) {
        toast.error(error.message || "Kunde inte återställa profilbilden.");
      }
    }
  };

  const chartPalette = ["#d32f2f", "#1976d2", "#388e3c", "#f57c00", "#7b1fa2", "#00796b"];
  const [chartTooltipState, setChartTooltipState] = useState<{
    label: string;
    values: Array<{ name: string; value: number; color: string }>;
    panelSide: "left" | "right";
  } | null>(null);
  const [isChartTooltipLocked, setIsChartTooltipLocked] = useState(false);

  const updateChartTooltip = (state: any) => {
    if (!state?.isTooltipActive || !state?.activeLabel) return;

    const values = Array.isArray(state.activePayload)
      ? state.activePayload
          .map((entry: any) => ({
            name: String(entry.name ?? ""),
            value: Number(entry.value),
            color: String(entry.color ?? "#1976d2"),
          }))
          .filter((entry: { name: string; value: number }) => entry.name && Number.isFinite(entry.value))
      : [];

    if (!values.length) return;

    const chartWidth = Number(state.chartWidth) || 0;
    const chartX = Number(state.chartX) || 0;
    const panelSide: "left" | "right" = chartX < chartWidth * 0.5 ? "right" : "left";

    setChartTooltipState({
      label: String(state.activeLabel),
      values,
      panelSide,
    });
  };

  const unlockChartTooltip = () => {
    setIsChartTooltipLocked(false);
    setChartTooltipState(null);
  };

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
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems={{ xs: "stretch", sm: "flex-start" }}
            justifyContent="space-between"
            sx={{ mb: 2 }}
          >
            <Typography variant="h6" sx={{ fontWeight: 800 }}>ELO-utveckling (senaste året)</Typography>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              alignItems={{ xs: "stretch", sm: "center" }}
              flexWrap="wrap"
            >
              <TextField
                select
                size="small"
                label="Jämför med"
                value={compareTarget}
                onChange={(e) => setCompareTarget(e.target.value)}
                sx={{ minWidth: { sm: 160 }, width: { xs: "100%", sm: "auto" } }}
              >
                <MenuItem value="none">Ingen</MenuItem>
                <MenuItem value="all">Alla</MenuItem>
                {selectablePlayers.map(player => (
                  <MenuItem key={player.id} value={player.id}>
                    {renderPlayerOptionLabel(player)}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                id="elo-trend-start-date"
                label="Startdatum"
                aria-label="Välj startdatum för ELO-trend"
                type="date"
                size="small"
                value={eloTrendStartDate}
                onChange={(event) => {
                  setEloTrendRangeTouched(true);
                  setEloTrendStartDate(event.target.value);
                }}
                slotProps={{ inputLabel: { shrink: true } }}
                InputProps={{
                  endAdornment: eloTrendStartDate ? (
                    <InputAdornment position="end">
                      <MuiTooltip title="Återställ till tidigaste datum" arrow>
                        <IconButton
                          aria-label="Återställ startdatum"
                          size="small"
                          onClick={() => {
                            // Note for non-coders: this reset jumps to the first day we have ELO data for.
                            setEloTrendRangeTouched(true);
                            setEloTrendStartDate(minComparisonDate ? toInputDate(minComparisonDate) : "");
                          }}
                        >
                          <ResetIcon fontSize="small" />
                        </IconButton>
                      </MuiTooltip>
                    </InputAdornment>
                  ) : undefined
                }}
                sx={{ width: { xs: "100%", sm: "auto" }, minWidth: { sm: 160 } }}
              />
              <TextField
                id="elo-trend-end-date"
                label="Slutdatum"
                aria-label="Välj slutdatum för ELO-trend"
                type="date"
                size="small"
                value={eloTrendEndDate}
                onChange={(event) => {
                  setEloTrendRangeTouched(true);
                  setEloTrendEndDate(event.target.value);
                }}
                slotProps={{ inputLabel: { shrink: true } }}
                InputProps={{
                  endAdornment: eloTrendEndDate ? (
                    <InputAdornment position="end">
                      <MuiTooltip title="Återställ till idag" arrow>
                        <IconButton
                          aria-label="Återställ slutdatum"
                          size="small"
                          onClick={() => {
                            // Note for non-coders: end date resets to today so newer matches show up again.
                            setEloTrendRangeTouched(true);
                            setEloTrendEndDate(getTodayDateString());
                          }}
                        >
                          <ResetIcon fontSize="small" />
                        </IconButton>
                      </MuiTooltip>
                    </InputAdornment>
                  ) : undefined
                }}
                sx={{ width: { xs: "100%", sm: "auto" }, minWidth: { sm: 160 } }}
              />
              <MuiTooltip title={isEloChartFullscreen ? "Stäng helskärm" : "Visa i helskärm"} arrow>
                <IconButton
                  onClick={() => setIsEloChartFullscreen(!isEloChartFullscreen)}
                  aria-label={isEloChartFullscreen ? "Stäng helskärm" : "Visa i helskärm"}
                  sx={{ alignSelf: { xs: "flex-end", sm: "center" } }}
                >
                  {isEloChartFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
                </IconButton>
              </MuiTooltip>
            </Stack>
          </Stack>

          <Box sx={{ height: isEloChartFullscreen ? 'auto' : 300, flex: isEloChartFullscreen ? 1 : 'none', minHeight: 300, width: '100%', mt: 2, position: 'relative' }}>
            {comparisonData.length ? (
              <ResponsiveContainer
                key={isEloChartFullscreen ? 'fs' : 'normal'}
                width="100%"
                height="100%"
                minWidth={0}
                minHeight={0}
                debounce={50}
              >
                <LineChart
                  data={filteredComparisonData}
                  margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                  onMouseMove={(state) => {
                    updateChartTooltip(state);
                  }}
                  onMouseLeave={() => {
                    if (!isChartTooltipLocked) {
                      setChartTooltipState(null);
                    }
                  }}
                  onMouseUp={() => {
                    if (chartTooltipState) {
                      // Note for non-coders: releasing the finger keeps the details visible, which helps on iOS when users scroll after inspecting a point.
                      setIsChartTooltipLocked(true);
                    }
                  }}
                  onTouchEnd={() => {
                    if (chartTooltipState) {
                      setIsChartTooltipLocked(true);
                    }
                  }}
                  onClick={() => {
                    if (isChartTooltipLocked) {
                      unlockChartTooltip();
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => comparisonDateLabels.get(value) ?? ""}
                  />
                  <YAxis domain={comparisonYDomain} />
                  <Tooltip content={() => null} cursor={{ stroke: '#d32f2f', strokeDasharray: '4 4' }} />
                  {chartTooltipState?.label ? <Legend verticalAlign="top" align={chartTooltipState.panelSide} /> : <Legend />}
                  {chartTooltipState?.label ? (
                    <ReferenceLine
                      x={chartTooltipState.label}
                      stroke="#d32f2f"
                      strokeDasharray="4 4"
                      ifOverflow="extendDomain"
                    />
                  ) : null}
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

            {chartTooltipState ? (
              <Paper
                elevation={4}
                sx={{
                  position: 'absolute',
                  top: 8,
                  left: chartTooltipState.panelSide === "left" ? 8 : "auto",
                  right: chartTooltipState.panelSide === "right" ? 8 : "auto",
                  maxWidth: 240,
                  p: 1.25,
                  borderRadius: 2,
                  pointerEvents: 'none',
                  bgcolor: 'rgba(255,255,255,0.96)',
                }}
              >
                {/* Note for non-coders: this small panel is the "floating legend" that automatically jumps to the opposite side so it doesn't cover your finger/cursor. */}
                <Typography variant="caption" sx={{ fontWeight: 800, color: 'error.main', display: 'block', mb: 0.5 }}>
                  {formatChartTimestamp(chartTooltipState.label, true)}
                </Typography>
                {chartTooltipState.values.map((entry) => (
                  <Typography key={entry.name} variant="caption" sx={{ display: 'block', color: entry.color, fontWeight: 700 }}>
                    {entry.name}: {Math.round(entry.value)}
                  </Typography>
                ))}
                {isChartTooltipLocked ? (
                  <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary' }}>
                    Tryck på grafen igen för att rensa.
                  </Typography>
                ) : null}
              </Paper>
            ) : null}
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
              <Stack direction="row" spacing={1} sx={{ mb: 2, alignItems: "flex-start" }}>
                <TextField
                  size="small"
                  label="Spelarnamn"
                  value={editedName}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.length === 50 && editedName.length < 50) {
                      navigator.vibrate?.(20);
                    }
                    setEditedName(val);
                  }}
                  helperText={`${editedName.length}/50`}
                  FormHelperTextProps={{
                    sx: {
                      color: editedName.length >= 50 ? 'error.main' : 'inherit',
                      fontWeight: editedName.length >= 50 ? 700 : 'inherit',
                    }
                  }}
                  slotProps={{
                    htmlInput: {
                      maxLength: 50,
                      "aria-label": `Ändra ditt namn, ${editedName.length} av 50 tecken`,
                    }
                  }}
                  disabled={isSavingName}
                />
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleNameSave}
                  disabled={isSavingName}
                  startIcon={isSavingName ? <CircularProgress size={16} color="inherit" /> : null}
                  sx={{ mt: 0.5 }}
                >
                  {isSavingName ? "Sparar..." : "Spara"}
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setIsEditingName(false)}
                  disabled={isSavingName}
                  sx={{ mt: 0.5 }}
                >
                  Avbryt
                </Button>
              </Stack>
            ) : (
              <Box sx={{ mb: 2 }}>
                <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>
                  <ProfileName name={playerName} badgeId={selectedBadgeId} />
                </Typography>
                <Typography variant="h6" color="primary" sx={{ fontWeight: 700 }}>
                  ELO {currentEloDisplay}
                </Typography>
              </Box>
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
                <>
                  <Button variant="outlined" size="small" startIcon={<EditIcon />} onClick={() => setIsEditingName(true)}>
                    Ändra namn
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<TrophyIcon />}
                    onClick={() => setBadgeGalleryOpen(true)}
                  >
                    Välj merit
                  </Button>
                </>
              )}
              <Button variant="text" size="small" color="error" startIcon={<DeleteIcon />} onClick={resetAvatar}>
                Återställ bild
              </Button>
            </Stack>
          </Box>
        </Box>

        <Dialog open={Boolean(pendingAvatar)} onClose={cancelAvatar} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 800 }}>Justera profilbild</DialogTitle>
          <DialogContent>
            <Box sx={{ position: 'relative', width: '100%', height: 300, bgcolor: '#333', borderRadius: 2, overflow: 'hidden', mb: 2 }}>
              {pendingAvatar && (
                <Cropper
                  image={pendingAvatar}
                  crop={crop}
                  zoom={avatarZoom}
                  aspect={1}
                  onCropChange={setCrop}
                  onZoomChange={setAvatarZoom}
                  onCropComplete={onCropComplete}
                  cropShape="round"
                  showGrid={false}
                />
              )}
            </Box>
            <Typography variant="caption" color="text.secondary">Zoom</Typography>
            <Slider
              value={avatarZoom}
              min={1}
              max={3}
              step={0.1}
              onChange={(_, val) => setAvatarZoom(val as number)}
            />
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={cancelAvatar} color="inherit">Avbryt</Button>
            <Button
              variant="contained"
              onClick={saveAvatar}
              disabled={savingAvatar}
              startIcon={savingAvatar ? <CircularProgress size={16} color="inherit" /> : null}
            >
              Använd bild
            </Button>
          </DialogActions>
        </Dialog>

        <BadgeGallery
          open={badgeGalleryOpen}
          onClose={() => setBadgeGalleryOpen(false)}
          onSelect={handleBadgeSelect}
          currentBadgeId={selectedBadgeId}
          stats={currentPlayerBadgeStats}
          allPlayerStats={badgeStatsMap}
          playerId={user?.id || ""}
        />

        <Grid container spacing={2}>
          {tournamentMerits.map(merit => (
            <Grid key={merit.label} size={{ xs: 6, sm: 4, md: 3 }}>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  textAlign: 'center',
                  borderRadius: 2,
                  bgcolor: 'grey.50',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>{merit.label}</Typography>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>{merit.count}</Typography>
              </Paper>
            </Grid>
          ))}
          {/* Note for non-coders: the card styles below keep each stats box the same height for neat rows. */}
          {[
            { label: "Matcher", value: filteredStats ? filteredStats.wins + filteredStats.losses : 0 },
            {
              label: "Vinst/förlust",
              value: renderWinLossSplit(filteredStats?.wins ?? 0, filteredStats?.losses ?? 0),
            },
            { label: "Vinst %", value: `${filteredStats ? percent(filteredStats.wins, filteredStats.losses) : 0}%` },
            {
              label: "Vinst/förlust med start-serve",
              value: renderWinLossSplit(serveSplitStats.serveFirstWins, serveSplitStats.serveFirstLosses, true),
            },
            {
              label: "Vinst/förlust utan start-serve",
              value: renderWinLossSplit(serveSplitStats.serveSecondWins, serveSplitStats.serveSecondLosses, true),
            },
            { label: "ELO +/- (30d)", value: formatEloDelta(last30DaysDelta), color: getEloDeltaClass(last30DaysDelta) },
            { label: "ELO +/- (Kväll)", value: formatEloDelta(lastSessionDelta), color: getEloDeltaClass(lastSessionDelta) },
            { label: "Form (L5)", value: `${recentFormStats.wins}V - ${recentFormStats.losses}F` },
          ].map(stat => (
            <Grid key={stat.label} size={{ xs: 6, sm: 4, md: 3 }}>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  textAlign: 'center',
                  borderRadius: 2,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                }}
              >
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
  eloDeltaByMatch?: Record<string, Record<string, number>>;
}

export function HeadToHeadSection({
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
  const selectablePlayers = useMemo(
    () => profiles.filter(profile => profile.id !== user?.id),
    [profiles, user]
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
