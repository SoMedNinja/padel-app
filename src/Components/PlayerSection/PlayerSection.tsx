import { useMemo } from "react";
import {
  Card,
  CardContent,
} from "@mui/material";
import { Match, Profile, TournamentResult, PlayerStats } from "../../types";
import {
  ELO_BASELINE,
  calculateElo,
} from "../../utils/elo";
import {
  getProfileDisplayName,
  makeNameToIdMap,
} from "../../utils/profileMap";
import {
  getPartnerSynergy,
  getToughestOpponent
} from "../../utils/stats";
import { buildAllPlayersBadgeStats } from "../../utils/badges";
import {
  buildServeSplitStats
} from "../../utils/playerStats";
import {
  MVP_WINDOW_DAYS,
  MILLISECONDS_PER_DAY,
} from "../../utils/mvp";

import PlayerProfileHeader from "./PlayerProfileHeader";
import PlayerStatsGrid from "./PlayerStatsGrid";
import SynergyRivalry from "./SynergyRivalry";
import EloTrendChart from "./EloTrendChart";

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
    const thirtyDaysAgo = Date.now() - MVP_WINDOW_DAYS * MILLISECONDS_PER_DAY;

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

  if (mode === "chart") {
    return (
      <EloTrendChart
        user={user}
        allEloPlayers={allEloPlayers}
        profiles={profiles}
        selectablePlayers={selectablePlayers}
      />
    );
  }

  return (
    <Card variant="outlined" sx={{ borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <PlayerProfileHeader
          user={user}
          profile={playerProfile}
          profiles={profiles}
          currentPlayerBadgeStats={currentPlayerBadgeStats}
          allPlayerBadgeStats={badgeStatsMap}
          currentEloDisplay={currentEloDisplay}
          onProfileUpdate={onProfileUpdate}
        />

        <PlayerStatsGrid
          filteredStats={filteredStats}
          serveSplitStats={serveSplitStats}
          last30DaysDelta={last30DaysDelta}
          lastSessionDelta={lastSessionDelta}
          recentFormStats={recentFormStats}
          tournamentMerits={tournamentMerits}
        />

        {mode === "overview" && (
          <SynergyRivalry
            synergy={synergy}
            rival={rival}
            resolvePlayerName={resolvePlayerName}
          />
        )}
      </CardContent>
    </Card>
  );
}
