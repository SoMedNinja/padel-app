import React from 'react';
import { Box, Typography, Stack } from '@mui/material';
import { Match } from '../../../types';
import { MatchHighlight } from '../../../utils/highlights';
import { safeFormatDate } from './utils';
import { GSLogo } from './GSLogo';

export const MatchTemplate = ({ match, highlight, variant = 0, deltas = {} }: { match: Match; highlight: MatchHighlight; variant?: number; deltas?: Record<string, number> }) => {
  const team1Names = (Array.isArray(match?.team1) ? match.team1 : [match?.team1 || 'Lag A']).filter(Boolean);
  const team2Names = (Array.isArray(match?.team2) ? match.team2 : [match?.team2 || 'Lag B']).filter(Boolean);
  const is1v1 = match?.source_tournament_type === "standalone_1v1" || (team1Names.length === 1 && team2Names.length === 1);

  const themes = [
    { bg: 'linear-gradient(180deg, #1a237e 0%, #0d47a1 100%)', color: 'white', accent: '#ffca28', font: 'Inter' }, // Classic Blue
    { bg: '#0f172a', color: 'white', accent: '#38ef7d', font: 'Inter' }, // Dark Stats
    { bg: '#f80759', color: 'white', accent: '#fff', font: 'Inter' }, // Bold Pink
    { bg: 'white', color: '#1a237e', accent: '#1a237e', border: '40px solid #1a237e', font: 'Playfair Display' }, // Magazine
    { bg: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', color: 'white', accent: '#fff', font: 'Inter' }, // Emerald
  ];

  const theme = themes[variant % themes.length] || themes[0];
  const isMagazine = variant === 3;
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
        overflow: 'hidden',
        border: theme?.border || 'none',
        fontFamily: theme?.font || 'inherit'
      }}
    >
      {isMagazine ? (
        <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', p: 4 }}>
           <Typography variant="h1" sx={{
             fontSize: 160,
             fontWeight: 900,
             lineHeight: 0.8,
             textAlign: 'left',
             textTransform: 'uppercase',
             opacity: 0.1,
             position: 'absolute',
             top: 40,
             left: 40,
             zIndex: 0
           }}>
             Padel<br/>Prestige<br/>Ära
           </Typography>

           <Stack spacing={4} sx={{ zIndex: 1, mt: 'auto', textAlign: 'left', width: '100%' }}>
             <Typography variant="h2" sx={{ fontWeight: 900, color: theme?.accent || 'primary.main', textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
               {highlight?.title || 'Match'}
             </Typography>

             <Box sx={{ borderLeft: `12px solid ${theme?.accent || 'primary.main'}`, pl: 4, py: 2 }}>
               <Typography variant="h1" sx={{ fontWeight: 900, fontSize: 120 }}>
                 {match?.team1_sets ?? 0} – {match?.team2_sets ?? 0}
               </Typography>
               <Typography variant="h4" sx={{ fontWeight: 500, opacity: 0.8 }}>
                 {team1Names?.join(' & ')} vs {team2Names?.join(' & ')}
               </Typography>
             </Box>

             <Typography variant="h3" sx={{ fontStyle: 'italic', fontWeight: 400, maxWidth: '80%' }}>
               "{highlight?.description || ''}"
             </Typography>

             <Typography variant="h5" sx={{ mt: 4, fontWeight: 800, textTransform: 'uppercase' }}>
               {safeFormatDate(match?.created_at, { weekday: 'long', day: 'numeric', month: 'long' })}
             </Typography>
           </Stack>
        </Box>
      ) : isStatsLayout ? (
        // Layout note (non-coder): this variant moves the stats into a left column so the eye starts with numbers before the score.
        <Box sx={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 4 }}>
          <Stack spacing={3} alignItems="flex-start">
            <GSLogo />
            <Box>
              <Typography variant="h3" sx={{ fontWeight: 900, textTransform: 'uppercase', color: theme?.accent || 'inherit' }}>
                Statistik först
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.8 }}>
                {safeFormatDate(match?.created_at, { weekday: 'long', day: 'numeric', month: 'long' })}
              </Typography>
            </Box>
            <Box sx={{ width: '100%', bgcolor: 'rgba(255,255,255,0.12)', p: 3, borderRadius: 3 }}>
              <Typography variant="h5" sx={{ fontWeight: 800, mb: 2 }}>ELO-delta</Typography>
              <Stack spacing={1}>
                {team1Names.map((name, i) => {
                  const pid = match?.team1_ids?.[i];
                  const deltaValue = pid ? deltas?.[pid] : undefined;
                  return (
                    <Stack key={`t1-${i}`} direction="row" justifyContent="space-between">
                      <Typography variant="body1">{name || '—'}</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 700, color: theme?.accent || 'inherit' }}>
                        {deltaValue !== undefined ? `${deltaValue >= 0 ? '+' : ''}${Math.round(deltaValue)} ELO` : '—'}
                      </Typography>
                    </Stack>
                  );
                })}
                {team2Names.map((name, i) => {
                  const pid = match?.team2_ids?.[i];
                  const deltaValue = pid ? deltas?.[pid] : undefined;
                  return (
                    <Stack key={`t2-${i}`} direction="row" justifyContent="space-between">
                      <Typography variant="body1">{name || '—'}</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 700, color: theme?.accent || 'inherit' }}>
                        {deltaValue !== undefined ? `${deltaValue >= 0 ? '+' : ''}${Math.round(deltaValue)} ELO` : '—'}
                      </Typography>
                    </Stack>
                  );
                })}
              </Stack>
            </Box>
            <Typography variant="body1" sx={{ fontStyle: 'italic', opacity: 0.8 }}>
              "{highlight?.description || ''}"
            </Typography>
          </Stack>
          <Stack spacing={3} alignItems="center" justifyContent="center">
            <Typography variant="h2" sx={{ fontWeight: 900, textTransform: 'uppercase', color: theme?.accent || 'inherit' }}>
              {highlight?.title || 'Match'}
            </Typography>
            <Box sx={{
              bgcolor: 'white',
              color: '#0d47a1',
              p: 3,
              borderRadius: 3,
              minWidth: 240,
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
            }}>
              <Typography variant="h1" sx={{ fontWeight: 900, lineHeight: 1 }}>
                {match?.team1_sets ?? 0} – {match?.team2_sets ?? 0}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>{team1Names?.join(' & ')}</Typography>
              <Typography variant="h5" sx={{ opacity: 0.7, my: 1 }}>vs</Typography>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>{team2Names?.join(' & ')}</Typography>
            </Box>
          </Stack>
        </Box>
      ) : isScoreHeroLayout ? (
        // Layout note (non-coder): this version makes the score the main "hero" element and tucks the team list underneath.
        <Stack spacing={5} alignItems="center" sx={{ width: '100%' }}>
          <Typography variant="h3" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: theme?.accent || 'inherit' }}>
            {highlight?.title || 'Match'}
          </Typography>
          <Box sx={{
            bgcolor: 'rgba(255,255,255,0.15)',
            borderRadius: 6,
            px: 6,
            py: 4,
            width: '80%',
            boxShadow: '0 20px 40px rgba(0,0,0,0.25)'
          }}>
            <Typography variant="h1" sx={{ fontWeight: 900, fontSize: 140, lineHeight: 1 }}>
              {match?.team1_sets ?? 0} – {match?.team2_sets ?? 0}
            </Typography>
          </Box>
          <Stack direction="row" spacing={6} sx={{ width: '100%', justifyContent: 'center' }}>
            <Box sx={{ textAlign: 'right' }}>
              {team1Names.map((name, i) => (
                <Typography key={i} variant="h4" sx={{ fontWeight: 700 }}>{name || '—'}</Typography>
              ))}
            </Box>
            <Box sx={{ textAlign: 'left' }}>
              {team2Names.map((name, i) => (
                <Typography key={i} variant="h4" sx={{ fontWeight: 700 }}>{name || '—'}</Typography>
              ))}
            </Box>
          </Stack>
          <Typography variant="h5" sx={{ fontStyle: 'italic', opacity: 0.8 }}>
            "{highlight?.description || ''}"
          </Typography>
        </Stack>
      ) : isSplitSpotlightLayout ? (
        // Layout note (non-coder): the left side is a spotlight block, while the right side is a compact roster panel.
        <Box sx={{ width: '100%', display: 'flex', gap: 4 }}>
          <Box sx={{ flex: 1.3, bgcolor: 'rgba(0,0,0,0.2)', p: 4, borderRadius: 4 }}>
            <Typography variant="h2" sx={{ fontWeight: 900, textTransform: 'uppercase', color: theme?.accent || 'inherit' }}>
              {highlight?.title || 'Match'}
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.8, mb: 3 }}>
              {safeFormatDate(match?.created_at, { weekday: 'long', day: 'numeric', month: 'long' })}
            </Typography>
            <Typography variant="h1" sx={{ fontWeight: 900, fontSize: 120 }}>
              {match?.team1_sets ?? 0} – {match?.team2_sets ?? 0}
            </Typography>
            <Typography variant="h5" sx={{ fontStyle: 'italic', mt: 2 }}>
              "{highlight?.description || ''}"
            </Typography>
          </Box>
          <Box sx={{ flex: 1, bgcolor: 'rgba(255,255,255,0.12)', p: 4, borderRadius: 4 }}>
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 2, textTransform: 'uppercase' }}>{is1v1 ? 'Spelare' : 'Lag'}</Typography>
            <Stack spacing={2}>
              <Box>
                {team1Names.map((name, i) => (
                  <Typography key={`split-t1-${i}`} variant="h4" sx={{ fontWeight: 700 }}>{name || '—'}</Typography>
                ))}
              </Box>
              <Box>
                {team2Names.map((name, i) => (
                  <Typography key={`split-t2-${i}`} variant="h4" sx={{ fontWeight: 700 }}>{name || '—'}</Typography>
                ))}
              </Box>
            </Stack>
          </Box>
        </Box>
      ) : (
        <Stack spacing={6} alignItems="center" sx={{ width: '100%', zIndex: 1 }}>
          <GSLogo />

          <Box>
            <Typography variant="h2" sx={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1, color: theme?.accent || 'inherit' }}>
              {highlight?.title || 'Match'}
            </Typography>
            <Typography variant="h5" sx={{ opacity: 0.8, fontWeight: 500 }}>
              {safeFormatDate(match?.created_at, { weekday: 'long', day: 'numeric', month: 'long' })}
            </Typography>
          </Box>

          <Stack direction="row" spacing={4} alignItems="center" justifyContent="center" sx={{ width: '100%' }}>
            <Box sx={{ flex: 1, textAlign: 'right' }}>
              {team1Names.map((name, i) => {
                const pid = match?.team1_ids?.[i];
                const deltaValue = pid ? deltas?.[pid] : undefined;
                return (
                  <Box key={i}>
                    <Typography variant="h3" sx={{ fontWeight: 800 }}>{name || '—'}</Typography>
                    {deltaValue !== undefined && (
                      <Typography variant="h5" sx={{ color: theme?.accent || 'inherit', fontWeight: 700 }}>
                        {deltaValue >= 0 ? '+' : ''}{Math.round(deltaValue)} ELO
                      </Typography>
                    )}
                  </Box>
                );
              })}
            </Box>

            <Box sx={{
              bgcolor: 'white',
              color: '#0d47a1',
              p: 2,
              borderRadius: 2,
              minWidth: 180,
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
            }}>
              <Typography variant="h1" sx={{ fontWeight: 900, lineHeight: 1 }}>
                {match?.team1_sets ?? 0} – {match?.team2_sets ?? 0}
              </Typography>
            </Box>

            <Box sx={{ flex: 1, textAlign: 'left' }}>
              {team2Names.map((name, i) => {
                const pid = match?.team2_ids?.[i];
                const deltaValue = pid ? deltas?.[pid] : undefined;
                return (
                  <Box key={i}>
                    <Typography variant="h3" sx={{ fontWeight: 800 }}>{name || '—'}</Typography>
                    {deltaValue !== undefined && (
                      <Typography variant="h5" sx={{ color: theme?.accent || 'inherit', fontWeight: 700 }}>
                        {deltaValue >= 0 ? '+' : ''}{Math.round(deltaValue)} ELO
                      </Typography>
                    )}
                  </Box>
                );
              })}
            </Box>
          </Stack>

          <Typography variant="h4" sx={{ maxWidth: '85%', fontStyle: 'italic', opacity: 0.9, fontWeight: 500 }}>
            "{highlight?.description || ''}"
          </Typography>

          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.2em' }}>
              Padel, Prestige & Ära
            </Typography>
          </Box>
        </Stack>
      )}
    </Box>
  );
};
