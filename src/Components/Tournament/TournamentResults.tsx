import React from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Stack,
  Divider,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
} from "@mui/material";
import { Share as ShareIcon } from "@mui/icons-material";
import { formatDate, formatScore } from "../../utils/format";
import { getIdDisplayName, idsToNames } from "../../utils/profileMap";

interface TournamentResultsProps {
  activeTournament: any;
  sortedStandings: any[];
  rounds: any[];
  profileMap: Map<string, any>;
  onShare: () => void;
  onBack: () => void;
  canShareResults: boolean;
  isMobile: boolean;
}

export default function TournamentResults({
  activeTournament,
  sortedStandings,
  rounds,
  profileMap,
  onShare,
  onBack,
  canShareResults,
  isMobile,
}: TournamentResultsProps) {
  if (!activeTournament || activeTournament.status !== "completed") {
    return (
      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent>
          <Typography variant="body2" color="text.secondary">
            Slutför en turnering för att se resultat här.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <CardContent>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
          Resultat
        </Typography>
        <Typography variant="body2" sx={{ mb: 3 }}>
          <strong>{activeTournament.name}</strong> slutfördes {formatDate(activeTournament.completed_at)}.
        </Typography>

        <Grid container spacing={2} sx={{ mb: 4 }}>
          {sortedStandings.slice(0, 3).map((res, i) => (
            <Grid key={res.id} size={{ xs: 12, sm: 4 }}>
              <Paper
                sx={{
                  p: 2,
                  textAlign: "center",
                  bgcolor: i === 0 ? "primary.light" : "background.paper",
                  color: i === 0 ? "primary.contrastText" : "text.primary",
                  border: 1,
                  borderColor: "divider",
                }}
              >
                <Typography variant="h4" sx={{ fontWeight: 900 }}>
                  {i + 1}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {getIdDisplayName(res.id, profileMap)}
                </Typography>
                <Typography variant="body2">{res.totalPoints} poäng</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        <TableContainer component={Paper} variant="outlined" sx={{ mb: 4, borderRadius: 2, overflow: "auto" }}>
          <Table size="small" sx={{ minWidth: isMobile ? 520 : 680 }}>
            <TableHead sx={{ bgcolor: "grey.50" }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Plac.</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Namn</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">
                  Poäng
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">
                  Matcher
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">
                  V/O/F
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">
                  Diff
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">
                  Snitt
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedStandings.map((res, i) => (
                <TableRow key={res.id} hover>
                  <TableCell sx={{ fontWeight: 700 }}>{i + 1}</TableCell>
                  <TableCell>{getIdDisplayName(res.id, profileMap)}</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>
                    {res.totalPoints}
                  </TableCell>
                  <TableCell align="center">{res.gamesPlayed}</TableCell>
                  <TableCell align="center">
                    {res.wins}/{res.ties}/{res.losses}
                  </TableCell>
                  <TableCell align="center">{res.pointsFor - res.pointsAgainst}</TableCell>
                  <TableCell align="center">
                    {(res.totalPoints / (res.gamesPlayed || 1)).toFixed(1)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Divider sx={{ mb: 3 }} />

        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          Matchresultat
        </Typography>
        <Stack spacing={1}>
          {rounds.map((round) => (
            <Paper
              key={round.id}
              variant="outlined"
              sx={{ p: 1.5, display: "flex", justifyContent: "space-between", alignItems: "center" }}
            >
              <Typography variant="caption" sx={{ fontWeight: 800 }}>
                Rond {round.round_number}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, textAlign: "right" }}>
                {idsToNames(round.team1_ids, profileMap).join(" & ")}
                <Chip
                  label={formatScore(round.team1_score ?? 0, round.team2_score ?? 0)}
                  size="small"
                  sx={{ mx: 2, fontWeight: 800 }}
                />
                {idsToNames(round.team2_ids, profileMap).join(" & ")}
              </Typography>
            </Paper>
          ))}
        </Stack>

        <Stack direction="row" spacing={2} sx={{ mt: 4 }}>
          <Button variant="outlined" fullWidth onClick={onBack}>
            Tillbaka
          </Button>
          <Tooltip
            title={canShareResults ? "" : "Spara resultat först"}
            disableHoverListener={canShareResults}
          >
            <span>
              <Button
                variant="contained"
                fullWidth
                startIcon={<ShareIcon />}
                onClick={onShare}
                disabled={!canShareResults}
              >
                Dela resultat
              </Button>
            </span>
          </Tooltip>
        </Stack>
      </CardContent>
    </Card>
  );
}
