import React, { useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Stack,
  CircularProgress,
  Paper,
} from '@mui/material';
import { Close, Download, EmojiEvents, ChevronLeft, ChevronRight } from '@mui/icons-material';
import { toPng } from 'html-to-image';
import { Match, Tournament, TournamentResult } from '../../types';
import { MatchHighlight } from '../../utils/highlights';
import { Grid } from '@mui/material';
import { toast } from 'sonner';

const LOGO_BOX_SIZE = 80;

const GSLogo = () => (
  <Box
    sx={{
      width: LOGO_BOX_SIZE,
      height: LOGO_BOX_SIZE,
      borderRadius: 3,
      display: 'grid',
      placeItems: 'center',
      background: 'linear-gradient(140deg, #b71c1c, #ff8f00)',
      color: '#fff',
      fontWeight: 900,
      fontSize: 32,
      letterSpacing: '0.08em',
      boxShadow: '0 12px 24px rgba(183, 28, 28, 0.3)',
    }}
  >
    GS
  </Box>
);

const safeFormatDate = (dateStr: string | undefined, options: Intl.DateTimeFormatOptions) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('sv-SE', options);
  } catch (e) {
    return '—';
  }
};

const TournamentTemplate = ({ tournament, results, profileMap, variant = 0 }: { tournament: Tournament; results: any[]; profileMap: Record<string, string>; variant?: number }) => {
  const topCount = variant === 1 ? 8 : 3;
  const topPlayers = Array.isArray(results) ? results.slice(0, topCount) : [];
  const winner = topPlayers[0];
  const winnerId = winner?.profile_id || winner?.id || '';

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
                    <Typography variant="h3" sx={{ fontWeight: 800 }}>{winner?.points_for ?? winner?.totalPoints ?? 0}</Typography>
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
                {winner?.points_for ?? winner?.totalPoints ?? 0} Poäng • {winner?.wins ?? 0} Vinster
              </Typography>
            </Box>
          )}

          <Box sx={{ width: '100%', mt: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 2, opacity: 0.6, textTransform: 'uppercase' }}>
              {isStats ? 'Sluttabell' : 'Topplista'}
            </Typography>
            {isStats ? (
              <Stack spacing={1} sx={{ width: '90%', mx: 'auto' }}>
                {topPlayers.map((res, i) => (
                   <Box key={res?.profile_id || res?.id || i} sx={{ display: 'flex', justifyContent: 'space-between', p: 2, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2, border: i === 0 ? `2px solid ${theme?.accent || 'transparent'}` : 'none' }}>
                     <Typography variant="h5" sx={{ fontWeight: 800 }}>{i + 1}. {profileMap?.[res?.profile_id || res?.id] || 'Okänd'}</Typography>
                     <Typography variant="h5" sx={{ fontWeight: 800, color: theme?.accent || 'inherit' }}>{res?.points_for ?? res?.totalPoints ?? 0}p</Typography>
                   </Box>
                ))}
              </Stack>
            ) : (
              <Stack direction="row" spacing={4} justifyContent="center" alignItems="flex-end">
                {topPlayers.map((res, i) => {
                   const pid = res?.profile_id || res?.id || '';
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
                       <Typography variant="body1" sx={{ opacity: 0.7 }}>{res?.points_for ?? res?.totalPoints ?? 0}p</Typography>
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

const MatchTemplate = ({ match, highlight, variant = 0, deltas = {} }: { match: Match; highlight: MatchHighlight; variant?: number; deltas?: Record<string, number> }) => {
  const team1Names = Array.isArray(match?.team1) ? match.team1 : [match?.team1 || 'Lag A'];
  const team2Names = Array.isArray(match?.team2) ? match.team2 : [match?.team2 || 'Lag B'];

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
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 2, textTransform: 'uppercase' }}>Lag</Typography>
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

const RecapMatchTemplate = ({ data, variant = 0 }: { data: any; variant?: number }) => {
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
                  <Typography variant="h5" sx={{ opacity: 0.6, textTransform: 'uppercase', fontWeight: 800 }}>Lag A</Typography>
                  {data?.teamA?.players?.map((p: any, i: number) => <Typography key={p?.id || i} variant="h3" sx={{ fontWeight: 800 }}>{p?.name || '—'}</Typography>)}
                </Box>
                <Box>
                  <Typography variant="h5" sx={{ opacity: 0.6, textTransform: 'uppercase', fontWeight: 800 }}>Lag B</Typography>
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
                  <Typography variant="h6" sx={{ opacity: 0.6 }}>Vinstchans Lag A</Typography>
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
                <Typography variant="h5" sx={{ fontWeight: 800, opacity: 0.7, textTransform: 'uppercase' }}>Lag A</Typography>
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
                <Typography variant="h5" sx={{ fontWeight: 800, opacity: 0.7, textTransform: 'uppercase' }}>Lag B</Typography>
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
              <Typography variant="h5" sx={{ fontWeight: 800, opacity: 0.7, textTransform: 'uppercase' }}>Lag A</Typography>
              {data?.teamA?.players?.map((p: any, i: number) => (
                <Typography key={p?.id || i} variant="h4" sx={{ fontWeight: 700 }}>{p?.name || '—'}</Typography>
              ))}
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Typography variant="h5" sx={{ fontWeight: 800, opacity: 0.7, textTransform: 'uppercase' }}>Lag B</Typography>
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
              <Typography variant="h6" sx={{ opacity: 0.6, fontWeight: 800, textTransform: 'uppercase' }}>Vinstchans Lag A</Typography>
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
            <Typography variant="h5" sx={{ fontWeight: 800, textTransform: 'uppercase', mb: 2 }}>Lag</Typography>
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
              <Typography variant="h4" sx={{ fontWeight: 800, opacity: 0.7, mb: 2, textTransform: 'uppercase' }}>Lag A</Typography>
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
              <Typography variant="h4" sx={{ fontWeight: 800, opacity: 0.7, mb: 2, textTransform: 'uppercase' }}>Lag B</Typography>
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
               <Typography variant="h6" sx={{ opacity: 0.6, fontWeight: 800, textTransform: 'uppercase' }}>Vinstchans Lag A</Typography>
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

const RecapEveningTemplate = ({ data, variant = 0 }: { data: any; variant?: number }) => {
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

interface TheShareableProps {
  open: boolean;
  onClose: () => void;
  type: 'match' | 'tournament' | 'recap-match' | 'recap-evening';
  data: {
    match?: Match;
    highlight?: MatchHighlight;
    tournament?: Tournament;
    results?: TournamentResult[] | any[];
    recap?: any;
    profileMap?: Record<string, string>;
    deltas?: Record<string, number>;
  };
}

export default function TheShareable({ open, onClose, type, data }: TheShareableProps) {
  const templateRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [variant, setVariant] = useState(0);

  const handleExport = async () => {
    if (!templateRef.current) return;
    setIsExporting(true);
    try {
      // Note for non-coders: waiting a moment ensures fonts are loaded before we capture the image.
      await document.fonts?.ready;
      await new Promise(requestAnimationFrame);
      const dataUrl = await toPng(templateRef.current, {
        quality: 1.0,
        pixelRatio: 2, // Higher resolution for sharing
        cacheBust: true,
      });
      const link = document.createElement('a');
      link.download = `padel-${type}-${new Date().getTime()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export image', err);
      toast.error('Kunde inte skapa bilden. Försök igen.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3 }
      }}
    >
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>The Shareable</Typography>
        <IconButton onClick={onClose} size="small" aria-label="Stäng">
          <Close />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: { xs: 1, sm: 3 }, bgcolor: 'grey.100', overflow: 'hidden' }}>
        <Box
          sx={{
            width: '100%',
            aspectRatio: '1/1',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'auto',
          }}
        >
          {/* This is the element we will capture */}
          <Box
            ref={templateRef}
            sx={{
              width: 1080,
              height: 1080,
              bgcolor: 'background.paper',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              // We scale it down for preview, but capture at full size
              transform: {
                xs: 'scale(0.24)',
                sm: 'scale(0.32)',
                md: 'scale(0.42)'
              },
              transformOrigin: 'center center',
              flexShrink: 0,
            }}
          >
             {type === 'match' && data.match && data.highlight && (
               <MatchTemplate
                 match={data.match}
                 highlight={data.highlight}
                 variant={variant}
                 deltas={data.deltas}
               />
             )}
             {type === 'tournament' && data.tournament && data.results && data.profileMap && (
                <TournamentTemplate
                  tournament={data.tournament}
                  results={data.results}
                  profileMap={data.profileMap}
                  variant={variant}
                />
             )}
             {type === 'recap-match' && data.recap && (
               <RecapMatchTemplate data={data.recap} variant={variant} />
             )}
             {type === 'recap-evening' && data.recap && (
                <RecapEveningTemplate data={data.recap} variant={variant} />
             )}
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, flexDirection: 'column', gap: 2 }}>
        <Stack direction="row" spacing={2} sx={{ width: '100%' }} justifyContent="center">
          <IconButton
            onClick={() => setVariant(prev => Math.max(0, prev - 1))}
            disabled={variant === 0}
            aria-label="Föregående mall"
          >
            <ChevronLeft />
          </IconButton>
          <Typography variant="body2" sx={{ alignSelf: 'center', fontWeight: 700 }}>
            Mall {variant + 1} / 5
          </Typography>
          <IconButton
            onClick={() => setVariant(prev => prev + 1)}
            disabled={variant >= 4}
            aria-label="Nästa mall"
          >
            <ChevronRight />
          </IconButton>
        </Stack>

        <Button
          fullWidth
          variant="contained"
          size="large"
          startIcon={isExporting ? <CircularProgress size={20} /> : <Download />}
          onClick={handleExport}
          disabled={isExporting}
          sx={{ borderRadius: 2 }}
        >
          Ladda ner bild
        </Button>
      </DialogActions>
    </Dialog>
  );
}
