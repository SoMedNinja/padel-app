import React from 'react';
import { Box, Typography, Grid, Stack } from '@mui/material';
import { EmojiEvents } from '@mui/icons-material';
import { Tournament, TournamentResult } from '../../../types';
import { TournamentPlayerStats } from '../../../utils/tournamentLogic';
import { safeFormatDate } from './utils';

type TemplateResult = TournamentResult | TournamentPlayerStats;

const getProfileId = (res: TemplateResult): string => {
  if ('profile_id' in res && res.profile_id) return res.profile_id;
  return res.id;
};

const getPoints = (res: TemplateResult): number => {
  if ('points_for' in res) return res.points_for;
  if ('totalPoints' in res) return res.totalPoints;
  return 0;
};

export const TournamentTemplate = ({ tournament, results, profileMap, variant = 0 }: { tournament: Tournament; results: TemplateResult[]; profileMap: Record<string, string>; variant?: number }) => {
  const topCount = variant === 1 ? 8 : 3;
  const topPlayers = Array.isArray(results) ? results.slice(0, topCount) : [];
  const winner = topPlayers[0];
  const winnerId = winner ? getProfileId(winner) : '';

  const themes = [
    { bg: 'linear-gradient(180deg, #ff8f00 0%, #ff6f00 100%)', color: 'white', accent: '#ffca28', font: 'Inter' }, // Classic Gold
    { bg: '#1a1a1a', color: 'white', accent: '#4caf50', font: 'Inter' }, // Dark Stats
    { bg: 'linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)', color: 'white', accent: '#00d2ff', font: 'Inter' }, // Modern Blue
    { bg: 'white', color: '#1a1a1a', accent: '#1a1a1a', font: 'Playfair Display', border: '40px solid #f5f5f5' }, // Magazine
    { bg: 'linear-gradient(45deg, #12c2e9, #c471ed, #f64f59)', color: 'white', accent: '#fff', font: 'Inter' }, // Vibrant
  ];

  const theme = themes[variant % themes.length] || themes[0];
  const isMagazine = variant === 3;
  const isStats = variant === 1;

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
        overflow: 'hidden',
        fontFamily: theme?.font || 'inherit',
        border: theme?.border || 'none'
      }}
    >
      {isMagazine ? (
        <Box sx={{ width: '100%', height: '100%', textAlign: 'left', p: 4, display: 'flex', flexDirection: 'column' }}>
           <Typography variant="h1" sx={{ fontWeight: 900, fontSize: 180, mb: -4, color: theme?.accent || 'primary.main', opacity: 0.1, position: 'absolute', top: 40, right: 40 }}>CHAMP</Typography>
           <Typography variant="h1" sx={{ fontWeight: 900, fontSize: 140, mb: 0, lineHeight: 0.9 }}>MÄSTAREN</Typography>
           <Typography variant="h2" sx={{ fontWeight: 500, fontStyle: 'italic', mb: 8 }}>{tournament?.name || 'Turnering'}</Typography>

           <Box sx={{ mt: 'auto' }}>
              <Typography variant="h5" sx={{ fontWeight: 800, textTransform: 'uppercase', mb: 1 }}>Vinnare</Typography>
              <Typography variant="h1" sx={{ fontWeight: 900, fontSize: 120, color: theme?.accent || 'primary.main', mb: 4 }}>
                {profileMap?.[winnerId] || 'Okänd'}
              </Typography>

              <Grid container spacing={4}>
                 <Grid size={{ xs: 4 }}>
                    <Typography variant="h6" sx={{ opacity: 0.6 }}>Poäng</Typography>
                    <Typography variant="h3" sx={{ fontWeight: 800 }}>{winner ? getPoints(winner) : 0}</Typography>
                 </Grid>
                 <Grid size={{ xs: 4 }}>
                    <Typography variant="h6" sx={{ opacity: 0.6 }}>Vinster</Typography>
                    <Typography variant="h3" sx={{ fontWeight: 800 }}>{winner?.wins ?? 0}</Typography>
                 </Grid>
                 <Grid size={{ xs: 4 }}>
                    <Typography variant="h6" sx={{ opacity: 0.6 }}>Datum</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>
                      {safeFormatDate(tournament?.completed_at, { month: 'short', day: 'numeric' })}
                    </Typography>
                 </Grid>
              </Grid>
           </Box>
        </Box>
      ) : (
        <Stack spacing={4} alignItems="center" sx={{ width: '100%', zIndex: 1 }}>
          <EmojiEvents sx={{ fontSize: isStats ? 80 : 120, color: theme?.accent || 'gold', filter: 'drop-shadow(0 0 20px rgba(0,0,0,0.2))' }} />

          <Box>
            <Typography variant="h2" sx={{ fontWeight: 900, textTransform: 'uppercase', mb: 1 }}>
              Mästare
            </Typography>
            <Typography variant="h4" sx={{ opacity: 0.9, fontWeight: 700 }}>
              {tournament?.name || 'Turnering'}
            </Typography>
          </Box>

          {!isStats && (
            <Box sx={{
              bgcolor: 'white',
              color: '#ff6f00',
              p: 4,
              borderRadius: 4,
              width: '85%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}>
              <Typography variant="h1" sx={{ fontWeight: 900, mb: 1 }}>
                {profileMap?.[winnerId] || 'Okänd spelare'}
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, opacity: 0.7, textTransform: 'uppercase' }}>
                {winner ? getPoints(winner) : 0} Poäng • {winner?.wins ?? 0} Vinster
              </Typography>
            </Box>
          )}

          <Box sx={{ width: '100%', mt: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 2, opacity: 0.6, textTransform: 'uppercase' }}>
              {isStats ? 'Sluttabell' : 'Topplista'}
            </Typography>
            {isStats ? (
              <Stack spacing={1} sx={{ width: '90%', mx: 'auto' }}>
                {topPlayers.map((res, i) => {
                   const pid = getProfileId(res);
                   const points = getPoints(res);
                   return (
                   <Box key={pid || i} sx={{ display: 'flex', justifyContent: 'space-between', p: 2, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2, border: i === 0 ? `2px solid ${theme?.accent || 'transparent'}` : 'none' }}>
                     <Typography variant="h5" sx={{ fontWeight: 800 }}>{i + 1}. {profileMap?.[pid] || 'Okänd'}</Typography>
                     <Typography variant="h5" sx={{ fontWeight: 800, color: theme?.accent || 'inherit' }}>{points}p</Typography>
                   </Box>
                )})}
              </Stack>
            ) : (
              <Stack direction="row" spacing={4} justifyContent="center" alignItems="flex-end">
                {topPlayers.map((res, i) => {
                   const pid = getProfileId(res);
                   const points = getPoints(res);
                   const isWinner = i === 0;
                   return (
                     <Box key={pid || i} sx={{ textAlign: 'center', order: i === 0 ? 2 : (i === 1 ? 1 : 3) }}>
                       <Box sx={{
                         height: isWinner ? 120 : (i === 1 ? 80 : 60),
                         width: 80,
                         bgcolor: theme?.accent || 'grey.500',
                         mx: 'auto',
                         borderRadius: '8px 8px 0 0',
                         display: 'flex',
                         flexDirection: 'column',
                         justifyContent: 'center',
                         mb: 1,
                         opacity: isWinner ? 1 : 0.6
                       }}>
                         <Typography variant="h4" sx={{ fontWeight: 900, color: theme?.bg || '#000' }}>{i + 1}</Typography>
                       </Box>
                       <Typography variant="h5" sx={{ fontWeight: 700 }}>{profileMap?.[pid] || 'Okänd'}</Typography>
                       <Typography variant="body1" sx={{ opacity: 0.7 }}>{points}p</Typography>
                     </Box>
                   );
                })}
              </Stack>
            )}
          </Box>

          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.2em' }}>
              {safeFormatDate(tournament?.completed_at, { year: 'numeric', month: 'long', day: 'numeric' })}
            </Typography>
          </Box>
        </Stack>
      )}
    </Box>
  );
};
