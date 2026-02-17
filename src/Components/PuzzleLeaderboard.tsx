import { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Typography,
} from "@mui/material";
import { EmojiEvents as TrophyIcon } from "@mui/icons-material";
import { puzzleScoreService, type PuzzleLeaderboardEntry } from "../services/puzzleScoreService";
import { useStore } from "../store/useStore";
import Avatar from "./Avatar";

export default function PuzzleLeaderboard() {
  const { user } = useStore();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<PuzzleLeaderboardEntry[]>([]);

  useEffect(() => {
    puzzleScoreService
      .getLeaderboard(50)
      .then(setEntries)
      .catch((err) => console.error("Failed to load leaderboard", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (entries.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Typography color="text.secondary">Inga resultat ännu.</Typography>
      </Box>
    );
  }

  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <CardContent sx={{ p: 0 }}>
        <Box sx={{ p: 2, bgcolor: "action.hover", borderBottom: 1, borderColor: "divider" }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Topplista
          </Typography>
        </Box>
        <List disablePadding>
          {entries.map((entry, index) => {
            const rank = index + 1;
            const isMe = entry.userId === user?.id;
            let iconColor = "action.disabled";
            if (rank === 1) iconColor = "#FFD700"; // Gold
            else if (rank === 2) iconColor = "#C0C0C0"; // Silver
            else if (rank === 3) iconColor = "#CD7F32"; // Bronze

            return (
              <ListItem
                key={entry.userId}
                divider={index < entries.length - 1}
                sx={{
                  bgcolor: isMe ? (theme) => theme.palette.action.selected : "inherit",
                }}
              >
                <Box
                  sx={{
                    minWidth: 32,
                    display: "flex",
                    justifyContent: "center",
                    mr: 2,
                    color: "text.secondary",
                    fontWeight: 600,
                  }}
                >
                  {rank <= 3 ? <TrophyIcon sx={{ color: iconColor }} /> : rank}
                </Box>
                <ListItemAvatar>
                  <Avatar name={entry.name} src={entry.avatarUrl} size={40} />
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography variant="subtitle2" sx={{ fontWeight: isMe ? 700 : 500 }}>
                      {entry.name} {isMe && "(Du)"}
                    </Typography>
                  }
                />
                <Typography variant="h6" sx={{ fontWeight: 700, color: "primary.main" }}>
                  {entry.score}
                </Typography>
              </ListItem>
            );
          })}
        </List>
      </CardContent>
    </Card>
  );
}
