import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import Avatar from "./Avatar";
import { cropAvatarImage, getStoredAvatar } from "../utils/avatar";
import { GUEST_ID } from "../utils/guest";
import { getProfileDisplayName, makeNameToIdMap, resolveTeamIds } from "../utils/profileMap";

const ELO_BASELINE = 1000;

const percent = (wins, losses) => {
  const total = wins + losses;
  return total === 0 ? 0 : Math.round((wins / total) * 100);
};

const normalizeTeam = (team) =>
  Array.isArray(team) ? team.filter(id => id && id !== GUEST_ID) : [];

const ensurePlayer = (map, id) => {
  if (!map[id]) map[id] = { elo: ELO_BASELINE };
};

const buildEloHistoryMap = (matches, profiles, nameToIdMap) => {
  const eloMap = {};
  profiles.forEach(profile => {
    eloMap[profile.id] = { elo: ELO_BASELINE, history: [] };
  });

  const ensureHistoryPlayer = (id) => {
    if (!eloMap[id]) {
      eloMap[id] = { elo: ELO_BASELINE, history: [] };
    }
  };

  const sortedMatches = [...matches].sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at)
  );

  sortedMatches.forEach(match => {
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
    const expected1 = 1 / (1 + Math.pow(10, (e2 - e1) / 400));
    const team1Won = match.team1_sets > match.team2_sets;
    const historyDate = match.created_at?.slice(0, 10) || "";

    team1.forEach(id => {
      ensureHistoryPlayer(id);
      eloMap[id].elo += Math.round(20 * ((team1Won ? 1 : 0) - expected1));
      if (historyDate) {
        eloMap[id].history.push({
          date: historyDate,
          elo: Math.round(eloMap[id].elo)
        });
      }
    });

    team2.forEach(id => {
      ensureHistoryPlayer(id);
      eloMap[id].elo += Math.round(20 * ((team1Won ? 0 : 1) - (1 - expected1)));
      if (historyDate) {
        eloMap[id].history.push({
          date: historyDate,
          elo: Math.round(eloMap[id].elo)
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

  const dateSet = new Set();
  playerIds.forEach(id => {
    const history = historyMap[id]?.history || [];
    history.forEach(entry => {
      const entryDate = new Date(entry.date);
      if (entry.date && entryDate >= oneYearAgo) {
        dateSet.add(entry.date);
      }
    });
  });

  const dates = Array.from(dateSet).sort((a, b) => new Date(a) - new Date(b));
  if (!dates.length) return [];

  const historyPointers = playerIds.map(id => {
    const history = (historyMap[id]?.history || []).filter(entry => entry.date);
    return {
      id,
      name: profileNameMap[id] || "Okänd",
      history,
      index: 0,
      lastElo: ELO_BASELINE
    };
  });

  return dates.map(date => {
    const row = { date };
    const currentDate = new Date(date);
    historyPointers.forEach(pointer => {
      while (
        pointer.index < pointer.history.length &&
        new Date(pointer.history[pointer.index].date) <= currentDate
      ) {
        pointer.lastElo = pointer.history[pointer.index].elo;
        pointer.index += 1;
      }
      row[pointer.name] = pointer.lastElo;
    });
    return row;
  });
};

const buildPlayerSummary = (matches, profiles, playerId, nameToIdMap) => {
  if (!playerId) return null;

  const eloMap = {};
  profiles.forEach(profile => {
    eloMap[profile.id] = { elo: ELO_BASELINE };
  });

  const history = [];
  let wins = 0;
  let losses = 0;

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
    const expected1 = 1 / (1 + Math.pow(10, (e2 - e1) / 400));
    const team1Won = match.team1_sets > match.team2_sets;

    team1.forEach(id => {
      ensurePlayer(eloMap, id);
      eloMap[id].elo += Math.round(20 * ((team1Won ? 1 : 0) - expected1));
    });

    team2.forEach(id => {
      ensurePlayer(eloMap, id);
      eloMap[id].elo += Math.round(20 * ((team1Won ? 0 : 1) - (1 - expected1)));
    });

    if (isTeam1 || isTeam2) {
      const playerWon = (isTeam1 && team1Won) || (isTeam2 && !team1Won);
      playerWon ? wins++ : losses++;

      history.push({
        date: match.created_at?.slice(0, 10) || "",
        elo: Math.round(eloMap[playerId]?.elo ?? ELO_BASELINE)
      });
    }
  });

  return {
    wins,
    losses,
    history,
    currentElo: Math.round(eloMap[playerId]?.elo ?? ELO_BASELINE)
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

export default function PlayerSection({ user, profiles = [], matches = [] }) {
  const playerProfile = useMemo(
    () => profiles.find(profile => profile.id === user?.id),
    [profiles, user]
  );
  const nameToIdMap = useMemo(() => makeNameToIdMap(profiles), [profiles]);

  const playerName = playerProfile
    ? getProfileDisplayName(playerProfile)
    : user?.email || "Din profil";

  const avatarStorageKey = user?.id ? `padel-avatar:${user.id}` : null;
  const [avatarUrl, setAvatarUrl] = useState(() =>
    avatarStorageKey ? localStorage.getItem(avatarStorageKey) : null
  );
  const [pendingAvatar, setPendingAvatar] = useState(null);
  const [avatarZoom, setAvatarZoom] = useState(1);
  const [savingAvatar, setSavingAvatar] = useState(false);

  const summary = useMemo(
    () => buildPlayerSummary(matches, profiles, user?.id, nameToIdMap),
    [matches, profiles, user, nameToIdMap]
  );

  const eloHistoryMap = useMemo(
    () => buildEloHistoryMap(matches, profiles, nameToIdMap),
    [matches, profiles, nameToIdMap]
  );

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

  const [compareTarget, setCompareTarget] = useState("none");
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

  const opponentProfile = selectablePlayers.find(player => player.id === resolvedOpponentId);
  const opponentAvatarUrl = opponentProfile ? getStoredAvatar(opponentProfile.id) : null;
  const currentPlayerElo = eloHistoryMap[user?.id]?.currentElo ?? ELO_BASELINE;
  const opponentElo = eloHistoryMap[resolvedOpponentId]?.currentElo ?? ELO_BASELINE;

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file || !avatarStorageKey) return;

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
    if (!pendingAvatar || !avatarStorageKey) return;
    setSavingAvatar(true);
    try {
      const cropped = await cropAvatarImage(pendingAvatar, avatarZoom);
      localStorage.setItem(avatarStorageKey, cropped);
      setAvatarUrl(cropped);
      setPendingAvatar(null);
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

  const resetAvatar = () => {
    if (!avatarStorageKey) return;
    localStorage.removeItem(avatarStorageKey);
    setAvatarUrl(null);
    setPendingAvatar(null);
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
          <h3>{playerName}</h3>
          <p className="muted">
            Matchstatistik och head-to-head för din profil.
          </p>

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

      <div className="player-stats">
        <div className="stat-card">
          <span className="stat-label">Matcher</span>
          <span className="stat-value">{summary ? summary.wins + summary.losses : 0}</span>
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
          <span className="stat-label">Vinster</span>
          <span className="stat-value">{summary ? summary.wins : 0}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Förluster</span>
          <span className="stat-value">{summary ? summary.losses : 0}</span>
        </div>
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
                  {getProfileDisplayName(player)}
                </option>
              ))}
            </select>
          </label>
        </div>
        {comparisonData.length ? (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={comparisonData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={["dataMin - 20", "dataMax + 20"]} />
              <Tooltip />
              {comparisonNames.map((name, index) => (
                <Line
                  key={name}
                  type="monotone"
                  dataKey={name}
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

      <div className="head-to-head">
        <h3>Head-to-head</h3>

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
                      {getProfileDisplayName(player)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="head-to-head-summary">
            <div className="head-to-head-card">
                <Avatar
                  className="head-to-head-avatar"
                  src={avatarUrl}
                  name={playerName}
                  alt="Din profilbild"
                />
                <div>
                  <strong>{playerName}</strong>
                  <span className="muted">Du</span>
                  <span className="muted">ELO {currentPlayerElo}</span>
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
                    {getProfileDisplayName(opponentProfile)}
                  </strong>
                  <span className="muted">{mode === "against" ? "Motstånd" : "Partner"}</span>
                  <span className="muted">ELO {opponentElo}</span>
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
            </div>
          </>
        ) : (
          <p className="muted">Lägg till fler spelare för head-to-head statistik.</p>
        )}
      </div>
    </section>
  );
}
