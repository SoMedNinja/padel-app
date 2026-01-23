import { useEffect, useMemo, useRef, useState } from "react";
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
  getExpectedScore,
  getKFactor,
  getMarginMultiplier,
  getPlayerWeight
} from "../utils/elo";
import { GUEST_ID } from "../utils/guest";
import { getProfileDisplayName, makeNameToIdMap, resolveTeamIds } from "../utils/profileMap";
import { getMvpStats } from "../utils/stats";
import { buildPlayerBadgeStats, buildPlayerBadges, getBadgeLabelById } from "../utils/badges";
import ProfileName from "./ProfileName";
import { supabase } from "../supabaseClient";

const percent = (wins, losses) => {
  const total = wins + losses;
  return total === 0 ? 0 : Math.round((wins / total) * 100);
};

const formatEloDelta = (delta) => {
  const numericDelta = Number(delta);
  if (!Number.isFinite(numericDelta) || numericDelta === 0) return "0";
  const roundedDelta = Math.round(numericDelta);
  return roundedDelta > 0 ? `+${roundedDelta}` : `${roundedDelta}`;
};

const getEloDeltaClass = (delta) => {
  const numericDelta = Number(delta);
  if (!Number.isFinite(numericDelta) || numericDelta === 0) return "";
  return numericDelta > 0 ? "stat-delta-positive" : "stat-delta-negative";
};

const formatMvpDays = (days) => {
  if (!days) return "0 dagar";
  if (days >= 365) return `${(days / 365).toFixed(1)} år`;
  return `${days} dagar`;
};

const formatChartTimestamp = (value, includeTime = false) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const options = includeTime
    ? { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }
    : { year: "numeric", month: "short", day: "numeric" };
  return new Intl.DateTimeFormat("sv-SE", options).format(date);
};

const getPlayerOptionLabel = (profile) => {
  if (!profile) return "Okänd";
  const badgeLabel = getBadgeLabelById(profile.featured_badge_id);
  const baseName = getProfileDisplayName(profile);
  return badgeLabel ? `${baseName} ${badgeLabel}` : baseName;
};

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

const normalizeTeam = (team) =>
  Array.isArray(team) ? team.filter(id => id && id !== GUEST_ID) : [];

const ensurePlayer = (map, id) => {
  if (!map[id]) map[id] = { elo: ELO_BASELINE, games: 0 };
};

const buildMvpSummary = (matches, profiles) => {
  const allowedNames = new Set(
    profiles
      .map(profile => getProfileDisplayName(profile))
      .filter(name => name && name !== "Gäst")
  );
  const dateMap = new Map();
  const matchEntries = matches
    .map(match => ({
      match,
      time: new Date(match.created_at).getTime(),
      dateKey: match.created_at?.slice(0, 10),
    }))
    .filter(entry => Number.isFinite(entry.time) && entry.dateKey);

  matchEntries.forEach(({ match, dateKey }) => {
    if (!dateMap.has(dateKey)) dateMap.set(dateKey, []);
    dateMap.get(dateKey).push(match);
  });

  const getMvpWinner = (matchGroup) => {
    const stats = getMvpStats(matchGroup, allowedNames);
    const scored = Object.entries(stats).map(([name, s]) => {
      const winPct = s.games ? s.wins / s.games : 0;
      return {
        name,
        wins: s.wins,
        games: s.games,
        winPct,
        score: s.wins * 3 + winPct * 5 + s.games
      };
    });

    if (!scored.length) return null;

    const [winner] = scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.games !== a.games) return b.games - a.games;
      return a.name.localeCompare(b.name);
    });

    return winner?.name || null;
  };

  const monthlyMvpDays = {};
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
      const winner = getMvpWinner(rollingMatches);
      if (!winner) continue;
      monthlyMvpDays[winner] = (monthlyMvpDays[winner] || 0) + 1;
    }
  }

  const eveningMvpCounts = {};
  dateMap.forEach((dayMatches) => {
    const winner = getMvpWinner(dayMatches);
    if (!winner) return;
    eveningMvpCounts[winner] = (eveningMvpCounts[winner] || 0) + 1;
  });

  return { monthlyMvpDays, eveningMvpCounts };
};

const buildEloHistoryMap = (matches, profiles, nameToIdMap) => {
  const eloMap = {};
  profiles.forEach(profile => {
    eloMap[profile.id] = { elo: ELO_BASELINE, history: [], games: 0 };
  });

  const ensureHistoryPlayer = (id) => {
    if (!eloMap[id]) {
      eloMap[id] = { elo: ELO_BASELINE, history: [], games: 0 };
    }
  };

  const sortedMatches = [...matches].sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at)
  );

  sortedMatches.forEach((match, matchIndex) => {
    const team1 = normalizeTeam(resolveTeamIds(match.team1_ids, match.team1, nameToIdMap));
    const team2 = normalizeTeam(resolveTeamIds(match.team2_ids, match.team2, nameToIdMap));

    if (!team1.length || !team2.length) return;
    if (match.team1_sets == null || match.team2_sets == null) return;

    team1.forEach(ensureHistoryPlayer);
    team2.forEach(ensureHistoryPlayer);

    const avg = team => {
      if (!team.length) return ELO_BASELINE;
      return (
        team.reduce((sum, id) => {
          ensureHistoryPlayer(id);
          return sum + eloMap[id].elo;
        }, 0) / team.length
      );
    };

    const e1 = avg(team1);
    const e2 = avg(team2);
    const expected1 = getExpectedScore(e1, e2);
    const team1Won = match.team1_sets > match.team2_sets;
    const marginMultiplier = getMarginMultiplier(match.team1_sets, match.team2_sets);
    const historyDate = match.created_at || "";

    team1.forEach(id => {
      ensureHistoryPlayer(id);
      const player = eloMap[id];
      const playerK = getKFactor(player.games);
      const weight = getPlayerWeight(player.elo, e1);
      const delta = Math.round(
        playerK * marginMultiplier * weight * ((team1Won ? 1 : 0) - expected1)
      );
      player.elo += delta;
      player.games += 1;
      if (historyDate) {
        eloMap[id].history.push({
          date: historyDate,
          elo: Math.round(player.elo),
          matchIndex
        });
      }
    });

    team2.forEach(id => {
      ensureHistoryPlayer(id);
      const player = eloMap[id];
      const playerK = getKFactor(player.games);
      const weight = getPlayerWeight(player.elo, e2);
      const delta = Math.round(
        playerK * marginMultiplier * weight * ((team1Won ? 0 : 1) - (1 - expected1))
      );
      player.elo += delta;
      player.games += 1;
      if (historyDate) {
        eloMap[id].history.push({
          date: historyDate,
          elo: Math.round(player.elo),
          matchIndex
        });
      }
    });
  });

  return Object.entries(eloMap).reduce((acc, [id, data]) => {
    acc[id] = {
      currentElo: Math.round(data.elo ?? ELO_BASELINE),
      history: data.history || []
    };
    return acc;
  }, {});
};

const buildComparisonChartData = (historyMap, profiles, playerIds) => {
  if (!playerIds.length) return [];
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const profileNameMap = profiles.reduce((acc, profile) => {
    acc[profile.id] = getProfileDisplayName(profile);
    return acc;
  }, {});

  const timelineEntries = new Map();
  playerIds.forEach(id => {
    const history = historyMap[id]?.history || [];
    history.forEach(entry => {
      if (!entry.date) return;
      const entryDate = new Date(entry.date);
      if (Number.isNaN(entryDate.getTime()) || entryDate < oneYearAgo) return;
      const matchIndex = entry.matchIndex ?? 0;
      const key = `${entry.date}::${matchIndex}`;
      if (!timelineEntries.has(key)) {
        timelineEntries.set(key, { date: entry.date, matchIndex });
      }
    });
  });

  const dates = Array.from(timelineEntries.values()).sort((a, b) => {
    const timeDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (timeDiff !== 0) return timeDiff;
    return a.matchIndex - b.matchIndex;
  });
  if (!dates.length) return [];

  const historyPointers = playerIds.map(id => {
    const history = (historyMap[id]?.history || [])
      .filter(entry => entry.date);
    return {
      id,
      name: profileNameMap[id] || "Okänd",
      history: history
        .sort((a, b) => {
          const timeDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
          if (timeDiff !== 0) return timeDiff;
          return (a.matchIndex ?? 0) - (b.matchIndex ?? 0);
        }),
      index: 0,
      lastElo: ELO_BASELINE
    };
  });

  const isEntryBeforeOrEqual = (entry, dateEntry) => {
    const entryTime = new Date(entry.date).getTime();
    const dateTime = new Date(dateEntry.date).getTime();
    if (entryTime < dateTime) return true;
    if (entryTime > dateTime) return false;
    return (entry.matchIndex ?? 0) <= dateEntry.matchIndex;
  };

  return dates.map(dateEntry => {
    const row = { date: dateEntry.date };
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

const getHighestEloRating = (historyEntry) => {
  if (!historyEntry) return ELO_BASELINE;
  const history = Array.isArray(historyEntry.history) ? historyEntry.history : [];
  const historyMax = history.reduce(
    (max, entry) => Math.max(max, entry?.elo ?? ELO_BASELINE),
    ELO_BASELINE
  );
  return Math.max(historyMax, historyEntry.currentElo ?? ELO_BASELINE);
};

const buildPlayerSummary = (matches, profiles, playerId, nameToIdMap) => {
  if (!playerId) return null;

  const eloMap = {};
  profiles.forEach(profile => {
    eloMap[profile.id] = { elo: ELO_BASELINE, games: 0 };
  });

  const history = [];
  const results = [];
  let wins = 0;
  let losses = 0;
  let lastMatchDelta = 0;
  let currentSessionDate = null;
  let sessionStartElo = null;
  let sessionEndElo = null;
  let lastSessionDelta = 0;

  const sortedMatches = [...matches].sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at)
  );

  sortedMatches.forEach(match => {
    const team1 = normalizeTeam(resolveTeamIds(match.team1_ids, match.team1, nameToIdMap));
    const team2 = normalizeTeam(resolveTeamIds(match.team2_ids, match.team2, nameToIdMap));

    if (!team1.length || !team2.length) return;
    if (match.team1_sets == null || match.team2_sets == null) return;

    const isTeam1 = team1.includes(playerId);
    const isTeam2 = team2.includes(playerId);

    if (!isTeam1 && !isTeam2) {
      team1.forEach(id => ensurePlayer(eloMap, id));
      team2.forEach(id => ensurePlayer(eloMap, id));
    }

    const avg = team => {
      if (!team.length) return ELO_BASELINE;
      return (
        team.reduce((sum, id) => {
          ensurePlayer(eloMap, id);
          return sum + eloMap[id].elo;
        }, 0) / team.length
      );
    };

    const e1 = avg(team1);
    const e2 = avg(team2);
    const expected1 = getExpectedScore(e1, e2);
    const team1Won = match.team1_sets > match.team2_sets;
    const marginMultiplier = getMarginMultiplier(match.team1_sets, match.team2_sets);
    const preMatchElo = (isTeam1 || isTeam2)
      ? Math.round(eloMap[playerId]?.elo ?? ELO_BASELINE)
      : null;

    team1.forEach(id => {
      ensurePlayer(eloMap, id);
      const player = eloMap[id];
      const playerK = getKFactor(player.games);
      const weight = getPlayerWeight(player.elo, e1);
      const delta = Math.round(
        playerK * marginMultiplier * weight * ((team1Won ? 1 : 0) - expected1)
      );
      player.elo += delta;
      player.games += 1;
    });

    team2.forEach(id => {
      ensurePlayer(eloMap, id);
      const player = eloMap[id];
      const playerK = getKFactor(player.games);
      const weight = getPlayerWeight(player.elo, e2);
      const delta = Math.round(
        playerK * marginMultiplier * weight * ((team1Won ? 0 : 1) - (1 - expected1))
      );
      player.elo += delta;
      player.games += 1;
    });

    if (isTeam1 || isTeam2) {
      const playerWon = (isTeam1 && team1Won) || (isTeam2 && !team1Won);
      playerWon ? wins++ : losses++;
      results.push(playerWon ? "V" : "F");
      const postMatchElo = Math.round(eloMap[playerId]?.elo ?? ELO_BASELINE);
      lastMatchDelta = postMatchElo - (preMatchElo ?? postMatchElo);
      if (match.created_at) {
        const matchDate = new Date(match.created_at);
        if (!Number.isNaN(matchDate.getTime())) {
          const dateKey = matchDate.toISOString().split("T")[0];
          if (currentSessionDate && dateKey !== currentSessionDate) {
            if (sessionStartElo != null && sessionEndElo != null) {
              lastSessionDelta = sessionEndElo - sessionStartElo;
            }
            currentSessionDate = dateKey;
            sessionStartElo = preMatchElo ?? sessionEndElo ?? ELO_BASELINE;
          } else if (!currentSessionDate) {
            currentSessionDate = dateKey;
            sessionStartElo = preMatchElo ?? ELO_BASELINE;
          } else if (sessionStartElo == null) {
            sessionStartElo = preMatchElo ?? ELO_BASELINE;
          }
          sessionEndElo = postMatchElo;
        }
      }

      history.push({
        date: match.created_at || "",
        elo: postMatchElo
      });
    }
  });

  return {
    wins,
    losses,
    history,
    results,
    currentElo: Math.round(eloMap[playerId]?.elo ?? ELO_BASELINE),
    lastMatchDelta,
    lastSessionDelta:
      sessionStartElo != null && sessionEndElo != null
        ? sessionEndElo - sessionStartElo
        : lastSessionDelta
  };
};

const buildHeadToHead = (matches, playerId, opponentId, mode, nameToIdMap) => {
  if (!playerId || !opponentId) {
    return { wins: 0, losses: 0, matches: 0 };
  }

  let wins = 0;
  let losses = 0;
  let total = 0;

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

    const team1Won = match.team1_sets > match.team2_sets;
    const playerWon = (isTeam1 && team1Won) || (isTeam2 && !team1Won);

    total++;
    playerWon ? wins++ : losses++;
  });

  return { wins, losses, matches: total };
};

const buildHeadToHeadRecentResults = (
  matches,
  playerId,
  opponentId,
  mode,
  limit = 5,
  nameToIdMap
) => {
  if (!playerId || !opponentId) return [];
  const sortedMatches = [...matches].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
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

export default function PlayerSection({
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

  const playerName = playerProfile
    ? getProfileDisplayName(playerProfile)
    : user?.email || "Din profil";

  const avatarStorageId = user?.id || null;
  const [avatarUrl, setAvatarUrl] = useState(() =>
    avatarStorageId ? getStoredAvatar(avatarStorageId) : null
  );
  const [pendingAvatar, setPendingAvatar] = useState(null);
  const [avatarZoom, setAvatarZoom] = useState(1);
  const [savingAvatar, setSavingAvatar] = useState(false);

  const summary = useMemo(
    () => buildPlayerSummary(matches, profiles, user?.id, nameToIdMap),
    [matches, profiles, user, nameToIdMap]
  );
  const recentForm = useMemo(() => {
    const results = summary?.results ?? [];
    return results.slice(-10);
  }, [summary]);
  const recentFormStats = useMemo(() => {
    const wins = recentForm.filter(result => result === "V").length;
    return { wins, losses: recentForm.length - wins };
  }, [recentForm]);
  const recentEloDelta = useMemo(() => {
    const history = summary?.history ?? [];
    if (history.length < 2) return 0;
    const slice = history.slice(-10);
    if (slice.length < 2) return 0;
    return (slice[slice.length - 1]?.elo ?? 0) - (slice[0]?.elo ?? 0);
  }, [summary]);

  const eloHistoryMap = useMemo(
    () => buildEloHistoryMap(matches, profiles, nameToIdMap),
    [matches, profiles, nameToIdMap]
  );

  const selectablePlayers = useMemo(
    () => profiles.filter(profile => profile.id !== user?.id),
    [profiles, user]
  );

  const [compareTarget, setCompareTarget] = useState("none");
  const [isBadgesExpanded, setIsBadgesExpanded] = useState(true);
  const [isEarnedExpanded, setIsEarnedExpanded] = useState(true);
  const [isLockedExpanded, setIsLockedExpanded] = useState(true);
  const [selectedBadgeId, setSelectedBadgeId] = useState(
    playerProfile?.featured_badge_id || null
  );
  const [savingBadgeId, setSavingBadgeId] = useState(null);
  const badgeUpdateRequestId = useRef(0);
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
    () => buildComparisonChartData(eloHistoryMap, profiles, comparisonIds),
    [eloHistoryMap, profiles, comparisonIds]
  );

  const comparisonNames = useMemo(() => {
    const profileNameMap = profiles.reduce((acc, profile) => {
      acc[profile.id] = getProfileDisplayName(profile);
      return acc;
    }, {});
    return comparisonIds.map(id => profileNameMap[id] || "Okänd");
  }, [comparisonIds, profiles]);

  const comparisonDateLabels = useMemo(() => {
    const map = new Map();
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
  }, [avatarStorageId, playerProfile?.avatar_url, user?.id]);

  useEffect(() => {
    setSelectedBadgeId(playerProfile?.featured_badge_id || null);
  }, [playerProfile?.featured_badge_id]);

  const handleBadgeSelection = async (badgeId) => {
    if (!user?.id) return;
    const nextBadgeId = badgeId === selectedBadgeId ? null : badgeId;
    const requestId = (badgeUpdateRequestId.current += 1);
    setSavingBadgeId(badgeId);
    setSelectedBadgeId(nextBadgeId);

    try {
      const { data, error } = await supabase
        .from("profiles")
        .update({ featured_badge_id: nextBadgeId })
        .eq("id", user.id)
        .select();

      if (requestId !== badgeUpdateRequestId.current) {
        return;
      }

      if (error) {
        alert(error.message || "Kunde inte uppdatera visad merit.");
        setSelectedBadgeId(playerProfile?.featured_badge_id || null);
      } else if (data?.length) {
        onProfileUpdate?.(data[0]);
      }
    } catch (error) {
      if (requestId !== badgeUpdateRequestId.current) {
        return;
      }
      alert(error?.message || "Kunde inte uppdatera visad merit.");
      setSelectedBadgeId(playerProfile?.featured_badge_id || null);
    } finally {
      if (requestId === badgeUpdateRequestId.current) {
        setSavingBadgeId(null);
      }
    }
  };

  const badgeStats = useMemo(
    () => buildPlayerBadgeStats(matches, profiles, user?.id, nameToIdMap, tournamentResults),
    [matches, profiles, user, nameToIdMap, tournamentResults]
  );
  const badgeSummary = useMemo(() => buildPlayerBadges(badgeStats), [badgeStats]);
  const earnedBadgeGroups = useMemo(
    () => groupBadgesByType(badgeSummary.earnedBadges),
    [badgeSummary.earnedBadges]
  );
  const lockedBadgeGroups = useMemo(
    () => groupBadgesByType(badgeSummary.lockedBadges),
    [badgeSummary.lockedBadges]
  );

  const handleAvatarChange = (event) => {
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
    } catch (error) {
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

  return (
    <section className="player-section">
      <h2>Spelare</h2>

      <div className="player-header">
        <div className="player-avatar-wrap">
          <Avatar
            className="player-avatar"
            src={avatarUrl}
            name={playerName}
            alt="Profilbild"
          />
          <button type="button" className="ghost-button" onClick={resetAvatar}>
            Återställ till standard
          </button>
        </div>

        <div className="player-details">
          <h3>
            <ProfileName name={playerName} badgeId={selectedBadgeId} />
          </h3>

          <label className="file-input">
            Byt profilbild
            <input type="file" accept="image/*" onChange={handleAvatarChange} />
          </label>
        </div>
      </div>

      {pendingAvatar && (
        <div className="avatar-cropper">
          <div
            className="avatar-crop-preview"
            style={{ backgroundImage: `url(${pendingAvatar})`, backgroundSize: `${avatarZoom * 100}%` }}
          />
          <div className="avatar-crop-controls">
            <label className="form-label">
              Zoom
              <input
                type="range"
                min="1"
                max="2.5"
                step="0.1"
                value={avatarZoom}
                onChange={(event) => setAvatarZoom(Number(event.target.value))}
              />
            </label>
            <div className="avatar-crop-actions">
              <button type="button" onClick={saveAvatar} disabled={savingAvatar}>
                {savingAvatar ? "Sparar..." : "Spara bild"}
              </button>
              <button type="button" className="ghost-button" onClick={cancelAvatar}>
                Avbryt
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="performance-card">
        <div className="performance-card-header">
          <div>
            <h3>Formkort</h3>
            <p className="muted">Senaste 10 matcher</p>
          </div>
          <div className={`performance-elo ${getEloDeltaClass(recentEloDelta)}`}>
            {formatEloDelta(recentEloDelta)} ELO
          </div>
        </div>
        <div className="performance-card-grid">
          <div className="stat-card">
            <span className="stat-label">Vinster</span>
            <span className="stat-value">{recentFormStats.wins}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Förluster</span>
            <span className="stat-value">{recentFormStats.losses}</span>
          </div>
          <div className="stat-card stat-card-wide">
            <span className="stat-label">Resultat</span>
            <span className="stat-value performance-results">
              {recentForm.length ? (
                [...recentForm].reverse().map((result, index) => (
                  <span
                    key={`${result}-${index}`}
                    className={`result-pill ${result === "V" ? "result-win" : "result-loss"}`}
                  >
                    {result}
                  </span>
                ))
              ) : (
                <span className="muted">Inga matcher ännu.</span>
              )}
            </span>
          </div>
        </div>
      </div>

      <div className="player-stats">
        <div className="stat-card">
          <span className="stat-label">Matcher</span>
          <span className="stat-value">{summary ? summary.wins + summary.losses : 0}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Vinster</span>
          <span className="stat-value">{summary ? summary.wins : 0}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Förluster</span>
          <span className="stat-value">{summary ? summary.losses : 0}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Vinst %</span>
          <span className="stat-value">{summary ? percent(summary.wins, summary.losses) : 0}%</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">ELO</span>
          <span className="stat-value">{summary ? summary.currentElo : ELO_BASELINE}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">ELO ändring (senaste match)</span>
          <span className={`stat-value ${getEloDeltaClass(summary?.lastMatchDelta)}`}>
            {summary ? formatEloDelta(summary.lastMatchDelta) : "0"}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">ELO ändring (senaste spelkväll)</span>
          <span className={`stat-value ${getEloDeltaClass(summary?.lastSessionDelta)}`}>
            {summary ? formatEloDelta(summary.lastSessionDelta) : "0"}
          </span>
        </div>
      </div>

      <div className="badges-section">
        <div className="badges-header">
          <div>
            <h3>Meriter</h3>
            <p className="muted">
              {badgeSummary.totalEarned} av {badgeSummary.totalBadges} meriter upplåsta
            </p>
          </div>
          <div className="badges-header-actions">
            <button
              type="button"
              className="badge-toggle"
              onClick={() => setIsBadgesExpanded(prev => !prev)}
            >
              <span>{isBadgesExpanded ? "Minimera" : "Visa meriter"}</span>
              <span aria-hidden="true">{isBadgesExpanded ? "▴" : "▾"}</span>
            </button>
          </div>
        </div>

        {isBadgesExpanded && (
          <>
            {badgeSummary.totalBadges === 0 ? (
              <p className="muted">Spela några matcher för att låsa upp badges.</p>
            ) : (
              <>
                <div className="badge-group">
                  <div className="badge-group-header">
                    <div className="badge-group-title">Upplåsta</div>
                    <button
                      type="button"
                      className="badge-toggle badge-group-toggle"
                      onClick={() => setIsEarnedExpanded(prev => !prev)}
                    >
                      <span>{isEarnedExpanded ? "Minimera" : "Visa"}</span>
                      <span aria-hidden="true">{isEarnedExpanded ? "▴" : "▾"}</span>
                    </button>
                  </div>
                  {isEarnedExpanded && (
                    <>
                      {earnedBadgeGroups.length ? (
                        earnedBadgeGroups.map(group => (
                          <div key={`earned-${group.label}`} className="badge-type-group">
                            <div className="badge-type-title">{group.label}</div>
                            <div className="badges-grid">
                              {group.items.map(badge => (
                                <div
                                  key={badge.id}
                                  className={`badge-card badge-earned ${
                                    selectedBadgeId === badge.id ? "badge-selected" : ""
                                  }`}
                                >
                                  <div className="badge-icon">
                                    <span>{badge.icon}</span>
                                    {badge.tier && <span className="badge-tier">{badge.tier}</span>}
                                  </div>
                                  <div className="badge-title">{badge.title}</div>
                                  <div className="badge-description">{badge.description}</div>
                                  {badge.meta && <div className="badge-meta">{badge.meta}</div>}
                                  <div className="badge-actions">
                                    <button
                                      type="button"
                                      className="badge-select"
                                      onClick={() => handleBadgeSelection(badge.id)}
                                      disabled={savingBadgeId === badge.id}
                                    >
                                      {selectedBadgeId === badge.id ? "Ta bort visning" : "Visa vid namn"}
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="badges-grid">
                          <div className="badge-card badge-empty">
                            <div className="badge-title">Inga upplåsta ännu</div>
                            <div className="badge-description">
                              Fortsätt spela för att låsa upp dina första badges.
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="badge-group">
                  <div className="badge-group-header">
                    <div className="badge-group-title">På väg</div>
                    <button
                      type="button"
                      className="badge-toggle badge-group-toggle"
                      onClick={() => setIsLockedExpanded(prev => !prev)}
                    >
                      <span>{isLockedExpanded ? "Minimera" : "Visa"}</span>
                      <span aria-hidden="true">{isLockedExpanded ? "▴" : "▾"}</span>
                    </button>
                  </div>
                  {isLockedExpanded && (
                    <>
                      {lockedBadgeGroups.map(group => (
                        <div key={`locked-${group.label}`} className="badge-type-group">
                          <div className="badge-type-title">{group.label}</div>
                          <div className="badges-grid">
                            {group.items.map(badge => {
                              const progress = badge.progress;
                              const progressPercent = progress
                                ? Math.round((progress.current / progress.target) * 100)
                                : 0;
                              return (
                                <div key={badge.id} className="badge-card">
                                  <div className="badge-icon">
                                    <span>{badge.icon}</span>
                                    {badge.tier && <span className="badge-tier">{badge.tier}</span>}
                                  </div>
                                  <div className="badge-title">{badge.title}</div>
                                  <div className="badge-description">{badge.description}</div>
                                  {badge.meta && <div className="badge-meta">{badge.meta}</div>}
                                  {progress && (
                                    <div className="badge-progress">
                                      <div className="badge-progress-bar">
                                        <div
                                          className="badge-progress-fill"
                                          style={{ width: `${progressPercent}%` }}
                                        />
                                      </div>
                                      <span className="badge-progress-text">
                                        {progress.current}/{progress.target}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>

      <div className="player-chart">
        <div className="player-chart-header">
          <h3>ELO-utveckling (senaste året)</h3>
          <label className="chart-compare">
            Jämför med
            <select value={compareTarget} onChange={(event) => setCompareTarget(event.target.value)}>
              <option value="none">Ingen</option>
              <option value="all">Alla</option>
              {selectablePlayers.map(player => (
                <option key={player.id} value={player.id}>
                  {getPlayerOptionLabel(player)}
                </option>
              ))}
            </select>
          </label>
        </div>
        {comparisonData.length ? (
          <ResponsiveContainer width="100%" height={240}>
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
          <p className="muted">Spela matcher senaste året för att se ELO-utvecklingen.</p>
        )}
      </div>

    </section>
  );
}

export function HeadToHeadSection({ user, profiles = [], matches = [] }) {
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
  const [mode, setMode] = useState("against");
  const selectablePlayers = useMemo(
    () => profiles.filter(profile => profile.id !== user?.id),
    [profiles, user]
  );

  const [opponentId, setOpponentId] = useState("");
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

  const eloHistoryMap = useMemo(
    () => buildEloHistoryMap(matches, profiles, nameToIdMap),
    [matches, profiles, nameToIdMap]
  );

  const mvpSummary = useMemo(
    () => buildMvpSummary(matches, profiles),
    [matches, profiles]
  );

  const opponentProfile = selectablePlayers.find(player => player.id === resolvedOpponentId);
  const opponentAvatarUrl = opponentProfile?.avatar_url || getStoredAvatar(opponentProfile?.id);
  const opponentName = opponentProfile ? getProfileDisplayName(opponentProfile) : "Motståndare";
  const opponentBadgeId = opponentProfile?.featured_badge_id || null;
  const currentPlayerElo = eloHistoryMap[user?.id]?.currentElo ?? ELO_BASELINE;
  const opponentElo = eloHistoryMap[resolvedOpponentId]?.currentElo ?? ELO_BASELINE;
  const playerHighestElo = useMemo(
    () => getHighestEloRating(eloHistoryMap[user?.id]),
    [eloHistoryMap, user?.id]
  );
  const opponentHighestElo = useMemo(
    () => getHighestEloRating(eloHistoryMap[resolvedOpponentId]),
    [eloHistoryMap, resolvedOpponentId]
  );
  const playerMvpDays = mvpSummary.monthlyMvpDays[playerName] || 0;
  const opponentMvpDays = mvpSummary.monthlyMvpDays[opponentName] || 0;
  const playerEveningMvps = mvpSummary.eveningMvpCounts[playerName] || 0;
  const opponentEveningMvps = mvpSummary.eveningMvpCounts[opponentName] || 0;

  return (
    <div className="head-to-head table-card">
      <h2>Head-to-head</h2>

      {selectablePlayers.length ? (
        <>
          <div className="head-to-head-controls">
            <label>
              Lägesval
              <select value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="against">Jag mot spelare</option>
                <option value="together">Jag med spelare</option>
              </select>
            </label>

            <label>
              Spelare
              <select value={resolvedOpponentId} onChange={(e) => setOpponentId(e.target.value)}>
                {selectablePlayers.map(player => (
                  <option key={player.id} value={player.id}>
                    {getPlayerOptionLabel(player)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="head-to-head-summary">
            <div className="head-to-head-card">
              <Avatar
                className="head-to-head-avatar"
                src={playerAvatarUrl}
                name={playerName}
                alt="Din profilbild"
              />
              <div>
                <strong>
                  <ProfileName name={playerName} badgeId={playerBadgeId} />
                </strong>
                <span className="muted">Du</span>
                <span className="muted">ELO {currentPlayerElo}</span>
                <span className="muted">Högsta ELO {playerHighestElo}</span>
              </div>
            </div>
            <div className="head-to-head-card">
              <Avatar
                className="head-to-head-avatar"
                src={opponentAvatarUrl}
                name={getProfileDisplayName(opponentProfile)}
                alt="Motståndare"
              />
              <div>
                <strong>
                  <ProfileName
                    name={getProfileDisplayName(opponentProfile)}
                    badgeId={opponentBadgeId}
                  />
                </strong>
                <span className="muted">{mode === "against" ? "Motstånd" : "Partner"}</span>
                <span className="muted">ELO {opponentElo}</span>
                <span className="muted">Högsta ELO {opponentHighestElo}</span>
              </div>
            </div>
          </div>

          <div className="player-stats">
            <div className="stat-card">
              <span className="stat-label">Matcher</span>
              <span className="stat-value">{headToHead.matches}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Vinster</span>
              <span className="stat-value">{headToHead.wins}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Förluster</span>
              <span className="stat-value">{headToHead.losses}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Vinst %</span>
              <span className="stat-value">{percent(headToHead.wins, headToHead.losses)}%</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Senaste 5</span>
              {recentResults.length ? (
                <span className="stat-value head-to-head-results">
                  {recentResults.map((result, index) => (
                    <span
                      key={`${result}-${index}`}
                      className={`result-pill ${result === "V" ? "result-win" : "result-loss"}`}
                    >
                      {result}
                    </span>
                  ))}
                </span>
              ) : (
                <span className="stat-value">-</span>
              )}
            </div>
            <div className="stat-card stat-card-compare">
              <span className="stat-label">MVP-månader</span>
              <div className="stat-compare">
                <div className="stat-compare-item">
                  <span className="stat-compare-name">Du</span>
                  <span className="stat-compare-value">{formatMvpDays(playerMvpDays)}</span>
                </div>
                <div className="stat-compare-item">
                  <span className="stat-compare-name">{opponentName}</span>
                  <span className="stat-compare-value">
                    {formatMvpDays(opponentMvpDays)}
                  </span>
                </div>
              </div>
            </div>
            <div className="stat-card stat-card-compare">
              <span className="stat-label">Kvällens MVP</span>
              <div className="stat-compare">
                <div className="stat-compare-item">
                  <span className="stat-compare-name">Du</span>
                  <span className="stat-compare-value">{playerEveningMvps}</span>
                </div>
                <div className="stat-compare-item">
                  <span className="stat-compare-name">{opponentName}</span>
                  <span className="stat-compare-value">{opponentEveningMvps}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <p className="muted">Lägg till fler spelare för head-to-head statistik.</p>
      )}
    </div>
  );
}
