import React, { useState } from 'react';
import { idsToNames } from '../utils/profileMap';
import { Profile, TournamentRound } from '../types';
import { Box, Typography, Paper, Stack, IconButton, Tooltip } from '@mui/material';
import {
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  RestartAlt as ResetIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';

interface TournamentBracketProps {
  rounds: TournamentRound[];
  profileMap: Map<string, Profile>;
  activeTournament?: any;
}

export default function TournamentBracket({ rounds, profileMap }: TournamentBracketProps) {
  const [zoom, setZoom] = useState(1);

  if (!rounds || rounds.length === 0) {
    return <Typography color="text.secondary">Inga ronder har skapats än.</Typography>;
  }

  const sortedRounds = [...rounds].sort((a, b) => a.round_number - b.round_number);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.5));
  const handleReset = () => setZoom(1);

  return (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>Turneringsöversikt</Typography>
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Zooma ut">
            <IconButton size="small" onClick={handleZoomOut} disabled={zoom <= 0.5} aria-label="Zooma ut">
              <ZoomOutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Återställ">
            <IconButton size="small" onClick={handleReset} disabled={zoom === 1} aria-label="Återställ zoom">
              <ResetIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Zooma in">
            <IconButton size="small" onClick={handleZoomIn} disabled={zoom >= 2} aria-label="Zooma in">
              <ZoomInIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      <Box
        role="region"
        aria-label="Turneringsschema"
        sx={{
          position: 'relative',
          overflow: 'auto',
          bgcolor: 'background.paper',
          borderRadius: 3,
          border: 1,
          borderColor: 'divider',
          p: 2,
          minHeight: 200,
          cursor: zoom !== 1 ? 'grab' : 'default',
          '&:active': { cursor: zoom !== 1 ? 'grabbing' : 'default' }
        }}
      >
        <motion.div
          animate={{ scale: zoom }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          style={{
            display: 'flex',
            gap: 16,
            transformOrigin: 'left center',
            width: 'max-content'
          }}
        >
        {sortedRounds.map((round) => {
          const isPlayed = round.team1_score !== null && round.team2_score !== null && round.team1_score !== undefined && round.team2_score !== undefined;
          const t1Won = isPlayed && (round.team1_score ?? 0) > (round.team2_score ?? 0);
          const t2Won = isPlayed && (round.team2_score ?? 0) > (round.team1_score ?? 0);
          const t1Names = idsToNames(round.team1_ids, profileMap).join(" & ");
          const t2Names = idsToNames(round.team2_ids, profileMap).join(" & ");

          const ariaLabel = isPlayed
            ? `Rond ${round.round_number}: ${t1Names} mot ${t2Names}, resultat ${round.team1_score}–${round.team2_score}`
            : `Rond ${round.round_number}: ${t1Names} mot ${t2Names}, ej spelad`;

          return (
            <Paper
              key={round.id}
              variant="outlined"
              aria-label={ariaLabel}
              sx={{
                minWidth: 240,
                p: 2,
                borderRadius: 3,
                bgcolor: isPlayed ? 'action.hover' : 'background.paper',
                flexShrink: 0
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5, color: 'primary.main' }}>
                Rond {round.round_number}
              </Typography>

              <Stack spacing={1}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ fontWeight: t1Won ? 900 : 600, maxWidth: 160, color: t1Won ? 'primary.main' : 'text.primary' }}>{t1Names}</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800, color: t1Won ? 'primary.main' : 'text.primary' }}>{round.team1_score ?? '-'}</Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" align="center" sx={{ display: 'block' }}>vs</Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ fontWeight: t2Won ? 900 : 600, maxWidth: 160, color: t2Won ? 'primary.main' : 'text.primary' }}>{t2Names}</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800, color: t2Won ? 'primary.main' : 'text.primary' }}>{round.team2_score ?? '-'}</Typography>
                </Box>
              </Stack>

              {round.resting_ids && round.resting_ids.length > 0 && (
                <Box sx={{ mt: 2, pt: 1, borderTop: 1, borderColor: 'divider' }}>
                  <Typography variant="caption" color="text.secondary">
                    <strong>Vilar: </strong>
                    {idsToNames(round.resting_ids, profileMap).join(", ")}
                  </Typography>
                </Box>
              )}
            </Paper>
          );
        })}
        </motion.div>
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        Använd reglagen eller scrolla för att se alla ronder.
      </Typography>
    </Box>
  );
}
