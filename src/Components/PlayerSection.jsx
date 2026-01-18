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
import padelPlaceholder from "../assets/padel-placeholder.svg";

const ELO_BASELINE = 1000;

const percent = (wins, losses) => {
  const total = wins + losses;
  return total === 0 ? 0 : Math.round((wins / total) * 100);
};

const ensurePlayer = (map, id) => {
  if (!map[id]) map[id] = { elo: ELO_BASELINE };
};

const buildPlayerSummary = (matches, profiles, playerId) => {
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
    const team1 = match.team1_ids || [];
    const team2 = match.team2_ids || [];

    if (!team1.length || !team2.length) return;
    if (match.team1_sets == null || match.team2_sets == null) return;

    const isTeam1 = team1.includes(playerId);
    const isTeam2 = team2.includes(playerId);

    if (!isTeam1 && !isTeam2) {
      team1.forEach(id => ensurePlayer(eloMap, id));
      team2.forEach(id => ensurePlayer(eloMap, id));
    }

    const avg = team =>
      team.reduce((sum, id) => {
        ensurePlayer(eloMap, id);
        return sum + eloMap[id].elo;
      }, 0) / team.length;

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

const buildHeadToHead = (matches, playerId, opponentId, mode) => {
  if (!playerId || !opponentId) {
    return { wins: 0, losses: 0, matches: 0 };
  }

  let wins = 0;
  let losses = 0;
  let total = 0;

  matches.forEach(match => {
    const team1 = match.team1_ids || [];
    const team2 = match.team2_ids || [];

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

export default function PlayerSection({ user, profiles = [], matches = [] }) {
  const playerProfile = useMemo(
    () => profiles.find(profile => profile.id === user?.id),
    [profiles, user]
  );

  const playerName = playerProfile?.name || user?.email || "Din profil";

  const avatarStorageKey = user?.id ? `padel-avatar:${user.id}` : null;
  const [avatarUrl, setAvatarUrl] = useState(() =>
    avatarStorageKey ? localStorage.getItem(avatarStorageKey) : null
  );

  const summary = useMemo(
    () => buildPlayerSummary(matches, profiles, user?.id),
    [matches, profiles, user]
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
    () => buildHeadToHead(matches, user?.id, resolvedOpponentId, mode),
    [matches, user, resolvedOpponentId, mode]
  );

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file || !avatarStorageKey) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        localStorage.setItem(avatarStorageKey, reader.result);
        setAvatarUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const resetAvatar = () => {
    if (!avatarStorageKey) return;
    localStorage.removeItem(avatarStorageKey);
    setAvatarUrl(null);
  };

  const historyData = summary?.history || [];

  return (
    <section className="player-section">
      <h2>Spelare</h2>

      <div className="player-header">
        <div className="player-avatar-wrap">
          <img
            className="player-avatar"
            src={avatarUrl || padelPlaceholder}
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
        <h3>ELO-utveckling</h3>
        {historyData.length ? (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={historyData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={["dataMin - 20", "dataMax + 20"]} />
              <Tooltip />
              <Line type="monotone" dataKey="elo" stroke="#d32f2f" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="muted">Spela matcher för att se ELO-utvecklingen.</p>
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
                      {player.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="head-to-head-summary">
              <div className="head-to-head-card">
                <img
                  className="head-to-head-avatar"
                  src={avatarUrl || padelPlaceholder}
                  alt="Din profilbild"
                />
                <div>
                  <strong>{playerName}</strong>
                  <span className="muted">Du</span>
                </div>
              </div>
              <div className="head-to-head-card">
                <img
                  className="head-to-head-avatar"
                  src={padelPlaceholder}
                  alt="Motståndare"
                />
                <div>
                  <strong>
                    {selectablePlayers.find(player => player.id === resolvedOpponentId)?.name || "Spelare"}
                  </strong>
                  <span className="muted">{mode === "against" ? "Motstånd" : "Partner"}</span>
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
            </div>
          </>
        ) : (
          <p className="muted">Lägg till fler spelare för head-to-head statistik.</p>
        )}
      </div>
    </section>
  );
}
