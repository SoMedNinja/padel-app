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
import { calculateEloWithStats, ELO_BASELINE } from "../../utils/elo";
import { getISOWeek, getISOWeekRange } from "../../utils/format";
import { Match, Profile } from "../../types";
import { GUEST_ID } from "../../utils/guest";
import { supabase, supabaseAnonKey, supabaseUrl } from "../../supabaseClient";

interface WeeklyEmailPreviewProps {
  currentUserId?: string;
}

const MOCK_PROFILES: Profile[] = [
  { id: "1", name: "Kalle Kula", is_approved: true, is_admin: false, is_deleted: false },
  { id: "2", name: "Padel-Pelle", is_approved: true, is_admin: false, is_deleted: false },
  { id: "3", name: "Smasher-Sven", is_approved: true, is_admin: false, is_deleted: false },
  { id: "4", name: "Boll-Berit", is_approved: true, is_admin: false, is_deleted: false },
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
  const [timeframe, setTimeframe] = useState<"current" | "previous" | "custom">("current");
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
    supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) return;
      const hasAccessToken = Boolean(data.session?.access_token);
      setHasSession(hasAccessToken && !error);
    });
    return () => {
      isMounted = false;
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

    if (timeframe === "current") {
      // Past 7 days
      end = now;
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (timeframe === "previous") {
      // 7-14 days ago
      end = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      start = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    } else if (timeframe === "custom" && selectedWeek) {
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

    const eloStart = calculateEloWithStats(matchesBeforeStart, activeProfiles).players;
    const eloEnd = calculateEloWithStats(matchesBeforeEnd, activeProfiles).players;

    const playerStart = eloStart.find(p => p.id === selectedPlayerId) || { elo: ELO_BASELINE };
    const playerEnd = eloEnd.find(p => p.id === selectedPlayerId);

    if (!playerEnd && !useMock) return null;

    const pMatches = weeklyMatches.filter(m => m.team1_ids.includes(selectedPlayerId) || m.team2_ids.includes(selectedPlayerId));
    const wins = pMatches.filter(m => {
      const isT1 = m.team1_ids.includes(selectedPlayerId);
      return isT1 ? m.team1_sets > m.team2_sets : m.team2_sets > m.team1_sets;
    }).length;

    const partners: Record<string, number> = {};
    pMatches.forEach(m => {
      const team = m.team1_ids.includes(selectedPlayerId) ? m.team1_ids : m.team2_ids;
      team.forEach(pid => { if (pid && pid !== selectedPlayerId && pid !== GUEST_ID) partners[pid] = (partners[pid] || 0) + 1; });
    });

    const stats = {
      name: playerEnd?.name || activeProfiles.find(p => p.id === selectedPlayerId)?.name || "Okänd",
      matchesPlayed: pMatches.length,
      eloDelta: (playerEnd?.elo || ELO_BASELINE) - (playerStart?.elo || ELO_BASELINE),
      currentElo: playerEnd?.elo || ELO_BASELINE,
      winRate: pMatches.length > 0 ? Math.round((wins / pMatches.length) * 100) : 0,
      partners: Object.entries(partners).map(([pid, count]) => ({
        name: activeProfiles.find(p => p.id === pid)?.name || "Okänd",
        count
      })),
      results: pMatches.map(m => `${m.team1_sets}-${m.team2_sets}`),
      wins,
      id: selectedPlayerId
    };

    // MVP & Highlights (simplified for preview)
    const findWeekHighlight = () => {
      if (!weeklyMatches.length) return null;
      // Just pick one for preview
      const m = weeklyMatches[0];
      const margin = Math.abs(m.team1_sets - m.team2_sets);

      if (margin >= 3) return { title: "Veckans Kross", description: `Total dominans! En övertygande seger med ${m.team1_sets}-${m.team2_sets}.` };
      return { title: "Veckans Rysare", description: `En riktig nagelbitare som avgjordes med minsta möjliga marginal (${m.team1_sets}-${m.team2_sets}).` };
    };

    const leaderboard = eloEnd
      .sort((a, b) => b.elo - a.elo)
      .slice(0, 5)
      .map((p, i) => `${i + 1}. ${p.name}: ${p.elo}`);

    return {
      stats,
      mvp: stats.matchesPlayed > 0 ? { name: stats.name } : null,
      highlight: findWeekHighlight(),
      leaderboard
    };
  }, [selectedPlayerId, timeframe, selectedWeek, useMock, activeMatches, activeProfiles]);

  const emailHtml = useMemo(() => {
    if (!emailData) return "";

    const { stats, mvp, highlight, leaderboard } = emailData;
    const deltaColor = stats.eloDelta >= 0 ? "#2e7d32" : "#d32f2f";
    const deltaSign = stats.eloDelta > 0 ? "+" : "";

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;700&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Inter', Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; color: #1a1a1a; }
          h1, h2, h3 { font-family: 'Playfair Display', serif; }
        </style>
      </head>
      <body>
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f4f4; padding: 20px;">
          <tr>
            <td align="center">
              <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
                <!-- Header -->
                <tr>
                  <td style="background-color: #000000; padding: 40px 20px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 36px; letter-spacing: 2px; text-transform: uppercase;">Veckan i Padel</h1>
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
                      <h3 style="margin: 10px 0; font-size: 32px; color: #fff;">${mvp.name}</h3>
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
    const accessToken = sessionData.session?.access_token;
    if (sessionError || !accessToken) {
      setHasSession(false);
      alert("Du måste vara inloggad för att skicka test-mail.");
      return;
    }
    setHasSession(true);

    const confirmed = window.confirm(`Vill du skicka ett test-mail till ${player?.name}?`);
    if (!confirmed) return;

    setIsSending(true);
    try {
      if (!accessToken) {
        // Note for non-coders: Edge Functions require a valid login session to prove who is calling.
        alert("Du måste vara inloggad för att skicka test-mail. Logga in och försök igen.");
        return;
      }

      if (!supabaseAnonKey) {
        // Note for non-coders: without the anon key, Supabase rejects the request with a 401.
        throw new Error("VITE_SUPABASE_ANON_KEY saknas i frontend-miljön (Vercel).");
      }

      if (!supabaseUrl) {
        // Note for non-coders: the base project URL is required so we know where to send the request.
        throw new Error("VITE_SUPABASE_URL saknas i frontend-miljön (Vercel).");
      }

      // Note for non-coders: we include apikey in both header and URL to avoid mobile/Safari stripping custom headers.
      const functionUrl = new URL(`${supabaseUrl}/functions/v1/weekly-summary`);
      functionUrl.searchParams.set("apikey", supabaseAnonKey);

      // Note for non-coders: we use a direct fetch so the headers match the working curl request exactly.
      const response = await fetch(functionUrl.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseAnonKey,
          "x-client-info": "padel-app-web",
          // Note for non-coders: "Bearer" means we are sending a short-lived session token for authentication.
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ playerId: selectedPlayerId }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const errorMessage = data?.error || data?.message || "Okänt fel";
        throw new Error(`${errorMessage} (status ${response.status})`);
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
                <MenuItem value="current">Senaste 7 dagarna</MenuItem>
                <MenuItem value="previous">7-14 dagar sedan</MenuItem>
                <MenuItem value="custom">Välj specifik vecka</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          {timeframe === 'custom' && (
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
            {/* Note for non-coders: we keep this button disabled until we know the user is logged in. */}
            <Button
              variant="contained"
              fullWidth
              onClick={handleSendTest}
              disabled={isSending || useMock || !hasSession}
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
