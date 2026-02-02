import React, { useMemo, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Switch,
  FormControlLabel,
  CircularProgress,
  Button,
} from "@mui/material";
import { useEloStats } from "../../hooks/useEloStats";
import { useTournamentDetails, useTournamentResults, useTournaments } from "../../hooks/useTournamentData";
import { GUEST_ID } from "../../utils/guest";
import { formatShortDate } from "../../utils/format";

interface TournamentEmailPreviewProps {
  currentUserId?: string;
}

const MOCK_TOURNAMENT = {
  id: "mock-1",
  name: "Söndagsturnering",
  tournament_type: "mexicano",
  completed_at: new Date().toISOString(),
  scheduled_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  location: "Bana 3",
  score_target: 24,
};

const MOCK_PLAYERS = [
  { id: "p1", name: "Smash-Sara", avatarUrl: "https://api.dicebear.com/8.x/thumbs/svg?seed=Sara" },
  { id: "p2", name: "Volley-Viktor", avatarUrl: "https://api.dicebear.com/8.x/thumbs/svg?seed=Viktor" },
  { id: "p3", name: "Lobb-Lina", avatarUrl: "https://api.dicebear.com/8.x/thumbs/svg?seed=Lina" },
  { id: "p4", name: "Serve-Simon", avatarUrl: "https://api.dicebear.com/8.x/thumbs/svg?seed=Simon" },
];

const MOCK_RESULTS = [
  { profile_id: "p1", rank: 1, points_for: 45, points_against: 30, wins: 3, losses: 1 },
  { profile_id: "p2", rank: 2, points_for: 42, points_against: 33, wins: 3, losses: 1 },
  { profile_id: "p3", rank: 3, points_for: 39, points_against: 35, wins: 2, losses: 2 },
  { profile_id: "p4", rank: 4, points_for: 30, points_against: 45, wins: 1, losses: 3 },
];

const MOCK_ROUNDS = [
  { round_number: 1, team1_ids: ["p1", "p2"], team2_ids: ["p3", "p4"], team1_score: 13, team2_score: 11 },
  { round_number: 2, team1_ids: ["p1", "p3"], team2_ids: ["p2", "p4"], team1_score: 10, team2_score: 14 },
];

const buildEmailHtml = ({
  tournament,
  results,
  rounds,
  participants,
}: {
  tournament: any;
  results: any[];
  rounds: any[];
  participants: { id: string; name: string; avatarUrl?: string | null }[];
}) => {
  // Note for non-coders: we keep this HTML builder in the preview so the design matches the real email template.
  const resolveParticipant = (id: string | null | undefined) =>
    participants.find(p => p.id === id) || { id: "guest", name: "Gästspelare", avatarUrl: null };
  const resolveName = (id: string | null | undefined) => resolveParticipant(id).name;
  const renderAvatar = (avatarUrl: string | null | undefined, name: string, size = 42) => {
    const initial = name.trim().charAt(0).toUpperCase() || "?";
    return avatarUrl
      ? `<img src="${avatarUrl}" alt="${name}" width="${size}" height="${size}" style="border-radius: 50%; border: 2px solid #fff; display: block;" />`
      : `<div style="width: ${size}px; height: ${size}px; border-radius: 50%; background: #111; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: ${Math.max(12, Math.round(size / 2.8))}px;">${initial}</div>`;
  };

  const winners = results.filter(entry => entry.rank === 1).map(entry => ({
    ...resolveParticipant(entry.profile_id),
    rank: entry.rank,
  }));
  const podiumEntries = results.slice(0, 3).map(entry => ({
    ...resolveParticipant(entry.profile_id),
    rank: entry.rank,
  }));
  // Note for non-coders: the podium layout uses a fixed table so it renders consistently in email clients.
  const getPodiumEntry = (rank: number) =>
    podiumEntries.find(entry => entry.rank === rank) || { name: "Gästspelare", avatarUrl: null, rank };
  const podiumSlots = [
    { rank: 2, paddingTop: 24, barHeight: 16, barColor: "#d7d7d7" },
    { rank: 1, paddingTop: 0, barHeight: 26, barColor: "#f5c542" },
    { rank: 3, paddingTop: 36, barHeight: 12, barColor: "#d9c1b7" },
  ];
  const matchRows = rounds
    .filter(round => Number.isFinite(round.team1_score) && Number.isFinite(round.team2_score))
    .map(round => {
      const team1 = (round.team1_ids || []).map(resolveName).join(" + ");
      const team2 = (round.team2_ids || []).map(resolveName).join(" + ");
      return {
        label: `Runda ${round.round_number}`,
        matchup: `${team1 || "Gästspelare"} vs ${team2 || "Gästspelare"}`,
        score: `${round.team1_score}–${round.team2_score}`,
      };
    });

  const formatRecord = (entry: any) => {
    // Note for non-coders: tournaments don't store draws explicitly, so we infer them from total matches.
    const wins = Number(entry.wins ?? 0);
    const losses = Number(entry.losses ?? 0);
    const matches = Number(entry.matches_played ?? wins + losses);
    const draws = Math.max(0, matches - wins - losses);
    return `${wins}/${draws}/${losses}`;
  };

  return `
    <!doctype html>
    <html lang="sv">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Turneringssammanfattning</title>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;700&display=swap" rel="stylesheet">
        <style>
          :root { color-scheme: light dark; supported-color-schemes: light dark; }
          html, body { background-color: #f4f4f4; color: #1a1a1a; }
          body { font-family: 'Inter', Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; color: #1a1a1a; }
          h1, h2, h3 { font-family: 'Playfair Display', serif; }
          table, td { background-color: #ffffff; color: #1a1a1a; }
          .email-container { background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
          .email-hero { background: linear-gradient(135deg, #000000 0%, #1a1a1a 60%, #0b0b0b 100%); color: #ffffff; padding: 36px 24px; text-align: center; }
          .email-section { padding: 28px 32px; }
          .email-card { background: #f7f7f7; border-radius: 12px; border: 1px solid #eee; padding: 16px; }
          .email-pill { display: inline-block; padding: 4px 12px; border-radius: 999px; background: rgba(255,255,255,0.15); color: #fff; font-size: 12px; letter-spacing: 1px; text-transform: uppercase; }
          .email-avatar-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
          .email-subtle { color: #666; font-size: 13px; margin: 6px 0 0; }
          /* Note for non-coders: this styling adds gentle shading so the results table is easier to scan. */
          .email-table { width: 100%; border-collapse: collapse; font-size: 14px; border: 1px solid #e2e2e2; border-radius: 10px; overflow: hidden; background: #ffffff; }
          .email-table th, .email-table td { padding: 8px 10px; color: #1a1a1a; }
          .email-table thead th { background: #f1f3f5; font-weight: 700; }
          .email-table tbody tr:nth-child(even) { background: #f9fafb; }
          .email-table tbody td { border-top: 1px solid #ececec; }
        </style>
      </head>
      <body>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4; padding:24px;">
          <tr>
            <td align="center">
              <table class="email-container" width="600" cellpadding="0" cellspacing="0">
                <tr>
                  <td class="email-hero">
                    <div class="email-pill">Turneringssammanfattning</div>
                    <h1 style="margin:12px 0 6px; font-size:28px;">${tournament.name || "Turnering"}</h1>
                    <p style="margin:0; color:#cfcfcf;">${tournament.tournament_type || "mexicano"} • ${tournament.location || "Plats saknas"}</p>
                    <p style="margin:6px 0 0; color:#cfcfcf;">Avslutad ${formatShortDate(tournament.completed_at || tournament.scheduled_at || "")}</p>
                  </td>
                </tr>
                <tr>
                  <td class="email-section">
                    <div class="email-card" style="background: linear-gradient(135deg, #fff7d6 0%, #ffe3a6 100%); border: 1px solid #f0cf7a;">
                      <h2 style="margin:0 0 12px;">Vinnare</h2>
                      ${winners.length ? winners.map(entry => `
                        <!-- Note for non-coders: inline styles keep the winner card centered and celebratory in most email clients. -->
                        <div style="text-align:center; padding:8px 0;">
                          <div style="display:inline-block; text-align:center;">
                            <div style="margin:0 auto 8px; width:42px;">
                              ${renderAvatar(entry.avatarUrl, entry.name)}
                            </div>
                            <div style="font-size:18px; font-weight:700;">
                              <span style="font-size:18px; margin-right:6px;">👑</span>${entry.name}
                            </div>
                          </div>
                        </div>
                      `).join("") : "<p style=\"margin:0;\">Ingen vinnare registrerad</p>"}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td class="email-section" style="padding-top:0;">
                    <div class="email-card">
                      <h2 style="margin:0 0 12px;">Podium</h2>
                      <!-- Note for non-coders: tables with fixed widths avoid layout issues in email clients. -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="table-layout:fixed;">
                        <tr>
                          ${podiumSlots.map(slot => {
                            const entry = getPodiumEntry(slot.rank);
                            return `
                              <td width="180" valign="bottom" align="center">
                                <table width="100%" cellpadding="0" cellspacing="0">
                                  <tr>
                                    <td style="padding-top:${slot.paddingTop}px; padding-bottom:8px; text-align:center;">
                                      <div style="margin:0 auto 6px;">
                                        <span style="display:inline-block; padding:4px 12px; background:#111; color:#fff; border-radius:999px; font-size:16px; font-weight:700;">${entry.rank}</span>
                                      </div>
                                      <div style="margin:0 auto 6px; width:42px;">
                                        ${renderAvatar(entry.avatarUrl, entry.name)}
                                      </div>
                                      <div style="font-weight:700; font-size:14px;">${entry.name}</div>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="height:${slot.barHeight}px; background:${slot.barColor}; border-radius:8px 8px 0 0;"></td>
                                  </tr>
                                </table>
                              </td>
                            `;
                          }).join("")}
                        </tr>
                      </table>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td class="email-section" style="padding-top:0;">
                    <div class="email-card">
                      <h2 style="margin:0 0 12px;">Tabell</h2>
                      <table width="100%" cellpadding="0" cellspacing="0" class="email-table">
                        <thead>
                          <tr>
                            <th align="left">Plac.</th>
                            <th align="left">Namn</th>
                            <th align="center">Poäng</th>
                            <th align="center">Matcher</th>
                            <th align="center">V/O/F</th>
                            <th align="center">Diff</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${results.map(entry => `
                            <tr>
                              <td>${entry.rank}</td>
                              <td>${resolveName(entry.profile_id)}</td>
                              <td align="center">${entry.points_for ?? 0}</td>
                              <td align="center">${entry.matches_played ?? "-"}</td>
                              <td align="center">${formatRecord(entry)}</td>
                              <td align="center">${(entry.points_for ?? 0) - (entry.points_against ?? 0)}</td>
                            </tr>
                          `).join("")}
                        </tbody>
                      </table>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td class="email-section" style="padding-top:0;">
                    <div class="email-card">
                      <h2 style="margin:0 0 12px;">Matcher</h2>
                      ${matchRows.length ? matchRows.map(match => `
                        <p style="margin:0 0 8px;"><strong>${match.label}:</strong> ${match.matchup} (${match.score})</p>
                      `).join("") : `<p style="margin:0;">Inga matcher registrerade.</p>`}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
};

export default function TournamentEmailPreview({ currentUserId: _currentUserId }: TournamentEmailPreviewProps) {
  const [useMock, setUseMock] = useState(true);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>("");
  const [showPreview, setShowPreview] = useState(false);

  const { data: tournaments = [], isLoading: isLoadingTournaments } = useTournaments();
  const { data: tournamentDetails } = useTournamentDetails(selectedTournamentId);
  const { data: tournamentResults = {} } = useTournamentResults();
  const { profiles = [], isLoading: isLoadingProfiles } = useEloStats();

  const completedTournaments = tournaments.filter(t => t.status === "completed");

  React.useEffect(() => {
    if (!useMock && completedTournaments.length > 0 && !selectedTournamentId) {
      // Note for non-coders: we auto-select the most recent completed tournament so the preview isn't empty.
      setSelectedTournamentId(completedTournaments[0].id);
    }
  }, [completedTournaments, selectedTournamentId, useMock]);

  React.useEffect(() => {
    // Note for non-coders: we only render the preview after clicking the generate button.
    setShowPreview(false);
  }, [useMock, selectedTournamentId, tournamentDetails]);

  const emailHtml = useMemo(() => {
    if (!showPreview) return "";
    if (useMock) {
      // Note for non-coders: mock data lets admins see the email design without real tournament data.
      return buildEmailHtml({
        tournament: MOCK_TOURNAMENT,
        results: MOCK_RESULTS,
        rounds: MOCK_ROUNDS,
        participants: MOCK_PLAYERS,
      });
    }

    const selectedTournament = completedTournaments.find(t => t.id === selectedTournamentId);
    if (!selectedTournament || !tournamentDetails) return "";

    const participantIds = tournamentDetails.participants || [];
    const participants = participantIds.map((id: string) => {
      if (id === GUEST_ID) return { id, name: "Gästspelare", avatarUrl: null };
      // Note for non-coders: we look up names and avatars from profiles so the email shows real players.
      const profile = profiles.find(p => p.id === id);
      return { id, name: profile?.name || "Gästspelare", avatarUrl: profile?.avatar_url || null };
    });

    const results = tournamentResults[selectedTournamentId] || [];

    return buildEmailHtml({
      tournament: selectedTournament,
      results,
      rounds: tournamentDetails.rounds || [],
      participants,
    });
  }, [showPreview, useMock, completedTournaments, selectedTournamentId, tournamentDetails, profiles, tournamentResults]);

  if (isLoadingTournaments || isLoadingProfiles) return <CircularProgress />;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Paper sx={{ p: 3, borderRadius: 4 }}>
        <Typography variant="h6" gutterBottom fontWeight={700}>
          Turneringsmejl
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Förhandsgranska sammanfattningen som skickas två timmar efter att en turnering avslutats.
        </Typography>

        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, sm: 4 }}>
            <FormControlLabel
              control={(
                <Switch
                  checked={useMock}
                  onChange={(e) => setUseMock(e.target.checked)}
                />
              )}
              label="Testdata"
            />
          </Grid>
          {!useMock && (
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Välj turnering</InputLabel>
                <Select
                  value={selectedTournamentId}
                  label="Välj turnering"
                  onChange={(e) => setSelectedTournamentId(e.target.value)}
                >
                  {completedTournaments.map(t => (
                    <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          )}
          <Grid size={{ xs: 12, sm: 4 }}>
            {/* Note for non-coders: the preview is generated only after clicking this button. */}
            <Button
              variant="contained"
              fullWidth
              onClick={() => setShowPreview(true)}
            >
              generera förhandsgranskning
            </Button>
          </Grid>
        </Grid>

        {showPreview ? (
          emailHtml ? (
            <Paper sx={{ mt: 3, borderRadius: 4, overflow: "hidden", border: "1px solid", borderColor: "divider", height: "800px" }}>
              <iframe
                title="Turneringsmejl"
                srcDoc={emailHtml}
                style={{ width: "100%", height: "100%", border: "none" }}
              />
            </Paper>
          ) : (
            <Paper sx={{ mt: 3, p: 4, textAlign: "center", borderRadius: 4 }}>
              <Typography color="text.secondary">Ingen data att visa ännu.</Typography>
            </Paper>
          )
        ) : (
          <Paper sx={{ mt: 3, p: 4, textAlign: "center", borderRadius: 4 }}>
            <Typography color="text.secondary">Ingen förhandsgranskning ännu — klicka på knappen ovan för att skapa en.</Typography>
          </Paper>
        )}
      </Paper>
    </Box>
  );
}
