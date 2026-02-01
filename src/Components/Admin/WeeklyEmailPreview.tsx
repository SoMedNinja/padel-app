import React, { useMemo, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Grid,
  Switch,
  FormControlLabel,
  CircularProgress,
} from "@mui/material";
import { useEloStats } from "../../hooks/useEloStats";
import { calculateEloWithStats, ELO_BASELINE, getExpectedScore } from "../../utils/elo";
import { calculateMvpScore, getMvpWinner } from "../../utils/mvp";
import { getISOWeek, getISOWeekRange } from "../../utils/format";
import { Match, Profile } from "../../types";
import { GUEST_ID } from "../../utils/guest";
import { supabase, supabaseAnonKey, supabaseUrl } from "../../supabaseClient";
import { getBadgeLabelById } from "../../utils/badges";

interface WeeklyEmailPreviewProps {
  currentUserId?: string;
}

const MOCK_PROFILES: Profile[] = [
  // Note for non-coders: these mock avatar links let the preview show how "player icons" look in the email.
  { id: "1", name: "Kalle Kula", avatar_url: "https://api.dicebear.com/8.x/thumbs/svg?seed=Kalle", is_approved: true, is_admin: false, is_deleted: false, featured_badge_id: "king-of-elo" },
  { id: "2", name: "Padel-Pelle", avatar_url: "https://api.dicebear.com/8.x/thumbs/svg?seed=Pelle", is_approved: true, is_admin: false, is_deleted: false },
  { id: "3", name: "Smasher-Sven", avatar_url: "https://api.dicebear.com/8.x/thumbs/svg?seed=Sven", is_approved: true, is_admin: false, is_deleted: false, featured_badge_id: "wins-10" },
  { id: "4", name: "Boll-Berit", avatar_url: "https://api.dicebear.com/8.x/thumbs/svg?seed=Berit", is_approved: true, is_admin: false, is_deleted: false },
];

const MOCK_MATCHES: Match[] = [
  {
    id: "m1",
    team1_ids: ["1", "2"],
    team2_ids: ["3", "4"],
    team1_sets: 6,
    team2_sets: 4,
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    score_type: "sets",
  },
  {
    id: "m2",
    team1_ids: ["1", "3"],
    team2_ids: ["2", "4"],
    team1_sets: 2,
    team2_sets: 6,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    score_type: "sets",
  },
];

export default function WeeklyEmailPreview({ currentUserId }: WeeklyEmailPreviewProps) {
  const { allMatches: matches = [], profiles = [], isLoading } = useEloStats();
  const [useMock, setUseMock] = useState(true);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [timeframe, setTimeframe] = useState<"7days" | "30days" | "isoWeek">("7days");
  const [selectedWeek, setSelectedWeek] = useState<string>(""); // format "YYYY-Www"
  const [isSending, setIsSending] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const hasSupabaseUrl = Boolean(supabaseUrl);
  const hasSupabaseAnonKey = Boolean(supabaseAnonKey);
  const maskedSupabaseAnonKey = hasSupabaseAnonKey
    ? `${supabaseAnonKey.slice(0, 6)}…${supabaseAnonKey.slice(-4)}`
    : "saknas";
  // Note for non-coders: this limits the env status hint to logged-in admin views only.
  const showEnvStatus = Boolean(currentUserId);

  const activeProfiles = useMock ? MOCK_PROFILES : profiles.filter(p => !p.is_deleted);
  const activeMatches = useMock ? MOCK_MATCHES : matches;

  // Set default player if not set or if current player is not in active list
  React.useEffect(() => {
    if (activeProfiles.length > 0) {
      const exists = activeProfiles.some((p) => p.id === selectedPlayerId);
      if (!exists) {
        // Default to current user if possible, otherwise first profile
        const currentInActive = currentUserId && activeProfiles.some(p => p.id === currentUserId);
        setSelectedPlayerId(currentInActive ? currentUserId : activeProfiles[0].id);
      }
    } else if (selectedPlayerId) {
      setSelectedPlayerId("");
    }
  }, [activeProfiles, selectedPlayerId, currentUserId]);

  React.useEffect(() => {
    let isMounted = true;
    // Note for non-coders: we check if the user is logged in so we can safely send emails.
    const updateSessionState = (hasAccessToken: boolean, error?: Error | null) => {
      if (!isMounted) return;
      setHasSession(hasAccessToken && !error);
    };

    supabase.auth.getSession().then(({ data, error }) => {
      updateSessionState(Boolean(data.session?.access_token), error);
    });

    // Note for non-coders: this keeps the button in sync if someone logs in or out.
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      updateSessionState(Boolean(session?.access_token), null);
    });

    return () => {
      isMounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const availableWeeks = useMemo(() => {
    const weeks = new Set<string>();
    activeMatches.forEach(m => {
      const d = new Date(m.created_at);
      const { week, year } = getISOWeek(d);
      weeks.add(`${year}-W${String(week).padStart(2, '0')}`);
    });
    return Array.from(weeks).sort().reverse();
  }, [activeMatches]);

  // Set default week if not set or if current week is not in available list
  React.useEffect(() => {
    if (availableWeeks.length > 0) {
      const exists = availableWeeks.includes(selectedWeek);
      if (!exists) {
        setSelectedWeek(availableWeeks[0]);
      }
    } else if (selectedWeek) {
      setSelectedWeek("");
    }
  }, [availableWeeks, selectedWeek]);

  const emailData = useMemo(() => {
    if (!selectedPlayerId) return null;

    const now = new Date();
    let start, end;

    if (timeframe === "7days") {
      end = now;
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (timeframe === "30days") {
      end = now;
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (timeframe === "isoWeek" && selectedWeek) {
      const [year, weekStr] = selectedWeek.split("-W");
      const range = getISOWeekRange(parseInt(weekStr), parseInt(year));
      start = range.start;
      end = range.end;
    } else {
      return null;
    }

    const startISO = start.toISOString();
    const endISO = end.toISOString();

    const matchesBeforeStart = activeMatches.filter(m => m.created_at < startISO);
    const matchesBeforeEnd = activeMatches.filter(m => m.created_at < endISO);
    const weeklyMatches = activeMatches.filter(m => m.created_at >= startISO && m.created_at < endISO);

    const eloStartData = calculateEloWithStats(matchesBeforeStart, activeProfiles);
    const eloEndData = calculateEloWithStats(matchesBeforeEnd, activeProfiles);
    const eloStart = eloStartData.players;
    const eloEnd = eloEndData.players;

    const playerEnd = eloEnd.find(p => p.id === selectedPlayerId);

    if (!playerEnd && !useMock) return null;

    // Note for non-coders: this builds a readable "Team A vs Team B" label from player ids.
    const formatTeamLabel = (match: Match) => {
      const resolveName = (pid: string | null) => {
        if (!pid || pid === GUEST_ID) return "Gästspelare";
        return activeProfiles.find(p => p.id === pid)?.name || "Gästspelare";
      };
      const team1 = match.team1_ids.map(resolveName).join(" + ");
      const team2 = match.team2_ids.map(resolveName).join(" + ");
      return `${team1 || "Okänt lag"} vs ${team2 || "Okänt lag"}`;
    };

    // Note for non-coders: this helper collects weekly stats for any player so we can rank MVPs.
    const buildWeeklyStats = (playerId: string) => {
      const pMatches = weeklyMatches.filter(m => m.team1_ids.includes(playerId) || m.team2_ids.includes(playerId));
      const wins = pMatches.filter(m => {
        const isT1 = m.team1_ids.includes(playerId);
        return isT1 ? m.team1_sets > m.team2_sets : m.team2_sets > m.team1_sets;
      }).length;

      const sortedMatches = [...pMatches].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      // Note for non-coders: we track the last 5 wins/losses to draw the mini "form curve" sparkline.
      const recentResults = sortedMatches.slice(-5).map(m => {
        const isT1 = m.team1_ids.includes(playerId);
        const didWin = isT1 ? m.team1_sets > m.team2_sets : m.team2_sets > m.team1_sets;
        return didWin ? "W" : "L";
      });

      const partners: Record<string, number> = {};
      const partnerStats: Record<string, { games: number; wins: number }> = {};
      const opponentStats: Record<string, { games: number; wins: number }> = {};
      pMatches.forEach(m => {
        const isTeam1 = m.team1_ids.includes(playerId);
        const didWin = isTeam1 ? m.team1_sets > m.team2_sets : m.team2_sets > m.team1_sets;
        const team = isTeam1 ? m.team1_ids : m.team2_ids;
        const opponents = isTeam1 ? m.team2_ids : m.team1_ids;

        team.forEach(pid => {
          if (pid && pid !== playerId && pid !== GUEST_ID) {
            partners[pid] = (partners[pid] || 0) + 1;
            partnerStats[pid] = partnerStats[pid] || { games: 0, wins: 0 };
            partnerStats[pid].games += 1;
            partnerStats[pid].wins += didWin ? 1 : 0;
          }
        });

        opponents.forEach(pid => {
          if (pid && pid !== GUEST_ID) {
            opponentStats[pid] = opponentStats[pid] || { games: 0, wins: 0 };
            opponentStats[pid].games += 1;
            opponentStats[pid].wins += didWin ? 1 : 0;
          }
        });
      });

      // Note for non-coders: "synergy" is the partner you played with the most this week.
      const bestPartnerEntry = Object.entries(partnerStats).sort((a, b) => b[1].games - a[1].games)[0];
      const synergy = bestPartnerEntry
        ? {
          id: bestPartnerEntry[0],
          name: activeProfiles.find(p => p.id === bestPartnerEntry[0])?.name || "Okänd",
          avatarUrl: activeProfiles.find(p => p.id === bestPartnerEntry[0])?.avatar_url || null,
          games: bestPartnerEntry[1].games,
          winRate: Math.round((bestPartnerEntry[1].wins / bestPartnerEntry[1].games) * 100),
        }
        : null;

      // Note for non-coders: "rivalry" is the opponent you faced the most in the same week.
      const topOpponentEntry = Object.entries(opponentStats).sort((a, b) => b[1].games - a[1].games)[0];
      const rivalry = topOpponentEntry
        ? {
          id: topOpponentEntry[0],
          name: activeProfiles.find(p => p.id === topOpponentEntry[0])?.name || "Okänd",
          avatarUrl: activeProfiles.find(p => p.id === topOpponentEntry[0])?.avatar_url || null,
          games: topOpponentEntry[1].games,
          winRate: Math.round((topOpponentEntry[1].wins / topOpponentEntry[1].games) * 100),
        }
        : null;

      // Note for non-coders: we only have final set totals, so "best comeback" is a proxy for the tightest win.
      const comebackMatch = sortedMatches
        .filter(m => {
          const isT1 = m.team1_ids.includes(playerId);
          return isT1 ? m.team1_sets > m.team2_sets : m.team2_sets > m.team1_sets;
        })
        .map(m => {
          const isT1 = m.team1_ids.includes(playerId);
          const teamSets = isT1 ? m.team1_sets : m.team2_sets;
          const oppSets = isT1 ? m.team2_sets : m.team1_sets;
          return { match: m, margin: teamSets - oppSets };
        })
        .sort((a, b) => a.margin - b.margin)[0];

      const selectedProfile = activeProfiles.find(p => p.id === playerId);

      return {
        name: eloEnd.find(p => p.id === playerId)?.name || selectedProfile?.name || "Okänd",
        matchesPlayed: pMatches.length,
        eloDelta: (eloEnd.find(p => p.id === playerId)?.elo || ELO_BASELINE) - (eloStart.find(p => p.id === playerId)?.elo || ELO_BASELINE),
        currentElo: eloEnd.find(p => p.id === playerId)?.elo || ELO_BASELINE,
        winRate: pMatches.length > 0 ? Math.round((wins / pMatches.length) * 100) : 0,
        partners: Object.entries(partners).map(([pid, count]) => ({
          name: activeProfiles.find(p => p.id === pid)?.name || "Okänd",
          count
        })),
        avatarUrl: selectedProfile?.avatar_url || null,
        synergy,
        rivalry,
        bestComeback: comebackMatch
          ? {
            score: `${comebackMatch.match.team1_sets}-${comebackMatch.match.team2_sets}`,
            margin: comebackMatch.margin,
            teamsLabel: formatTeamLabel(comebackMatch.match),
          }
          : null,
        recentResults,
        results: pMatches.map(m => `${m.team1_sets}-${m.team2_sets}`),
        wins,
        id: playerId,
        featuredBadgeId: selectedProfile?.featured_badge_id || null
      };
    };

    const stats = buildWeeklyStats(selectedPlayerId);
    // Note for non-coders: this pulls the ISO week number so the email title can say "Week X".
    let weekLabel = "";
    if (timeframe === "7days") {
      weekLabel = "SENASTE 7 DAGARNA";
    } else if (timeframe === "30days") {
      weekLabel = "SENASTE 30 DAGARNA";
    } else {
      const { week: weekNumber } = getISOWeek(start);
      weekLabel = `VECKA ${weekNumber} I PADEL`;
    }

    // MVP & Highlights
    const findWeekHighlight = () => {
      if (!weeklyMatches.length) return null;

      const highlights: any[] = [];
      const { eloDeltaByMatch, eloRatingByMatch } = eloEndData;

      weeklyMatches.forEach(match => {
        const getPreElo = (id: string | null) => {
          if (!id || id === GUEST_ID) return 1000;
          const postElo = eloRatingByMatch[match.id]?.[id];
          const delta = eloDeltaByMatch[match.id]?.[id];
          if (postElo === undefined || delta === undefined) {
            // If match wasn't in eloEndData (shouldn't happen), check eloStart
            return eloStart.find(p => p.id === id)?.elo || 1000;
          }
          return postElo - delta;
        };

        const t1PreElo = match.team1_ids.map(getPreElo);
        const t2PreElo = match.team2_ids.map(getPreElo);
        const avg1 = t1PreElo.reduce((a, b) => a + b, 0) / (t1PreElo.length || 1);
        const avg2 = t2PreElo.reduce((a, b) => a + b, 0) / (t2PreElo.length || 1);
        const exp1 = getExpectedScore(avg1, avg2);
        const team1Won = match.team1_sets > match.team2_sets;
        const winnerExp = team1Won ? exp1 : (1 - exp1);
        const margin = Math.abs(match.team1_sets - match.team2_sets);
        const teamsLabel = formatTeamLabel(match);
        const totalElo = avg1 + avg2;

        // 1. Upset?
        if (winnerExp < 0.35) {
          highlights.push({
            type: 'upset',
            score: (0.5 - winnerExp) * 100,
            title: 'Veckans Skräll',
            description: `Underdog-seger! Laget med endast ${Math.round(winnerExp * 100)}% vinstchans vann med ${match.team1_sets}-${match.team2_sets}. Lag: ${teamsLabel}.`
          });
        }
        // 2. Thriller?
        if (margin <= 1) {
          highlights.push({
            type: 'thriller',
            score: 50 - (winnerExp > 0.5 ? winnerExp - 0.5 : 0.5 - winnerExp) * 20,
            title: 'Veckans Rysare',
            description: `En riktig nagelbitare som avgjordes med minsta möjliga marginal (${match.team1_sets}-${match.team2_sets}). Lag: ${teamsLabel}.`
          });
        }
        // 3. Crush?
        if (margin >= 3) {
          highlights.push({
            type: 'crush',
            score: margin * 10,
            title: 'Veckans Kross',
            description: `Total dominans! En övertygande seger med ${match.team1_sets}-${match.team2_sets}. Lag: ${teamsLabel}.`
          });
        }
        // 4. Titans?
        if (totalElo > 2200) {
          highlights.push({
            type: 'titans',
            score: (totalElo - 2000) / 10,
            title: 'Veckans Giganter',
            description: `Mötet med veckans högsta samlade ELO-poäng (${Math.round(totalElo)}). Lag: ${teamsLabel}.`
          });
        }
      });

      const priority: Record<string, number> = { upset: 4, thriller: 3, crush: 2, titans: 1 };
      highlights.sort((a, b) => {
        if (priority[a.type] !== priority[b.type]) return priority[b.type] - priority[a.type];
        return b.score - a.score;
      });

      return highlights[0] || null;
    };

    const leaderboard = eloEnd
      .sort((a, b) => b.elo - a.elo)
      .slice(0, 5)
      .map((p, i) => `${i + 1}. ${p.name}: ${p.elo}`);

    // Note for non-coders: MVP scores reward both performance and activity in the week.
    // We align this with the dashboard MVP logic (score + tie-breakers).
    const mvpCandidates = activeProfiles.map(profile => {
      const ps = buildWeeklyStats(profile.id);
      return {
        ...ps,
        score: calculateMvpScore(ps.wins, ps.matchesPlayed, ps.eloDelta),
        periodEloGain: ps.eloDelta,
        eloNet: ps.currentElo,
        isEligible: ps.matchesPlayed >= 1 // Weekly min games
      };
    }).filter(c => c.matchesPlayed > 0);

    const mvp = getMvpWinner(mvpCandidates as any);

    return {
      stats,
      // Note for non-coders: we pass the week label along so the HTML renderer can reuse it without guessing.
      weekLabel,
      mvp,
      highlight: findWeekHighlight(),
      leaderboard
    };
  }, [selectedPlayerId, timeframe, selectedWeek, useMock, activeMatches, activeProfiles]);

  const emailHtml = useMemo(() => {
    if (!emailData) return "";

    const { stats, mvp, highlight, leaderboard, weekLabel } = emailData;
    const deltaColor = stats.eloDelta >= 0 ? "#2e7d32" : "#d32f2f";
    const deltaSign = stats.eloDelta > 0 ? "+" : "";
    // Note for non-coders: this converts a badge id into a small emoji/tier label we can print beside the name.
    const featuredBadgeLabel = getBadgeLabelById(stats.featuredBadgeId);
    // Note for non-coders: we build tiny HTML snippets so the same avatar styling is reused in multiple sections.
    const renderAvatar = (avatarUrl: string | null, name: string) => {
      const initial = name.trim().charAt(0).toUpperCase() || "?";
      return avatarUrl
        ? `<img src="${avatarUrl}" alt="${name}" width="56" height="56" style="border-radius: 50%; border: 2px solid #fff; display: block;" />`
        : `<div style="width: 56px; height: 56px; border-radius: 50%; background: #111; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 20px;">${initial}</div>`;
    };
    // Note for non-coders: the sparkline turns W/L into points so we can draw a tiny form curve.
    const sparklinePoints = stats.recentResults
      .map((result, index) => {
        const x = 8 + index * 18;
        const y = result === "W" ? 6 : 20;
        return `${x},${y}`;
      })
      .join(" ");

    // Note for non-coders: matching min-heights keeps the comeback and form cards aligned in the email layout.
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <!-- Note for non-coders: these meta tags hint email clients to keep the light theme instead of auto-darkening. -->
        <meta name="color-scheme" content="light">
        <meta name="supported-color-schemes" content="light">
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;700&display=swap" rel="stylesheet">
        <style>
          html, body { background-color: #f4f4f4; color: #1a1a1a; }
          body { font-family: 'Inter', Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; color: #1a1a1a; }
          h1, h2, h3 { font-family: 'Playfair Display', serif; }
        </style>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f4f4f4; color: #1a1a1a;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f4f4f4" style="background-color: #f4f4f4; padding: 20px;">
          <tr>
            <td align="center">
              <table width="600" border="0" cellspacing="0" cellpadding="0" bgcolor="#ffffff" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #000000 0%, #1a1a1a 60%, #0b0b0b 100%); padding: 40px 20px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 36px; letter-spacing: 2px; text-transform: uppercase;">${weekLabel}</h1>
                    <p style="color: #999; margin: 10px 0 0 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Grabbarnas Serie &bull; Sammanfattning</p>
                  </td>
                </tr>
                <!-- Intro -->
                <tr>
                  <td style="padding: 40px 40px 20px 40px;">
                    <h2 style="margin: 0; font-size: 28px; color: #000;">Hej ${stats.name}!</h2>
                    <p style="font-size: 16px; color: #666; line-height: 1.6;">Här är din personliga sammanfattning av veckans matcher och prestationer på banan.</p>
                  </td>
                </tr>
                <!-- Player Icon -->
                <tr>
                  <td style="padding: 0 40px 30px 40px;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background: #111; border-radius: 10px; color: #fff;">
                      <tr>
                        <td style="padding: 20px;" width="80" align="center">
                          ${renderAvatar(stats.avatarUrl, stats.name)}
                        </td>
                        <td style="padding: 20px 20px 20px 0;">
                          <h3 style="margin: 0; font-size: 20px; color: #fff;">
                            ${stats.name}${featuredBadgeLabel ? ` <span style="display: inline-block; margin-left: 8px; padding: 2px 8px; border: 1px solid #333; border-radius: 999px; font-size: 12px; color: #d4af37; text-transform: uppercase; letter-spacing: 1px;">${featuredBadgeLabel}</span>` : ""}
                          </h3>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <!-- Stats Grid -->
                <tr>
                  <td style="padding: 0 40px 40px 40px;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="10" style="background-color: #fafafa; border-radius: 8px; border: 1px solid #eee;">
                      <tr>
                        <td width="50%" align="center" style="border-right: 1px solid #eee; border-bottom: 1px solid #eee;">
                          <p style="margin: 0; font-size: 12px; color: #999; text-transform: uppercase;">Matcher</p>
                          <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: #000;">${stats.matchesPlayed}</p>
                        </td>
                        <td width="50%" align="center" style="border-bottom: 1px solid #eee;">
                          <p style="margin: 0; font-size: 12px; color: #999; text-transform: uppercase;">Vinstprocent</p>
                          <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: #000;">${stats.winRate}%</p>
                        </td>
                      </tr>
                      <tr>
                        <td width="50%" align="center" style="border-right: 1px solid #eee;">
                          <p style="margin: 0; font-size: 12px; color: #999; text-transform: uppercase;">ELO Delta</p>
                          <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: ${deltaColor};">${deltaSign}${stats.eloDelta}</p>
                        </td>
                        <td width="50%" align="center">
                          <p style="margin: 0; font-size: 12px; color: #999; text-transform: uppercase;">Nuvarande ELO</p>
                          <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: #000;">${stats.currentElo}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <!-- MVP Section -->
                ${mvp ? `
                <tr>
                  <td style="padding: 0 40px 40px 40px;">
                    <div style="background-color: #000; border-radius: 8px; padding: 30px; text-align: center; color: #fff;">
                      <p style="margin: 0; font-size: 12px; color: #d4af37; text-transform: uppercase; letter-spacing: 2px;">Veckans MVP</p>
                      <div style="margin: 14px 0 10px 0; display: inline-block;">
                        ${renderAvatar(mvp.avatarUrl || null, mvp.name)}
                      </div>
                      <h3 style="margin: 0; font-size: 32px; color: #fff;">${mvp.name}</h3>
                      <p style="margin: 0; font-size: 14px; color: #999;">Grym insats i veckan!</p>
                    </div>
                  </td>
                </tr>
                ` : ""}
                <!-- Highlight Section -->
                ${highlight ? `
                <tr>
                  <td style="padding: 0 40px 40px 40px;">
                    <div style="border-left: 4px solid #000; padding: 10px 20px; background-color: #f9f9f9;">
                      <h3 style="margin: 0; font-size: 20px; color: #000;">✨ ${highlight.title}</h3>
                      <p style="margin: 10px 0 0 0; font-size: 16px; color: #444; line-height: 1.5;">${highlight.description}</p>
                    </div>
                  </td>
                </tr>
                ` : ""}
                <!-- Synergy & Rivalry -->
                ${(stats.synergy || stats.rivalry) ? `
                <tr>
                  <td style="padding: 0 40px 40px 40px;">
                    <h3 style="margin: 0 0 15px 0; font-size: 20px; border-bottom: 2px solid #000; display: inline-block;">Synergi & Rivalitet</h3>
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="50%" style="padding-right: 10px;">
                          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background: #f7f7f7; border-radius: 10px; border: 1px solid #eee;">
                            <tr>
                              <td style="padding: 16px;" align="center" width="70">
                                ${stats.synergy ? renderAvatar(stats.synergy.avatarUrl, stats.synergy.name) : ""}
                              </td>
                              <td style="padding: 16px 16px 16px 0;">
                                <p style="margin: 0; font-size: 12px; text-transform: uppercase; color: #999;">Veckans synergi</p>
                                <p style="margin: 6px 0 0 0; font-size: 16px; font-weight: 700; color: #111;">${stats.synergy ? stats.synergy.name : "Ingen partner spelad"}</p>
                                ${stats.synergy ? `<p style="margin: 6px 0 0 0; font-size: 13px; color: #666;">${stats.synergy.games} matcher • ${stats.synergy.winRate}% vinster</p>` : ""}
                              </td>
                            </tr>
                          </table>
                        </td>
                        <td width="50%" style="padding-left: 10px;">
                          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background: #f7f7f7; border-radius: 10px; border: 1px solid #eee;">
                            <tr>
                              <td style="padding: 16px;" align="center" width="70">
                                ${stats.rivalry ? renderAvatar(stats.rivalry.avatarUrl, stats.rivalry.name) : ""}
                              </td>
                              <td style="padding: 16px 16px 16px 0;">
                                <p style="margin: 0; font-size: 12px; text-transform: uppercase; color: #999;">Veckans rival</p>
                                <p style="margin: 6px 0 0 0; font-size: 16px; font-weight: 700; color: #111;">${stats.rivalry ? stats.rivalry.name : "Ingen rival denna vecka"}</p>
                                ${stats.rivalry ? `<p style="margin: 6px 0 0 0; font-size: 13px; color: #666;">${stats.rivalry.games} möten • ${stats.rivalry.winRate}% vinster</p>` : ""}
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                ` : ""}
                <!-- Best Comeback & Form Curve -->
                ${(stats.bestComeback || stats.recentResults.length) ? `
                <tr>
                  <td style="padding: 0 40px 40px 40px;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="50%" style="padding-right: 10px;">
                          <div style="background: #111; border-radius: 10px; padding: 16px; color: #fff; min-height: 120px;">
                            <p style="margin: 0; font-size: 12px; text-transform: uppercase; color: #d4af37;">Bästa comeback</p>
                            <p style="margin: 8px 0 0 0; font-size: 20px; font-weight: 700;">${stats.bestComeback ? stats.bestComeback.score : "Ingen vinst i veckan"}</p>
                            <p style="margin: 6px 0 0 0; font-size: 13px; color: #bbb;">${stats.bestComeback ? `Lag: ${stats.bestComeback.teamsLabel}` : "Spela fler matcher för att få en comeback!"}</p>
                          </div>
                        </td>
                        <td width="50%" style="padding-left: 10px;">
                          <div style="background: #f7f7f7; border-radius: 10px; border: 1px solid #eee; padding: 16px; min-height: 120px;">
                            <p style="margin: 0; font-size: 12px; text-transform: uppercase; color: #999;">Formkurva (senaste 5)</p>
                            ${stats.recentResults.length ? `
                              <svg width="120" height="26" viewBox="0 0 120 26" xmlns="http://www.w3.org/2000/svg" aria-label="Formkurva">
                                <polyline points="${sparklinePoints}" fill="none" stroke="#111" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></polyline>
                                ${stats.recentResults.map((result, index) => {
                                  const x = 8 + index * 18;
                                  const y = result === "W" ? 6 : 20;
                                  const color = result === "W" ? "#2e7d32" : "#d32f2f";
                                  return `<circle cx="${x}" cy="${y}" r="4" fill="${color}" />`;
                                }).join("")}
                              </svg>
                              <p style="margin: 6px 0 0 0; font-size: 12px; color: #666;">${stats.recentResults.join(" ")}</p>
                            ` : `
                              <p style="margin: 8px 0 0 0; font-size: 13px; color: #666;">Ingen formkurva ännu.</p>
                            `}
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                ` : ""}
                <!-- Results Section -->
                ${stats.results.length > 0 ? `
                <tr>
                  <td style="padding: 0 40px 40px 40px;">
                    <h3 style="margin: 0 0 10px 0; font-size: 20px; border-bottom: 2px solid #000; display: inline-block;">Dina resultat</h3>
                    <p style="margin: 0; font-size: 14px; color: #666;">${stats.results.join(', ')}</p>
                  </td>
                </tr>
                ` : ""}
                <!-- Leaderboard Section -->
                <tr>
                  <td style="padding: 0 40px 40px 40px;">
                    <h3 style="margin: 0 0 15px 0; font-size: 20px; border-bottom: 2px solid #000; display: inline-block;">Topplistan just nu</h3>
                    <table width="100%" border="0" cellspacing="0" cellpadding="5">
                      ${leaderboard.map(line => `
                        <tr>
                          <td style="font-size: 14px; border-bottom: 1px solid #eee; padding: 10px 0; color: #333;">${line}</td>
                        </tr>
                      `).join('')}
                    </table>
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="background-color: #fafafa; padding: 30px; text-align: center; border-top: 1px solid #eee;">
                    <p style="margin: 0; font-size: 12px; color: #999;">
                      Detta är ett automatiskt utskick från Grabbarnas Serie.<br>
                      Vi ses på banan!
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }, [emailData]);

  const handleSendTest = async () => {
    if (!selectedPlayerId) return;

    const player = activeProfiles.find(p => p.id === selectedPlayerId);
    // Note for non-coders: we ask Supabase who is logged in right now before we attempt to send email.
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    // Note for non-coders: the access token proves to the server that this logged-in user is allowed to call the function.
    const hasAccessToken = Boolean(sessionData.session?.access_token);
    if (sessionError || !hasAccessToken) {
      setHasSession(false);
      alert("Du måste vara inloggad för att skicka test-mail.");
      return;
    }
    setHasSession(true);

    const confirmed = window.confirm(`Vill du skicka ett test-mail till ${player?.name}?`);
    if (!confirmed) return;

    setIsSending(true);
    try {
      // Note for non-coders: in development we print short token snippets to verify the right login data is present.
      if (import.meta.env.DEV) {
        const session = sessionData.session;
        const tokenPrefix = (token?: string | null) => (token ? `${token.slice(0, 12)}…` : "saknas");
        console.log("WeeklyEmailPreview token prefixes", {
          access: tokenPrefix(session?.access_token),
          id: tokenPrefix(session?.id_token),
          provider: tokenPrefix(session?.provider_token),
        });
        if (!session?.access_token && (session?.id_token || session?.provider_token)) {
          console.warn("Admin warning: access_token saknas men id_token/provider_token finns.");
          alert("Admin-varning: access_token saknas men id_token/provider_token finns.");
        }
      }
      // Note for non-coders: Supabase adds the login token for us when we call a server function.
      const body: any = { playerId: selectedPlayerId, timeframe };
      if (timeframe === "isoWeek" && selectedWeek) {
        const [year, week] = selectedWeek.split("-W");
        body.week = parseInt(week);
        body.year = parseInt(year);
      }

      const { data, error } = await supabase.functions.invoke("weekly-summary", {
        body,
      });

      if (error) {
        const errorMessage = error.message || "Okänt fel";
        throw new Error(errorMessage);
      }

      if (data?.success) {
        const errorCount = Array.isArray(data.errors) ? data.errors.length : 0;
        if (errorCount > 0) {
          const errorNames = data.errors
            .map((entry: { name?: string; error?: string }) => entry.name)
            .filter(Boolean)
            .slice(0, 3)
            .join(", ");
          // Note for non-coders: The function reads email addresses from Supabase Auth,
          // so a profile without a matching Auth user has no email to send to.
          const errorHint = errorNames ? ` (saknar e-post: ${errorNames})` : "";
          alert(`Test-mail skickades till ${data.sent} mottagare, men ${errorCount} saknar e-post i Auth.${errorHint}`);
        } else {
          alert(`Test-mail har skickats till ${data.sent} mottagare.`);
        }
      } else if (data?.message === "No activity") {
        alert("Ingen aktivitet hittades för den här spelaren den senaste veckan, men mailet kan ha skickats ändå om spelaren forcerades.");
      } else {
        alert("Test-mail skickat!");
      }
    } catch (error: any) {
      console.error("Failed to send test email:", error);
      alert("Kunde inte skicka test-mail: " + (error.message || "Okänt fel"));
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) return <CircularProgress />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Paper sx={{ p: 3, borderRadius: 4 }}>
        <Typography variant="h6" gutterBottom fontWeight={700}>
          Förhandsgranskning av Veckobrev
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Här kan du se hur det veckovisa sammanfattningsmailet ser ut för olika spelare.
        </Typography>
        {showEnvStatus ? (
          <>
            {/* Note for non-coders: this tiny caption helps admins confirm that build-time env values reached the browser. */}
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mb: 2 }}
            >
              Admin-check: Supabase URL {hasSupabaseUrl ? "finns" : "saknas"} · Anon key{" "}
              {hasSupabaseAnonKey ? maskedSupabaseAnonKey : "saknas"}
            </Typography>
          </>
        ) : null}

        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, sm: 4 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Välj spelare</InputLabel>
              <Select
                value={selectedPlayerId}
                label="Välj spelare"
                onChange={(e) => setSelectedPlayerId(e.target.value)}
              >
                {activeProfiles.map(p => (
                  <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Tidsperiod</InputLabel>
              <Select
                value={timeframe}
                label="Tidsperiod"
                onChange={(e) => setTimeframe(e.target.value as any)}
              >
                <MenuItem value="7days">Senaste 7 dagarna</MenuItem>
                <MenuItem value="30days">Senaste 30 dagarna</MenuItem>
                <MenuItem value="isoWeek">Välj specifik vecka</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          {timeframe === 'isoWeek' && (
            <Grid size={{ xs: 12, sm: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Välj vecka</InputLabel>
                <Select
                  value={selectedWeek}
                  label="Välj vecka"
                  onChange={(e) => setSelectedWeek(e.target.value)}
                >
                  {availableWeeks.map(w => {
                    const [year, week] = w.split("-W");
                    return (
                      <MenuItem key={w} value={w}>
                        {`Vecka ${parseInt(week)}, ${year}`}
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
            </Grid>
          )}
          <Grid size={{ xs: 12, sm: 2 }}>
            <FormControlLabel
              control={<Switch checked={useMock} onChange={(e) => setUseMock(e.target.checked)} />}
              label="Testdata"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 2 }}>
            {/* Note for non-coders: the button is only blocked once we know you're logged out. */}
            <Button
              variant="contained"
              fullWidth
              onClick={handleSendTest}
              disabled={isSending || useMock || hasSession === false}
              startIcon={isSending ? <CircularProgress size={16} color="inherit" /> : null}
            >
              Skicka test
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {emailData ? (
        <Paper sx={{ borderRadius: 4, overflow: 'hidden', border: '1px solid', borderColor: 'divider', height: '800px' }}>
          <iframe
            title="Email Preview"
            srcDoc={emailHtml}
            style={{ width: '100%', height: '100%', border: 'none' }}
          />
        </Paper>
      ) : (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 4 }}>
          <Typography color="text.secondary">Ingen data tillgänglig för den valda perioden/spelaren.</Typography>
        </Paper>
      )}
    </Box>
  );
}
