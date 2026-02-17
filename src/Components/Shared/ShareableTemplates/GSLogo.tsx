import React from 'react';
import { Box } from '@mui/material';

const LOGO_BOX_SIZE = 80;

// Note for non-coders: we use flex here because it exports more reliably than CSS grid in saved images.
export const GSLogo = () => (
  <Box
    sx={{
      width: LOGO_BOX_SIZE,
      height: LOGO_BOX_SIZE,
      borderRadius: 3,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(140deg, #b71c1c, #ff8f00)',
      color: '#fff',
      fontWeight: 900,
      fontSize: 32,
      lineHeight: 1,
      letterSpacing: '0.08em',
      boxShadow: '0 12px 24px rgba(183, 28, 28, 0.3)',
    }}
  >
    GS
  </Box>
);
