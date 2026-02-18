import {
  Box,
  Typography,
  Button,
  Grid,
  Avatar,
  Chip,
  Paper,
  IconButton,
  Divider,
  Tooltip,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  Close as CloseIcon,
  Groups as GroupsIcon,
  Share as ShareIcon,
} from "@mui/icons-material";
import ProfileName from "../ProfileName";
import MatchSuccessCeremony from "../MatchSuccessCeremony";
import { MatchRecap, EveningRecap, EveningRecapLeader } from "../../types";

interface RecapViewProps {
  recapMode: string;
  setRecapMode: (mode: string) => void;
  matchRecap: MatchRecap | null;
  eveningRecap: EveningRecap | null;
  isCeremonyActive: boolean;
  setIsCeremonyActive: (active: boolean) => void;
  setShowRecap: (show: boolean) => void;
  setShareOpen: (open: boolean) => void;
  mode: "1v1" | "2v2";
  getBadgeIdForName: (name: string) => string | null;
}

export default function RecapView({
  recapMode,
  setRecapMode,
  matchRecap,
  eveningRecap,
  isCeremonyActive,
  setIsCeremonyActive,
  setShowRecap,
  setShareOpen,
  mode,
  getBadgeIdForName,
}: RecapViewProps) {
  return (
    <Paper
      elevation={3}
      sx={{
        p: { xs: 2, sm: 3 },
        borderRadius: 4,
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Avatar
            src="/icon-192.png"
            variant="rounded"
            sx={{
              width: 48,
              height: 48,
              border: "1px solid",
              borderColor: "divider",
            }}
          />
          <Box>
            <Typography variant="subtitle1" fontWeight={800}>
              {recapMode === "evening" ? "Kvällsrecap" : "Match‑recap"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Redo att dela höjdpunkter.
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Tooltip title="Visa kvällens sammanfattning">
            <Button
              variant={recapMode === "evening" ? "contained" : "outlined"}
              size="small"
              onClick={() => {
                setRecapMode("evening");
                setIsCeremonyActive(false);
              }}
              disabled={!eveningRecap}
              aria-pressed={recapMode === "evening"}
            >
              Kväll
            </Button>
          </Tooltip>
          <Tooltip title="Visa denna match-recap">
            <Button
              variant={recapMode === "match" ? "contained" : "outlined"}
              size="small"
              onClick={() => setRecapMode("match")}
              disabled={!matchRecap}
              aria-pressed={recapMode === "match"}
            >
              Match
            </Button>
          </Tooltip>
          {(recapMode === "evening" || !isCeremonyActive) && (
            <IconButton
              size="small"
              onClick={() => {
                setShowRecap(false);
                setIsCeremonyActive(false);
              }}
              aria-label="Stäng"
            >
              <CloseIcon />
            </IconButton>
          )}
        </Box>
      </Box>

      <Divider />

      {isCeremonyActive && recapMode === "match" && matchRecap ? (
        <MatchSuccessCeremony recap={matchRecap} />
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {recapMode === "evening" && eveningRecap ? (
            <>
              {/* Note for non-coders: A softer background makes the recap text easier to read. */}
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  textAlign: "center",
                  bgcolor: (theme) => alpha(theme.palette.primary.light, 0.2),
                  color: "text.primary",
                }}
              >
                <Typography variant="h6" fontWeight={800}>
                  {eveningRecap.dateLabel}
                </Typography>
                <Typography variant="body2">
                  {eveningRecap.matches} matcher · {eveningRecap.totalSets} sets
                </Typography>
                <Box
                  sx={{
                    mt: 1,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <Chip
                    label="MVP"
                    color="success"
                    size="small"
                    sx={{ fontWeight: 800 }}
                  />
                  <ProfileName
                    name={eveningRecap.mvp?.name || "—"}
                    badgeId={getBadgeIdForName(eveningRecap.mvp?.name || "")}
                  />
                </Box>
              </Paper>
              <Box>
                <Typography
                  variant="subtitle2"
                  fontWeight={700}
                  gutterBottom
                  sx={{ display: "flex", alignItems: "center", gap: 1 }}
                >
                  <GroupsIcon fontSize="small" /> Topp vinster
                </Typography>
                <Box component="ul" sx={{ display: "flex", flexDirection: "column", gap: 1, p: 0, m: 0, listStyle: 'none' }}>
                  {eveningRecap.leaders.map((player: EveningRecapLeader) => (
                    <Paper
                      component="li"
                      key={player.id}
                      variant="outlined"
                      sx={{
                        px: 2,
                        py: 1,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <ProfileName
                        name={player.name}
                        badgeId={getBadgeIdForName(player.name)}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {player.wins} V · {player.games} M
                      </Typography>
                    </Paper>
                  ))}
                </Box>
              </Box>
            </>
          ) : null}

          {recapMode === "match" && matchRecap ? (
            <>
              <Paper
                variant="outlined"
                sx={{ p: 2, textAlign: "center", bgcolor: "grey.50" }}
              >
                <Typography variant="h4" fontWeight={900}>
                  {matchRecap.scoreline}
                </Typography>
                <Chip
                  label={
                    matchRecap.teamAWon
                      ? mode === "1v1"
                        ? "Vinst Spelare A"
                        : "Vinst Lag A"
                      : mode === "1v1"
                      ? "Vinst Spelare B"
                      : "Vinst Lag B"
                  }
                  color={matchRecap.teamAWon ? "success" : "warning"}
                  sx={{ fontWeight: 800, mt: 1 }}
                />
              </Paper>

              <Grid container spacing={2}>
                {[
                  {
                    title: mode === "1v1" ? "Spelare A" : "Lag A",
                    won: matchRecap.teamAWon,
                    players: matchRecap.teamA.players,
                  },
                  {
                    title: mode === "1v1" ? "Spelare B" : "Lag B",
                    won: !matchRecap.teamAWon,
                    players: matchRecap.teamB.players,
                  },
                ].map((team, idx) => (
                  <Grid key={idx} size={{ xs: 12, sm: 6 }}>
                    <Paper variant="outlined" sx={{ p: 1.5 }}>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          mb: 1,
                        }}
                      >
                        <Typography variant="subtitle2" fontWeight={800}>
                          {team.title}
                        </Typography>
                        <Chip
                          label={team.won ? "Vinst" : "Förlust"}
                          size="small"
                          color={team.won ? "success" : "error"}
                          variant="outlined"
                        />
                      </Box>
                      {team.players.map((player: any) => (
                        <Box
                          key={player.id}
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            mb: 0.5,
                          }}
                        >
                          <ProfileName
                            name={player.name}
                            badgeId={getBadgeIdForName(player.name)}
                          />
                          <Typography
                            variant="caption"
                            sx={{ fontWeight: 600 }}
                          >
                            {player.delta >= 0 ? "+" : ""}
                            {player.delta}
                          </Typography>
                        </Box>
                      ))}
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </>
          ) : null}
        </Box>
      )}

      <Divider />

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {recapMode === "match" && matchRecap && (
          <Typography variant="caption" color="text.secondary" align="center">
            Fairness: {matchRecap.fairness}% ·{" "}
            {mode === "1v1" ? "Vinstchans A" : "Vinstchans Lag A"}:{" "}
            {Math.round(matchRecap.winProbability * 100)}%
          </Typography>
        )}
        <Tooltip title="Exportera resultatet som en bild för att dela" arrow>
          <Button
            variant="contained"
            fullWidth
            size="large"
            startIcon={<ShareIcon />}
            onClick={() => setShareOpen(true)}
            sx={{ py: 1.5, borderRadius: 2, fontWeight: 700 }}
          >
            Dela recap
          </Button>
        </Tooltip>
      </Box>
    </Paper>
  );
}
