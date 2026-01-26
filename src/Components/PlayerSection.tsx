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
  getExpectedScore,
  getKFactor,
  getMatchWeight,
  getMarginMultiplier,
  getPlayerWeight
} from "../utils/elo";
import { GUEST_ID } from "../utils/guest";
import {
  getProfileDisplayName,
  makeNameToIdMap,
  makeProfileMap,
  resolveTeamIds,
  resolveTeamNames
} from "../utils/profileMap";
import { getMvpStats } from "../utils/stats";
import { getBadgeLabelById } from "../utils/badges";
import ProfileName from "./ProfileName";
import { supabase } from "../supabaseClient";
import { Match, Profile, TournamentResult } from "../types";

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

const ensurePlayer = (map: any, id: string) => {
  if (!map[id]) map[id] = { elo: ELO_BASELINE, games: 0 };
};

const buildMvpSummary = (matches: Match[], profiles: Profile[]) => {
  const allowedNames = new Set(
    profiles
      .map(profile => getProfileDisplayName(profile))
      .filter(name => name && name !== "Gäst")
  );
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

  const getMvpWinner = (matchGroup: Match[]) => {
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
      const winner = getMvpWinner(rollingMatches);
      if (!winner) continue;
      monthlyMvpDays[winner] = (monthlyMvpDays[winner] || 0) + 1;
    }
  }

  const eveningMvpCounts: Record<string, number> = {};
  dateMap.forEach((dayMatches) => {
    const winner = getMvpWinner(dayMatches);
    if (!winner) return;
    eveningMvpCounts[winner] = (eveningMvpCounts[winner] || 0) + 1;
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

const buildHeadToHeadTournaments = (tournamentResults: TournamentResult[], playerId: string | undefined, opponentId: string, mode: string) => {
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
}

export default function PlayerSection({
  user,
  profiles = [],
  matches = [],
  allEloPlayers = [],
  tournamentResults = [],
  onProfileUpdate,
}: PlayerSectionProps) {
  const playerProfile = useMemo(
    () => profiles.find(profile => profile.id === user?.id),
    [profiles, user]
  );
  const nameToIdMap = useMemo(() => makeNameToIdMap(profiles), [profiles]);

  const playerName = playerProfile
    ? getProfileDisplayName(playerProfile)
    : user?.email || "Din profil";

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
    return results.slice(-10);
  }, [filteredStats]);

  const recentFormStats = useMemo(() => {
    const wins = recentForm.filter(result => result === "W").length;
    return { wins, losses: recentForm.length - wins };
  }, [recentForm]);

  const recentEloDelta = useMemo(() => {
    const history = filteredStats?.history ?? [];
    if (history.length < 1) return 0;
    // For filtered view, we want the total change over these matches
    return history.reduce((sum, entry) => sum + entry.delta, 0);
  }, [filteredStats]);

  const lastMatchDelta = useMemo(() => {
    const history = globalStats?.history ?? [];
    return history.length > 0 ? history[history.length - 1].delta : 0;
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
  }, [avatarStorageId, playerProfile?.avatar_url, user?.id]);

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
        {tournamentMerits.map(merit => (
          <div key={merit.label} className="stat-card">
            <span className="stat-label">{merit.label}</span>
            <span className="stat-value">{merit.count}</span>
          </div>
        ))}
        <div className="stat-card">
          <span className="stat-label">Matcher</span>
          <span className="stat-value">{filteredStats ? filteredStats.wins + filteredStats.losses : 0}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Vinster</span>
          <span className="stat-value">{filteredStats ? filteredStats.wins : 0}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Förluster</span>
          <span className="stat-value">{filteredStats ? filteredStats.losses : 0}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Vinst %</span>
          <span className="stat-value">{filteredStats ? percent(filteredStats.wins, filteredStats.losses) : 0}%</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">ELO</span>
          <span className="stat-value">{currentEloDisplay}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">ELO ändring (senaste match)</span>
          <span className={`stat-value ${getEloDeltaClass(lastMatchDelta)}`}>
            {formatEloDelta(lastMatchDelta)}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">ELO ändring (senaste spelkväll)</span>
          <span className={`stat-value ${getEloDeltaClass(lastSessionDelta)}`}>
            {formatEloDelta(lastSessionDelta)}
          </span>
        </div>
      </div>

      <div className={`player-chart${isEloChartFullscreen ? " is-fullscreen" : ""}`}>
        <div className="player-chart-header">
          <h3>ELO-utveckling (senaste året)</h3>
          <div className="player-chart-controls">
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
            <button
              type="button"
              className="ghost-button chart-expand-button"
              onClick={() => setIsEloChartFullscreen((prev) => !prev)}
            >
              <span aria-hidden="true">{isEloChartFullscreen ? "🗗" : "⛶"}</span>
              {isEloChartFullscreen ? "Minimera" : "Maximera"}
            </button>
          </div>
        </div>
        {comparisonData.length ? (
          <div className="player-chart-body">
            <ResponsiveContainer width="100%" height="100%">
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
          </div>
        ) : (
          <p className="muted">Spela matcher senaste året för att se ELO-utvecklingen.</p>
        )}
      </div>

    </section>
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
    () => buildHeadToHeadTournaments(tournamentResults, user?.id, resolvedOpponentId, mode),
    [tournamentResults, user?.id, resolvedOpponentId, mode]
  );

  const mvpSummary = useMemo(
    () => buildMvpSummary(matches, profiles),
    [matches, profiles]
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
                        className={`result-pill ${result === "W" ? "result-win" : "result-loss"}`}
                    >
                        {result === "W" ? "V" : "F"}
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
              <span className="stat-label">Turneringar</span>
              <div className="stat-compare">
                <div className="stat-compare-item">
                  <span className="stat-compare-name">Gemensamma</span>
                  <span className="stat-compare-value">{tournamentH2H.matches}</span>
                </div>
                <div className="stat-compare-item">
                  <span className="stat-compare-name">Dina vinster</span>
                  <span className="stat-compare-value">{tournamentH2H.wins}</span>
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
