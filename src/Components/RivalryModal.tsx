import React, { useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  Box,
  Stack,
  Divider,
  IconButton,
  AvatarGroup,
  Chip
} from "@mui/material";
import { Close as CloseIcon, TrendingUp, TrendingDown, People } from "@mui/icons-material";
import Avatar from "./Avatar";
import { Match, PlayerStats } from "../types";
import { getStoredAvatar } from "../utils/avatar";

interface RivalryModalProps {
  open: boolean;
  onClose: () => void;
  currentUser: any;
  selectedPlayer: PlayerStats;
  matches: Match[];
}

export default function RivalryModal({
  open,
  onClose,
  currentUser,
  selectedPlayer,
  matches
}: RivalryModalProps) {
  const h2hStats = useMemo(() => {
    if (!currentUser || !selectedPlayer || !matches.length) return null;

    let vsMatches = 0;
    let userWins = 0;
    let playerWins = 0;
    const last5Vs: ("W" | "L")[] = [];

    let togetherMatches = 0;
    let togetherWins = 0;

    // Process matches to find those where both participated
    for (let i = matches.length - 1; i >= 0; i--) {
      const m = matches[i];
      const userInT1 = m.team1_ids.includes(currentUser.id);
      const userInT2 = m.team2_ids.includes(currentUser.id);
      const playerInT1 = m.team1_ids.includes(selectedPlayer.id);
      const playerInT2 = m.team2_ids.includes(selectedPlayer.id);

      if ((userInT1 || userInT2) && (playerInT1 || playerInT2)) {
        const team1Won = m.team1_sets > m.team2_sets;

        if ((userInT1 && playerInT2) || (userInT2 && playerInT1)) {
          // Opponents
          vsMatches++;
          const userWon = (userInT1 && team1Won) || (userInT2 && !team1Won);
          if (userWon) userWins++; else playerWins++;
          last5Vs.push(userWon ? "W" : "L");
        } else {
          // Partners
          togetherMatches++;
          const togetherWon = (userInT1 && team1Won) || (userInT2 && !team1Won);
          if (togetherWon) togetherWins++;
        }
      }
    }

    return {
      vsMatches,
      userWins,
      playerWins,
      last5Vs: last5Vs.slice(-5).reverse(),
      togetherMatches,
      togetherWins
    };
  }, [currentUser, selectedPlayer, matches]);

  if (!h2hStats) return null;

  const winRate = h2hStats.vsMatches > 0
    ? Math.round((h2hStats.userWins / h2hStats.vsMatches) * 100)
    : 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
      <DialogTitle sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>Rivalitet</Typography>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ px: 2, pb: 4 }}>
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="center" sx={{ mb: 4, mt: 1 }}>
          <Stack alignItems="center" spacing={1} sx={{ flex: 1 }}>
            <Avatar
              src={currentUser.avatar_url || getStoredAvatar(currentUser.id)}
              name={currentUser.name}
              sx={{ width: 64, height: 64, border: '3px solid', borderColor: 'primary.main' }}
            />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, textAlign: 'center' }}>Du</Typography>
          </Stack>

          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h4" sx={{ fontWeight: 900, color: 'text.secondary', opacity: 0.3 }}>VS</Typography>
          </Box>

          <Stack alignItems="center" spacing={1} sx={{ flex: 1 }}>
            <Avatar
              src={selectedPlayer.avatarUrl || getStoredAvatar(selectedPlayer.id)}
              name={selectedPlayer.name}
              sx={{ width: 64, height: 64, border: '3px solid', borderColor: 'grey.300' }}
            />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, textAlign: 'center' }}>{selectedPlayer.name.split(' ')[0]}</Typography>
          </Stack>
        </Stack>

        <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 3, mb: 3 }}>
          <Typography variant="overline" sx={{ fontWeight: 800, color: 'text.secondary', display: 'block', mb: 1, textAlign: 'center' }}>
            Inbördes möten
          </Typography>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box sx={{ textAlign: 'left' }}>
              <Typography variant="h5" sx={{ fontWeight: 900, color: 'primary.main' }}>{h2hStats.userWins}</Typography>
              <Typography variant="caption" sx={{ fontWeight: 700 }}>Dina vinster</Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>{h2hStats.vsMatches}</Typography>
              <Typography variant="caption" sx={{ display: 'block' }}>Matcher</Typography>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="h5" sx={{ fontWeight: 900 }}>{h2hStats.playerWins}</Typography>
              <Typography variant="caption" sx={{ fontWeight: 700 }}>Motståndarens</Typography>
            </Box>
          </Stack>

          <Box sx={{ mt: 2, height: 8, bgcolor: 'grey.200', borderRadius: 4, overflow: 'hidden', display: 'flex' }}>
            <Box sx={{ width: `${winRate}%`, bgcolor: 'primary.main', height: '100%' }} />
            <Box sx={{ flex: 1, bgcolor: 'grey.400', height: '100%' }} />
          </Box>
        </Box>

        <Stack spacing={2}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <TrendingUp fontSize="small" color="action" />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>Senaste möten</Typography>
            </Stack>
            <Stack direction="row" spacing={0.5}>
              {h2hStats.last5Vs.length > 0 ? h2hStats.last5Vs.map((res, i) => (
                <Chip
                  key={i}
                  label={res === 'W' ? 'V' : 'F'}
                  size="small"
                  color={res === 'W' ? 'success' : 'error'}
                  sx={{ width: 24, height: 24, '& .MuiChip-label': { px: 0, fontWeight: 900, fontSize: '0.65rem' } }}
                />
              )) : <Typography variant="caption" color="text.secondary">—</Typography>}
            </Stack>
          </Box>

          <Divider />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <People fontSize="small" color="action" />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>Som partners</Typography>
            </Stack>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {h2hStats.togetherWins} vinst / {h2hStats.togetherMatches} matcher
            </Typography>
          </Box>
        </Stack>

        {h2hStats.vsMatches === 0 && h2hStats.togetherMatches === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', fontStyle: 'italic', mt: 2 }}>
            Ni har inte spelat med eller mot varandra ännu.
          </Typography>
        )}
      </DialogContent>
    </Dialog>
  );
}
