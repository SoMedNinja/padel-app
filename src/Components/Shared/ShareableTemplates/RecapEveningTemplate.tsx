import React from 'react';
import { Box, Typography, Stack, Grid, Paper } from '@mui/material';
import { GSLogo } from './GSLogo';

export const RecapEveningTemplate = ({ data, variant = 0 }: { data: any; variant?: number }) => {
  const themes = [
    { bg: 'linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)', color: 'white', accent: '#00d2ff', font: 'Inter' }, // Classic
    { bg: '#0f172a', color: 'white', accent: '#38ef7d', font: 'Inter' }, // Dashboard
    { bg: '#f5f5f5', color: '#1a1a1a', accent: '#d32f2f', font: 'Inter' }, // Facts
    { bg: 'white', color: '#1a1a1a', accent: '#1a1a1a', font: 'Playfair Display', border: '40px solid #f5f5f5' }, // Magazine
    { bg: 'linear-gradient(45deg, #f12711, #f5af19)', color: 'white', accent: '#fff', font: 'Inter' }, // Fire
  ];

  const theme = themes[variant % themes.length] || themes[0];
  const isFacts = variant === 2;
  const isMagazine = variant === 3;

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        background: theme?.bg || '#fff',
        color: theme?.color || '#000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 6,
        textAlign: 'center',
        position: 'relative',
        fontFamily: theme?.font || 'inherit',
        border: theme?.border || 'none'
      }}
    >
      {isMagazine ? (
        <Box sx={{ width: '100%', height: '100%', textAlign: 'left', p: 4, display: 'flex', flexDirection: 'column' }}>
           <Typography variant="h1" sx={{ fontWeight: 900, fontSize: 120, mb: 2, textTransform: 'uppercase' }}>{data?.dateLabel || 'Recap'}</Typography>
           <Typography variant="h4" sx={{ fontWeight: 500, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.1em', mb: 8 }}>Kvällens sammanfattning</Typography>

           <Grid container spacing={4}>
              <Grid size={{ xs: 6 }}>
                <Typography variant="h5" sx={{ fontWeight: 800, textTransform: 'uppercase', mb: 2, color: theme?.accent || 'primary.main' }}>Mästaren</Typography>
                <Typography variant="h2" sx={{ fontWeight: 900 }}>{data?.mvp?.name || '—'}</Typography>
                <Typography variant="h4" sx={{ opacity: 0.6 }}>{data?.mvp?.wins ?? 0} vinster</Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant="h5" sx={{ fontWeight: 800, textTransform: 'uppercase', mb: 2, color: theme?.accent || 'primary.main' }}>Statistik</Typography>
                <Typography variant="h3" sx={{ fontWeight: 800 }}>{data?.matches ?? 0} Matcher</Typography>
                <Typography variant="h3" sx={{ fontWeight: 800 }}>{data?.totalSets ?? 0} Sets</Typography>
              </Grid>
           </Grid>

           <Box sx={{ mt: 'auto', borderTop: '4px solid black', pt: 4 }}>
             <Typography variant="h4" sx={{ fontWeight: 800, textTransform: 'uppercase', mb: 2 }}>Fun Facts</Typography>
             <Stack direction="row" spacing={4}>
                <Box>
                   <Typography variant="body1" sx={{ opacity: 0.6 }}>Mest rotationer</Typography>
                   <Typography variant="h5" sx={{ fontWeight: 800 }}>{data?.funFacts?.mostRotations?.[0]?.name || '—'}</Typography>
                </Box>
                <Box>
                   <Typography variant="body1" sx={{ opacity: 0.6 }}>Starkast ikväll</Typography>
                   <Typography variant="h5" sx={{ fontWeight: 800 }}>{data?.funFacts?.strongest?.[0]?.name || '—'}</Typography>
                </Box>
             </Stack>
           </Box>
        </Box>
      ) : isFacts ? (
        <Stack spacing={4} sx={{ width: '100%' }}>
          <Typography variant="h2" sx={{ fontWeight: 900, textTransform: 'uppercase', color: theme?.accent || 'inherit' }}>Highlights</Typography>

          <Grid container spacing={3}>
             <Grid size={{ xs: 12 }}>
                <Paper sx={{ p: 4, borderRadius: 4, textAlign: 'center', bgcolor: 'white' }}>
                   <Typography variant="h6" sx={{ opacity: 0.6, fontWeight: 800 }}>KVÄLLENS MVP</Typography>
                   <Typography variant="h2" sx={{ fontWeight: 900, color: theme?.accent || 'primary.main' }}>{data?.mvp?.name || '—'}</Typography>
                   <Typography variant="h4" sx={{ fontWeight: 700 }}>{data?.mvp?.wins ?? 0} Vinster • {Math.round((data?.mvp?.winRate || 0) * 100)}% Winrate</Typography>
                </Paper>
             </Grid>
             <Grid size={{ xs: 6 }}>
                <Paper sx={{ p: 3, borderRadius: 4, bgcolor: 'white', height: '100%' }}>
                   <Typography variant="h6" sx={{ opacity: 0.6, fontWeight: 800 }}>MEST ROTATIONER</Typography>
                   {data?.funFacts?.mostRotations?.slice(0, 3).map((p: any, i: number) => (
                     <Box key={p?.id || i} sx={{ mb: 1, textAlign: 'left' }}>
                        <Typography variant="h5" sx={{ fontWeight: 700 }}>{i+1}. {p?.name || '—'}</Typography>
                        <Typography variant="body2">{p?.rotations ?? 0} olika partners</Typography>
                     </Box>
                   ))}
                </Paper>
             </Grid>
             <Grid size={{ xs: 6 }}>
                <Paper sx={{ p: 3, borderRadius: 4, bgcolor: 'white', height: '100%' }}>
                   <Typography variant="h6" sx={{ opacity: 0.6, fontWeight: 800 }}>STARKAST</Typography>
                   {data?.funFacts?.strongest?.slice(0, 3).map((p: any, i: number) => (
                     <Box key={p?.id || i} sx={{ mb: 1, textAlign: 'left' }}>
                        <Typography variant="h5" sx={{ fontWeight: 700 }}>{i+1}. {p?.name || '—'}</Typography>
                        <Typography variant="body2">{Math.round((p?.winRate || 0) * 100)}% Winrate</Typography>
                     </Box>
                   ))}
                </Paper>
             </Grid>
             {data?.funFacts?.marathon && (
               <Grid size={{ xs: 12 }}>
                 <Paper sx={{ p: 2, borderRadius: 4, bgcolor: theme?.accent || '#000', color: 'white' }}>
                    <Typography variant="h5" sx={{ fontWeight: 900 }}>MARATON-KAMPEN</Typography>
                    <Typography variant="h4">{data?.funFacts?.marathon?.name || '—'} spelade flest set ({data?.funFacts?.marathon?.sets || 0})</Typography>
                 </Paper>
               </Grid>
             )}
          </Grid>
          <Typography variant="h6" sx={{ fontWeight: 800, opacity: 0.4 }}>{data?.dateLabel || '—'}</Typography>
        </Stack>
      ) : (
        <Stack spacing={6} alignItems="center" sx={{ width: '100%', zIndex: 1 }}>
          <GSLogo />
          <Box>
            <Typography variant="h2" sx={{ fontWeight: 900, textTransform: 'uppercase', mb: 1, color: theme?.accent || 'inherit' }}>
              Kvällsrecap
            </Typography>
            <Typography variant="h4" sx={{ opacity: 0.9, fontWeight: 700 }}>{data?.dateLabel || '—'}</Typography>
          </Box>

          <Stack direction="row" spacing={8}>
            <Box>
              <Typography variant="h1" sx={{ fontWeight: 900 }}>{data?.matches ?? 0}</Typography>
              <Typography variant="h5" sx={{ opacity: 0.7, fontWeight: 800 }}>MATCHER</Typography>
            </Box>
            <Box>
              <Typography variant="h1" sx={{ fontWeight: 900 }}>{data?.totalSets ?? 0}</Typography>
              <Typography variant="h5" sx={{ opacity: 0.7, fontWeight: 800 }}>SETS</Typography>
            </Box>
          </Stack>

          <Box sx={{
            bgcolor: 'white',
            color: '#1a237e',
            p: 6,
            borderRadius: 4,
            width: '85%',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <Typography variant="h4" sx={{ fontWeight: 800, opacity: 0.6, mb: 1, textTransform: 'uppercase' }}>Kvällens MVP</Typography>
            <Typography variant="h1" sx={{ fontWeight: 900 }}>
              {data?.mvp?.name || '—'}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, opacity: 0.7 }}>
              {data?.mvp?.wins ?? 0} Vinster • {Math.round((data?.mvp?.winRate || 0) * 100)}% Vinstprocent
            </Typography>
          </Box>

          <Box sx={{ width: '100%' }}>
            <Typography variant="h4" sx={{ fontWeight: 800, mb: 3, opacity: 0.6, textTransform: 'uppercase' }}>Topplista vinster</Typography>
            <Stack direction="row" spacing={4} justifyContent="center">
               {data?.leaders?.slice(0, 3).map((p: any, i: number) => (
                 <Box key={p?.id || i} sx={{ minWidth: 150 }}>
                   <Typography variant="h3" sx={{ fontWeight: 900, color: theme?.accent || 'inherit' }}>{p?.wins ?? 0} V</Typography>
                   <Typography variant="h5" sx={{ fontWeight: 700 }}>{p?.name || '—'}</Typography>
                 </Box>
               ))}
            </Stack>
          </Box>
        </Stack>
      )}
    </Box>
  );
};
