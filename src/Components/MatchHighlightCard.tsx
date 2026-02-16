import React, { useState } from "react";
import { Box, Typography, IconButton, Paper, Stack, Tooltip } from "@mui/material";
import { Close, Star, TrendingUp, LocalFireDepartment, Groups, Share } from "@mui/icons-material";
import { MatchHighlight } from "../utils/highlights";
import { Match } from "../types";
import TheShareable from "./Shared/TheShareable";

interface MatchHighlightCardProps {
  highlight: MatchHighlight;
  match: Match;
  onDismiss: () => void;
  deltas?: Record<string, number>;
}

const getIcon = (reason: MatchHighlight['reason']) => {
  switch (reason) {
    case 'upset': return <TrendingUp sx={{ color: '#ff9800' }} />;
    case 'thriller': return <LocalFireDepartment sx={{ color: '#f44336' }} />;
    case 'crush': return <Star sx={{ color: '#4caf50' }} />;
    case 'titans': return <Groups sx={{ color: '#2196f3' }} />;
    default: return <Star />;
  }
};

const getBackgroundColor = (reason: MatchHighlight['reason']) => {
  switch (reason) {
    case 'upset': return 'rgba(255, 152, 0, 0.08)';
    case 'thriller': return 'rgba(244, 67, 54, 0.08)';
    case 'crush': return 'rgba(76, 175, 80, 0.08)';
    case 'titans': return 'rgba(33, 150, 243, 0.08)';
    default: return 'rgba(255, 255, 255, 0.05)';
  }
};

export default function MatchHighlightCard({ highlight, match, onDismiss, deltas }: MatchHighlightCardProps) {
  const [shareOpen, setShareOpen] = useState(false);
  const team1 = Array.isArray(match.team1) ? match.team1.join(' & ') : match.team1;
  const team2 = Array.isArray(match.team2) ? match.team2.join(' & ') : match.team2;

  return (
    <>
    <Paper
      elevation={0}
      role="article"
      aria-label={`Matchhöjdpunkt: ${highlight.title}. ${highlight.description} ${team1} mot ${team2}, resultat ${match.team1_sets}–${match.team2_sets}`}
      sx={{
        p: 2,
        mb: 2,
        borderRadius: '16px',
        backgroundColor: getBackgroundColor(highlight.reason),
        border: '1px solid rgba(255, 255, 255, 0.1)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Stack
        direction="row"
        spacing={0.5}
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 1
        }}
      >
        <Tooltip title="Dela">
          <IconButton
            size="small"
            onClick={() => setShareOpen(true)}
            aria-label="Dela match-höjdpunkt"
            sx={{
              opacity: 0.6,
              '&:hover': { opacity: 1 }
            }}
          >
            <Share fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Stäng">
          <IconButton
            size="small"
            onClick={onDismiss}
            aria-label="Stäng höjdpunkt"
            sx={{
              opacity: 0.6,
              '&:hover': { opacity: 1 }
            }}
          >
            <Close fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>

      <Stack direction="row" spacing={2} alignItems="center">
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 48,
            height: 48,
            borderRadius: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          }}
        >
          {getIcon(highlight.reason)}
        </Box>

        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main', mb: 0.5 }}>
            {highlight.title}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
            {highlight.description}
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.7 }}>
            {team1} vs {team2} • {match.team1_sets}-{match.team2_sets}
          </Typography>
        </Box>
      </Stack>
    </Paper>

    <TheShareable
      open={shareOpen}
      onClose={() => setShareOpen(false)}
      type="match"
      data={{ match, highlight, deltas }}
    />
    </>
  );
}
