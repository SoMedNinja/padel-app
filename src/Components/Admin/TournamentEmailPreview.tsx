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
  { id: "p1", name: "Smash-Sara" },
  { id: "p2", name: "Volley-Viktor" },
  { id: "p3", name: "Lobb-Lina" },
  { id: "p4", name: "Serve-Simon" },
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
  participants: { id: string; name: string }[];
}) => {
  // Note for non-coders: we keep this HTML builder in the preview so the design matches the real email template.
  const resolveName = (id: string | null | undefined) =>
    participants.find(p => p.id === id)?.name || "Gästspelare";

  const winners = results.filter(entry => entry.rank === 1).map(entry => resolveName(entry.profile_id));
  const podium = results.slice(0, 3).map(entry => resolveName(entry.profile_id));
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

  return `
    <!doctype html>
    <html lang="sv">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Turneringssammanfattning</title>
      </head>
      <body style="margin:0; padding:0; background:#f4f4f4; color:#111; font-family: Arial, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4; padding:24px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background:#fff; border-radius:16px; padding:24px;">
                <tr>
                  <td style="padding-bottom:16px;">
                    <h1 style="margin:0; font-size:24px;">${tournament.name || "Turnering"}</h1>
                    <p style="margin:4px 0 0; color:#666;">${tournament.tournament_type || "mexicano"} • ${tournament.location || "Plats saknas"}</p>
                    <p style="margin:4px 0 0; color:#666;">Avslutad ${formatShortDate(tournament.completed_at || tournament.scheduled_at || "")}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 0; border-top:1px solid #eee;">
                    <h2 style="margin:0 0 8px; font-size:18px;">Vinnare</h2>
                    <p style="margin:0;">${winners.length ? winners.join(", ") : "Ingen vinnare registrerad"}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 0; border-top:1px solid #eee;">
                    <h2 style="margin:0 0 8px; font-size:18px;">Podium</h2>
                    <ol style="margin:0; padding-left:20px;">
                      ${podium.map(name => `<li>${name}</li>`).join("")}
                    </ol>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 0; border-top:1px solid #eee;">
                    <h2 style="margin:0 0 8px; font-size:18px;">Deltagare</h2>
                    <p style="margin:0;">${participants.map(p => p.name).join(", ") || "Inga deltagare registrerade"}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 0; border-top:1px solid #eee;">
                    <h2 style="margin:0 0 8px; font-size:18px;">Tabell</h2>
                    <table width="100%" cellpadding="6" cellspacing="0" style="border-collapse: collapse;">
                      <tr style="background:#f7f7f7;">
                        <th align="left">Placering</th>
                        <th align="left">Spelare</th>
                        <th align="center">Vinster</th>
                        <th align="center">För</th>
                        <th align="center">Mot</th>
                      </tr>
                      ${results.map(entry => `
                        <tr>
                          <td>${entry.rank}</td>
                          <td>${resolveName(entry.profile_id)}</td>
                          <td align="center">${entry.wins}</td>
                          <td align="center">${entry.points_for}</td>
                          <td align="center">${entry.points_against}</td>
                        </tr>
                      `).join("")}
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 0; border-top:1px solid #eee;">
                    <h2 style="margin:0 0 8px; font-size:18px;">Matcher</h2>
                    ${matchRows.length ? matchRows.map(match => `
                      <p style="margin:0 0 6px;"><strong>${match.label}:</strong> ${match.matchup} (${match.score})</p>
                    `).join("") : `<p style="margin:0;">Inga matcher registrerade.</p>`}
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
      if (id === GUEST_ID) return { id, name: "Gästspelare" };
      // Note for non-coders: we look up names from profiles so the email shows real player names.
      const profile = profiles.find(p => p.id === id);
      return { id, name: profile?.name || "Gästspelare" };
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
            <Typography color="text.secondary">Klicka på \"generera förhandsgranskning\" för att visa mailet.</Typography>
          </Paper>
        )}
      </Paper>
    </Box>
  );
}
