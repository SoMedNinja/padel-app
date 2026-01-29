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
import { usePadelData } from "../../hooks/usePadelData";
import { calculateEloWithStats, ELO_BASELINE } from "../../utils/elo";
import { Match, Profile } from "../../types";
import { GUEST_ID } from "../../utils/guest";
import { supabase } from "../../supabaseClient";

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

export default function WeeklyEmailPreview({ currentUserId: _ }: WeeklyEmailPreviewProps) {
  const { matches = [], profiles = [], isLoading } = usePadelData();
  const [useMock, setUseMock] = useState(true);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [timeframe, setTimeframe] = useState<"current" | "previous">("current");
  const [isSending, setIsSending] = useState(false);

  const activeProfiles = useMock ? MOCK_PROFILES : profiles.filter(p => !p.is_deleted);
  const activeMatches = useMock ? MOCK_MATCHES : matches;

  // Set default player if not set
  React.useEffect(() => {
    if (!selectedPlayerId && activeProfiles.length > 0) {
      setSelectedPlayerId(activeProfiles[0].id);
    }
  }, [activeProfiles, selectedPlayerId]);

  const emailData = useMemo(() => {
    if (!selectedPlayerId) return null;

    const now = new Date();
    let start, end;

    if (timeframe === "current") {
      // Past 7 days
      end = now;
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else {
      // 7-14 days ago
      end = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      start = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
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
  }, [selectedPlayerId, timeframe, useMock, activeMatches, activeProfiles]);

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
    const confirmed = window.confirm(`Vill du skicka ett test-mail till ${player?.name}?`);
    if (!confirmed) return;

    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('weekly-summary', {
        body: { playerId: selectedPlayerId }
      });

      if (error) throw error;

      if (data?.success) {
        alert(`Test-mail har skickats till ${data.sent} mottagare.`);
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
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 3 }}>
            <FormControlLabel
              control={<Switch checked={useMock} onChange={(e) => setUseMock(e.target.checked)} />}
              label="Använd testdata"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 2 }}>
            <Button
              variant="contained"
              fullWidth
              onClick={handleSendTest}
              disabled={isSending || useMock}
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
