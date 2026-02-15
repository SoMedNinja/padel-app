import React, { useState } from 'react';
import { Box, Typography, Collapse, IconButton, Stack, Paper } from '@mui/material';
import {
  KeyboardArrowDown as ExpandMoreIcon,
  KeyboardArrowUp as ExpandLessIcon,
  InfoOutlined as InfoIcon,
  EmojiEvents as TrophyIcon,
  WarningAmber as WarningIcon
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';

interface EloBreakdownProps {
  explanation: string;
}

export default function EloBreakdown({ explanation }: EloBreakdownProps) {
  const [expanded, setExpanded] = useState(false);

  if (!explanation) return null;

  const lines = explanation.split('\n');

  return (
    <Box sx={{ mt: 1 }}>
      <Box
        onClick={() => setExpanded(!expanded)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          cursor: 'pointer',
          color: 'primary.main',
          '&:hover': { opacity: 0.8 }
        }}
      >
        <InfoIcon sx={{ fontSize: '0.9rem' }} />
        <Typography variant="caption" sx={{ fontWeight: 800 }}>
          Varför ändrades min ELO?
        </Typography>
        {expanded ? <ExpandLessIcon sx={{ fontSize: '1rem' }} /> : <ExpandMoreIcon sx={{ fontSize: '1rem' }} />}
      </Box>

      <Collapse in={expanded}>
        <Paper
          variant="outlined"
          sx={{
            mt: 1,
            p: 1.5,
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
            borderColor: (theme) => alpha(theme.palette.primary.main, 0.1),
            borderRadius: 2
          }}
        >
          <Stack spacing={1}>
            {lines.map((line, idx) => {
              const isBonus = line.includes('💪');
              const isWarning = line.includes('⚠️');

              return (
                <Box key={idx} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                  {!isBonus && !isWarning && <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: 'primary.main', mt: 0.8, flexShrink: 0 }} />}
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: '0.7rem',
                      fontWeight: (isBonus || isWarning) ? 800 : 500,
                      color: isBonus ? 'success.main' : isWarning ? 'warning.main' : 'text.primary',
                      lineHeight: 1.3
                    }}
                  >
                    {line}
                  </Typography>
                </Box>
              );
            })}
          </Stack>
        </Paper>
      </Collapse>
    </Box>
  );
}
