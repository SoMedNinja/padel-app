import React from 'react';
import { Box, Typography, Stack, Grid } from '@mui/material';
import { GSLogo } from './GSLogo';
import { safeFormatDate } from './utils';

export const RecapMatchTemplate = ({ data, variant = 0 }: { data: any; variant?: number }) => {
  // Recap data players should already be filtered in MatchForm.tsx createRecap
  const is1v1 = data?.teamA?.players?.length === 1 && data?.teamB?.players?.length === 1;
  const themes = [
    { bg: 'linear-gradient(135deg, #4b6cb7 0%, #182848 100%)', color: 'white', accent: '#00d2ff', font: 'Inter' }, // Classic
    { bg: '#fdfdfd', color: '#1a1a1a', accent: '#d32f2f', font: 'Inter', border: '2px solid #eee' }, // Stats Clean
    { bg: '#000', color: 'white', accent: '#38ef7d', font: 'Inter' }, // Cyber
    { bg: 'white', color: '#1a1a1a', accent: '#ff4081', font: 'Playfair Display', border: '40px solid #1a1a1a' }, // Magazine
    { bg: 'linear-gradient(45deg, #8e2de2, #4a00e0)', color: 'white', accent: '#00f2fe', font: 'Inter' }, // Neon
  ];

  const theme = themes[variant % themes.length] || themes[0];
  const isMagazine = variant === 3;
  const isDetailed = variant === 1;
  const isStatsLayout = variant === 1;
  const isScoreHeroLayout = variant === 2;
  const isSplitSpotlightLayout = variant === 4;

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
          <Typography variant="h1" sx={{ fontWeight: 900, fontSize: 180, mb: -4, color: theme?.accent || 'primary.main', opacity: 0.8 }}>RECAP</Typography>
          <Typography variant="h2" sx={{ fontWeight: 900, fontSize: 100, mb: 4 }}>MATCHDAY</Typography>

          <Box sx={{ mt: 'auto', borderTop: '8px solid black', pt: 4 }}>
             <Typography variant="h1" sx={{ fontWeight: 900, fontSize: 140 }}>{data?.scoreline || '0–0'}</Typography>
             <Typography variant="h4" sx={{ fontWeight: 700, textTransform: 'uppercase', mb: 2 }}>Resultat</Typography>

             <Stack direction="row" spacing={8} sx={{ mb: 4 }}>
                <Box>
                  <Typography variant="h5" sx={{ opacity: 0.6, textTransform: 'uppercase', fontWeight: 800 }}>{is1v1 ? 'Spelare A' : 'Lag A'}</Typography>
                  {data?.teamA?.players?.map((p: any, i: number) => <Typography key={p?.id || i} variant="h3" sx={{ fontWeight: 800 }}>{p?.name || '—'}</Typography>)}
                </Box>
                <Box>
                  <Typography variant="h5" sx={{ opacity: 0.6, textTransform: 'uppercase', fontWeight: 800 }}>{is1v1 ? 'Spelare B' : 'Lag B'}</Typography>
                  {data?.teamB?.players?.map((p: any, i: number) => <Typography key={p?.id || i} variant="h3" sx={{ fontWeight: 800 }}>{p?.name || '—'}</Typography>)}
                </Box>
             </Stack>

             <Typography variant="h5" sx={{ fontWeight: 800, textTransform: 'uppercase', color: theme?.accent || 'primary.main' }}>
               {safeFormatDate(data?.createdAt, { weekday: 'long', day: 'numeric', month: 'long' })}
             </Typography>
          </Box>
        </Box>
      ) : isStatsLayout ? (
        // Layout note (non-coder): this recap puts the stats into a column so the numbers lead the story.
        <Box sx={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 4 }}>
          <Stack spacing={3} alignItems="flex-start">
            <GSLogo />
            <Box sx={{ bgcolor: 'rgba(0,0,0,0.15)', p: 3, borderRadius: 3, width: '100%' }}>
              <Typography variant="h5" sx={{ fontWeight: 800, textTransform: 'uppercase' }}>Matchdata</Typography>
              <Stack spacing={2} sx={{ mt: 2 }}>
                <Box>
                  <Typography variant="h6" sx={{ opacity: 0.6 }}>Fairness</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 900 }}>{data?.fairness ?? 0}%</Typography>
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ opacity: 0.6 }}>{is1v1 ? 'Vinstchans A' : 'Vinstchans Lag A'}</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 900 }}>{Math.round((data?.winProbability ?? 0) * 100)}%</Typography>
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ opacity: 0.6 }}>Serve A</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 900 }}>{data?.team1ServesFirst ? 'JA' : 'NEJ'}</Typography>
                </Box>
              </Stack>
            </Box>
            <Typography variant="body1" sx={{ opacity: 0.7 }}>
              {safeFormatDate(data?.createdAt, { weekday: 'long', day: 'numeric', month: 'long' })}
            </Typography>
          </Stack>
          <Stack spacing={3} alignItems="center" justifyContent="center">
            <Typography variant="h2" sx={{ fontWeight: 900, textTransform: 'uppercase', color: theme?.accent || 'inherit' }}>
              Match-recap
            </Typography>
            <Typography variant="h1" sx={{ fontWeight: 900, fontSize: 140 }}>
              {data?.scoreline || '0–0'}
            </Typography>
            <Grid container spacing={3} sx={{ width: '100%' }}>
              <Grid size={{ xs: 6 }}>
                <Typography variant="h5" sx={{ fontWeight: 800, opacity: 0.7, textTransform: 'uppercase' }}>{is1v1 ? 'Spelare A' : 'Lag A'}</Typography>
                {data?.teamA?.players?.map((p: any, i: number) => (
                  <Box key={p?.id || i} sx={{ mb: 1 }}>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>{p?.name || '—'}</Typography>
                    <Typography variant="body1" sx={{ color: theme?.accent || 'inherit', fontWeight: 700 }}>
                      {(p?.delta ?? 0) >= 0 ? '+' : ''}{p?.delta ?? 0} ELO
                    </Typography>
                  </Box>
                ))}
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant="h5" sx={{ fontWeight: 800, opacity: 0.7, textTransform: 'uppercase' }}>{is1v1 ? 'Spelare B' : 'Lag B'}</Typography>
                {data?.teamB?.players?.map((p: any, i: number) => (
                  <Box key={p?.id || i} sx={{ mb: 1 }}>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>{p?.name || '—'}</Typography>
                    <Typography variant="body1" sx={{ color: theme?.accent || 'inherit', fontWeight: 700 }}>
                      {(p?.delta ?? 0) >= 0 ? '+' : ''}{p?.delta ?? 0} ELO
                    </Typography>
                  </Box>
                ))}
              </Grid>
            </Grid>
          </Stack>
        </Box>
      ) : isScoreHeroLayout ? (
        // Layout note (non-coder): this variant makes the score the main hero so it grabs attention first.
        <Stack spacing={4} alignItems="center" sx={{ width: '100%' }}>
          <GSLogo />
          <Typography variant="h3" sx={{ fontWeight: 800, textTransform: 'uppercase', color: theme?.accent || 'inherit' }}>
            Match-recap
          </Typography>
          <Box sx={{ bgcolor: 'rgba(255,255,255,0.15)', px: 6, py: 4, borderRadius: 6, width: '80%' }}>
            <Typography variant="h1" sx={{ fontWeight: 900, fontSize: 150 }}>
              {data?.scoreline || '0–0'}
            </Typography>
          </Box>
          <Grid container spacing={4} sx={{ width: '100%' }}>
            <Grid size={{ xs: 6 }}>
              <Typography variant="h5" sx={{ fontWeight: 800, opacity: 0.7, textTransform: 'uppercase' }}>{is1v1 ? 'Spelare A' : 'Lag A'}</Typography>
              {data?.teamA?.players?.map((p: any, i: number) => (
                <Typography key={p?.id || i} variant="h4" sx={{ fontWeight: 700 }}>{p?.name || '—'}</Typography>
              ))}
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Typography variant="h5" sx={{ fontWeight: 800, opacity: 0.7, textTransform: 'uppercase' }}>{is1v1 ? 'Spelare B' : 'Lag B'}</Typography>
              {data?.teamB?.players?.map((p: any, i: number) => (
                <Typography key={p?.id || i} variant="h4" sx={{ fontWeight: 700 }}>{p?.name || '—'}</Typography>
              ))}
            </Grid>
          </Grid>
          <Stack direction="row" spacing={2} sx={{ width: '100%', justifyContent: 'center' }}>
            <Box sx={{ bgcolor: 'rgba(255,255,255,0.1)', p: 2, borderRadius: 2, flex: 1 }}>
              <Typography variant="h6" sx={{ opacity: 0.6, fontWeight: 800, textTransform: 'uppercase' }}>Fairness</Typography>
              <Typography variant="h4" sx={{ fontWeight: 900 }}>{data?.fairness ?? 0}%</Typography>
            </Box>
            <Box sx={{ bgcolor: 'rgba(255,255,255,0.1)', p: 2, borderRadius: 2, flex: 1 }}>
              <Typography variant="h6" sx={{ opacity: 0.6, fontWeight: 800, textTransform: 'uppercase' }}>{is1v1 ? 'Vinstchans A' : 'Vinstchans Lag A'}</Typography>
              <Typography variant="h4" sx={{ fontWeight: 900 }}>{Math.round((data?.winProbability ?? 0) * 100)}%</Typography>
            </Box>
          </Stack>
        </Stack>
      ) : isSplitSpotlightLayout ? (
        // Layout note (non-coder): this version splits the screen with a big highlight area and a smaller roster panel.
        <Box sx={{ width: '100%', display: 'flex', gap: 4 }}>
          <Box sx={{ flex: 1.4, bgcolor: 'rgba(0,0,0,0.2)', p: 4, borderRadius: 4 }}>
            <Typography variant="h2" sx={{ fontWeight: 900, textTransform: 'uppercase', color: theme?.accent || 'inherit' }}>
              Match-recap
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.7, mb: 3 }}>
              {safeFormatDate(data?.createdAt, { weekday: 'long', day: 'numeric', month: 'long' })}
            </Typography>
            <Typography variant="h1" sx={{ fontWeight: 900, fontSize: 140 }}>
              {data?.scoreline || '0–0'}
            </Typography>
            <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
              <Box>
                <Typography variant="h6" sx={{ opacity: 0.6 }}>Fairness</Typography>
                <Typography variant="h4" sx={{ fontWeight: 900 }}>{data?.fairness ?? 0}%</Typography>
              </Box>
              <Box>
                <Typography variant="h6" sx={{ opacity: 0.6 }}>Vinstchans A</Typography>
                <Typography variant="h4" sx={{ fontWeight: 900 }}>{Math.round((data?.winProbability ?? 0) * 100)}%</Typography>
              </Box>
            </Stack>
          </Box>
          <Box sx={{ flex: 1, bgcolor: 'rgba(255,255,255,0.12)', p: 4, borderRadius: 4 }}>
            <Typography variant="h5" sx={{ fontWeight: 800, textTransform: 'uppercase', mb: 2 }}>{is1v1 ? 'Spelare' : 'Lag'}</Typography>
            <Stack spacing={2}>
              <Box>
                {data?.teamA?.players?.map((p: any, i: number) => (
                  <Typography key={p?.id || i} variant="h4" sx={{ fontWeight: 700 }}>{p?.name || '—'}</Typography>
                ))}
              </Box>
              <Box>
                {data?.teamB?.players?.map((p: any, i: number) => (
                  <Typography key={p?.id || i} variant="h4" sx={{ fontWeight: 700 }}>{p?.name || '—'}</Typography>
                ))}
              </Box>
            </Stack>
          </Box>
        </Box>
      ) : (
        <Stack spacing={isDetailed ? 3 : 6} alignItems="center" sx={{ width: '100%' }}>
          <GSLogo />
          <Box>
            <Typography variant="h2" sx={{ fontWeight: 900, textTransform: 'uppercase', mb: 1, color: theme?.accent || 'inherit' }}>
              Match-recap
            </Typography>
            <Typography variant="h1" sx={{ fontWeight: 900, fontSize: 140 }}>
              {data?.scoreline || '0–0'}
            </Typography>
          </Box>

          <Grid container spacing={4} sx={{ width: '100%' }}>
            <Grid size={{ xs: 6 }}>
              <Typography variant="h4" sx={{ fontWeight: 800, opacity: 0.7, mb: 2, textTransform: 'uppercase' }}>{is1v1 ? 'Spelare A' : 'Lag A'}</Typography>
              {data?.teamA?.players?.map((p: any, i: number) => (
                <Box key={p?.id || i} sx={{ mb: 2 }}>
                  <Typography variant="h3" sx={{ fontWeight: 700 }}>{p?.name || '—'}</Typography>
                  <Typography variant="h5" sx={{ color: theme?.accent || 'inherit', fontWeight: 700 }}>
                    {(p?.delta ?? 0) >= 0 ? '+' : ''}{p?.delta ?? 0} ELO
                  </Typography>
                  {isDetailed && (
                    <Typography variant="body1" sx={{ opacity: 0.6 }}>Rating: {p?.elo ?? 0}</Typography>
                  )}
                </Box>
              ))}
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Typography variant="h4" sx={{ fontWeight: 800, opacity: 0.7, mb: 2, textTransform: 'uppercase' }}>{is1v1 ? 'Spelare B' : 'Lag B'}</Typography>
              {data?.teamB?.players?.map((p: any, i: number) => (
                <Box key={p?.id || i} sx={{ mb: 2 }}>
                  <Typography variant="h3" sx={{ fontWeight: 700 }}>{p?.name || '—'}</Typography>
                  <Typography variant="h5" sx={{ color: theme?.accent || 'inherit', fontWeight: 700 }}>
                    {(p?.delta ?? 0) >= 0 ? '+' : ''}{p?.delta ?? 0} ELO
                  </Typography>
                  {isDetailed && (
                    <Typography variant="body1" sx={{ opacity: 0.6 }}>Rating: {p?.elo ?? 0}</Typography>
                  )}
                </Box>
              ))}
            </Grid>
          </Grid>

          <Stack direction="row" spacing={2} sx={{ width: '100%', justifyContent: 'center' }}>
            <Box sx={{
              bgcolor: 'rgba(255,255,255,0.1)',
              p: 2,
              borderRadius: 2,
              flex: 1,
              border: isDetailed ? `2px solid ${theme?.accent || 'transparent'}` : 'none'
            }}>
               <Typography variant="h6" sx={{ opacity: 0.6, fontWeight: 800, textTransform: 'uppercase' }}>Fairness</Typography>
               <Typography variant="h4" sx={{ fontWeight: 900 }}>{data?.fairness ?? 0}%</Typography>
            </Box>
            <Box sx={{
              bgcolor: 'rgba(255,255,255,0.1)',
              p: 2,
              borderRadius: 2,
              flex: 1,
              border: isDetailed ? `2px solid ${theme?.accent || 'transparent'}` : 'none'
            }}>
               <Typography variant="h6" sx={{ opacity: 0.6, fontWeight: 800, textTransform: 'uppercase' }}>{is1v1 ? 'Vinstchans A' : 'Vinstchans Lag A'}</Typography>
               <Typography variant="h4" sx={{ fontWeight: 900 }}>{Math.round((data?.winProbability ?? 0) * 100)}%</Typography>
            </Box>
            {isDetailed && (
              <Box sx={{
                bgcolor: 'rgba(255,255,255,0.1)',
                p: 2,
                borderRadius: 2,
                flex: 1,
                border: `2px solid ${theme?.accent || 'transparent'}`
              }}>
                 <Typography variant="h6" sx={{ opacity: 0.6, fontWeight: 800, textTransform: 'uppercase' }}>Serve A</Typography>
                 <Typography variant="h4" sx={{ fontWeight: 900 }}>{data?.team1ServesFirst ? 'JA' : 'NEJ'}</Typography>
              </Box>
            )}
          </Stack>
        </Stack>
      )}
    </Box>
  );
};
