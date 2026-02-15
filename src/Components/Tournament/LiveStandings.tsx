import React from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Stack,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import TournamentBracket from "../TournamentBracket";
import { getIdDisplayName, getTournamentStatusLabel } from "../../utils/profileMap";

interface LiveStandingsProps {
  activeTournament: any;
  rounds: any[];
  sortedStandings: any[];
  profileMap: Map<string, any>;
  participants: string[];
}

export default function LiveStandings({
  activeTournament,
  rounds,
  sortedStandings,
  profileMap,
  participants,
}: LiveStandingsProps) {
  if (!activeTournament) {
    return (
      <Typography variant="body2" color="text.secondary">
        Välj en turnering för att se liveuppdateringar.
      </Typography>
    );
  }

  return (
    <Stack spacing={3}>
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Live view
          </Typography>
          {activeTournament.status === "in_progress" || activeTournament.status === "completed" ? (
            <TournamentBracket
              rounds={rounds}
              profileMap={profileMap}
              activeTournament={activeTournament}
            />
          ) : (
            <Typography variant="body2" color="text.secondary">
              Starta en turnering för att se liveuppdateringar.
            </Typography>
          )}
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Turneringsöversikt
              </Typography>
              <Stack spacing={2}>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Chip label={activeTournament.name} sx={{ fontWeight: 700 }} />
                  <Chip label={getTournamentStatusLabel(activeTournament.status)} color="primary" />
                  <Chip
                    label={
                      activeTournament.tournament_type === "americano" ? "Americano" : "Mexicano"
                    }
                  />
                  <Chip label={`${participants.length} spelare`} />
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {activeTournament.location
                    ? `Plats: ${activeTournament.location}`
                    : "Ingen plats angiven."}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Topplista (snabb vy)
              </Typography>
              {sortedStandings.length ? (
                <Stack spacing={1}>
                  {sortedStandings.slice(0, 5).map((res, index) => (
                    <Box
                      key={res.id}
                      sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {index + 1}. {getIdDisplayName(res.id, profileMap)}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {res.totalPoints}p
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Inga resultat ännu.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}
