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
} from '@mui/material';
import { Close, Download, Share, EmojiEvents, SportsTennis, ChevronLeft, ChevronRight, Star, TrendingUp, LocalFireDepartment, Groups } from '@mui/icons-material';
import { toPng } from 'html-to-image';
import { Match, Tournament, TournamentResult } from '../../types';
import { MatchHighlight } from '../../utils/highlights';
import { Grid } from '@mui/material';

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

const TournamentTemplate = ({ tournament, results, profileMap, variant = 0 }: { tournament: Tournament; results: any[]; profileMap: Record<string, string>; variant?: number }) => {
  const topCount = variant === 1 ? 5 : 3;
  const topPlayers = results.slice(0, topCount);
  const winner = topPlayers[0];
  const winnerId = winner?.profile_id || winner?.id || '';

  const themes = [
    { bg: 'linear-gradient(180deg, #ff8f00 0%, #ff6f00 100%)', color: 'white', accent: '#ffca28' }, // Classic Gold
    { bg: '#1a1a1a', color: 'white', accent: '#4caf50' }, // Dark Stats
    { bg: 'linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)', color: 'white', accent: '#00d2ff' }, // Modern Blue
    { bg: '#f5f5f5', color: '#333', accent: '#d32f2f' }, // Newspaper Clean
    { bg: 'linear-gradient(45deg, #12c2e9, #c471ed, #f64f59)', color: 'white', accent: '#fff' }, // Vibrant
  ];

  const theme = themes[variant % themes.length];

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        background: theme.bg,
        color: theme.color,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 6,
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {variant === 0 && (
        <>
          <Box sx={{ position: 'absolute', top: -100, left: -100, width: 500, height: 500, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
          <Box sx={{ position: 'absolute', bottom: -100, right: -100, width: 400, height: 400, borderRadius: '50%', background: 'rgba(0,0,0,0.05)' }} />
        </>
      )}

      <Stack spacing={variant === 1 ? 2 : 4} alignItems="center" sx={{ width: '100%', zIndex: 1 }}>
        <EmojiEvents sx={{ fontSize: variant === 1 ? 80 : 120, color: theme.accent, filter: 'drop-shadow(0 0 20px rgba(0,0,0,0.2))' }} />

        <Box>
          <Typography variant="h2" sx={{ fontWeight: 900, textTransform: 'uppercase', mb: 1, textShadow: variant === 3 ? 'none' : '0 4px 8px rgba(0,0,0,0.2)' }}>
            Mästare
          </Typography>
          <Typography variant="h4" sx={{ opacity: 0.9, fontWeight: 700 }}>
            {tournament.name}
          </Typography>
        </Box>

        <Box sx={{
          bgcolor: variant === 3 ? 'transparent' : 'white',
          color: variant === 3 ? theme.color : (variant === 0 ? '#ff6f00' : '#1a237e'),
          p: 4,
          borderRadius: 4,
          width: '85%',
          boxShadow: variant === 3 ? 'none' : '0 20px 40px rgba(0,0,0,0.2)',
          border: variant === 3 ? `4px solid ${theme.accent}` : 'none'
        }}>
          <Typography variant="h1" sx={{ fontWeight: 900, mb: 1 }}>
            {profileMap[winnerId] || 'Okänd spelare'}
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 700, opacity: 0.7, textTransform: 'uppercase' }}>
            {winner.points_for ?? winner.totalPoints} Poäng • {winner.wins} Vinster
          </Typography>
        </Box>

        {topPlayers.length > 1 && (
           <Box sx={{ width: '100%', mt: 2 }}>
             <Typography variant="h5" sx={{ fontWeight: 800, mb: 2, opacity: 0.6, textTransform: 'uppercase' }}>
               {variant === 1 ? 'Fullständig Tabell' : 'Topplista'}
             </Typography>
             {variant === 1 ? (
               <Stack spacing={1} sx={{ width: '80%', mx: 'auto' }}>
                 {results.slice(0, 8).map((res, i) => (
                    <Box key={res.profile_id || res.id} sx={{ display: 'flex', justifyContent: 'space-between', p: 2, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
                      <Typography variant="h5" sx={{ fontWeight: 800 }}>{i + 1}. {profileMap[res.profile_id || res.id] || 'Okänd'}</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 800, color: theme.accent }}>{res.points_for ?? res.totalPoints}p</Typography>
                    </Box>
                 ))}
               </Stack>
             ) : (
               <Stack direction="row" spacing={4} justifyContent="center">
                 {topPlayers.map((res, i) => {
                    const pid = res.profile_id || res.id || '';
                    if (i === 0) return null; // Skip winner if already shown big
                    return (
                      <Box key={pid} sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" sx={{ fontWeight: 800, color: theme.accent }}>{i + 1}:a</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700 }}>{profileMap[pid] || 'Okänd'}</Typography>
                        <Typography variant="body1" sx={{ opacity: 0.7 }}>{res.points_for ?? res.totalPoints}p</Typography>
                      </Box>
                    );
                 })}
               </Stack>
             )}
           </Box>
        )}

        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.2em' }}>
            {new Date(tournament.completed_at || '').toLocaleDateString('sv-SE', { year: 'numeric', month: 'long', day: 'numeric' })}
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
};

const MatchTemplate = ({ match, highlight, variant = 0, deltas = {} }: { match: Match; highlight: MatchHighlight; variant?: number; deltas?: Record<string, number> }) => {
  const team1Names = Array.isArray(match.team1) ? match.team1 : [match.team1];
  const team2Names = Array.isArray(match.team2) ? match.team2 : [match.team2];

  const themes = [
    { bg: 'linear-gradient(180deg, #1a237e 0%, #0d47a1 100%)', color: 'white', accent: '#ffca28' }, // Classic Blue
    { bg: '#0f172a', color: 'white', accent: '#38ef7d' }, // Dark Stats
    { bg: '#f80759', color: 'white', accent: '#fff' }, // Bold Pink
    { bg: 'white', color: '#1a237e', accent: '#1a237e', border: '20px solid #1a237e' }, // Modern Minimal
    { bg: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', color: 'white', accent: '#fff' }, // Emerald
  ];

  const theme = themes[variant % themes.length];

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        background: theme.bg,
        color: theme.color,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 6,
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
        border: theme.border || 'none',
      }}
    >
      {variant === 0 && (
        <>
          <Box sx={{ position: 'absolute', top: -100, right: -100, width: 400, height: 400, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
          <Box sx={{ position: 'absolute', bottom: -50, left: -50, width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
        </>
      )}

      <Stack spacing={6} alignItems="center" sx={{ width: '100%', zIndex: 1 }}>
        {variant !== 3 && <GSLogo />}

        <Box>
          <Typography variant={variant === 2 ? "h1" : "h2"} sx={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1, color: theme.accent }}>
            {highlight.title}
          </Typography>
          <Typography variant="h5" sx={{ opacity: 0.8, fontWeight: 500 }}>
            {new Date(match.created_at).toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Typography>
        </Box>

        <Stack direction={variant === 3 ? "column" : "row"} spacing={4} alignItems="center" justifyContent="center" sx={{ width: '100%' }}>
          <Box sx={{ flex: 1, textAlign: variant === 3 ? 'center' : 'right' }}>
            {team1Names.map((name, i) => (
              <Box key={i}>
                <Typography variant="h3" sx={{ fontWeight: 800 }}>{name}</Typography>
                {variant === 1 && deltas[match.team1_ids[i] || ''] !== undefined && (
                  <Typography variant="h5" sx={{ color: theme.accent, fontWeight: 700 }}>
                    {deltas[match.team1_ids[i] || ''] >= 0 ? '+' : ''}{Math.round(deltas[match.team1_ids[i] || ''])} ELO
                  </Typography>
                )}
              </Box>
            ))}
          </Box>

          <Box sx={{
            bgcolor: variant === 3 ? 'transparent' : 'white',
            color: variant === 3 ? theme.color : '#0d47a1',
            p: 2,
            borderRadius: 2,
            minWidth: 180,
            border: variant === 3 ? `8px solid ${theme.accent}` : 'none'
          }}>
            <Typography variant="h1" sx={{ fontWeight: 900, lineHeight: 1 }}>
              {match.team1_sets} – {match.team2_sets}
            </Typography>
          </Box>

          <Box sx={{ flex: 1, textAlign: variant === 3 ? 'center' : 'left' }}>
            {team2Names.map((name, i) => (
              <Box key={i}>
                <Typography variant="h3" sx={{ fontWeight: 800 }}>{name}</Typography>
                {variant === 1 && deltas[match.team2_ids[i] || ''] !== undefined && (
                  <Typography variant="h5" sx={{ color: theme.accent, fontWeight: 700 }}>
                    {deltas[match.team2_ids[i] || ''] >= 0 ? '+' : ''}{Math.round(deltas[match.team2_ids[i] || ''])} ELO
                  </Typography>
                )}
              </Box>
            ))}
          </Box>
        </Stack>

        <Typography variant="h4" sx={{ maxWidth: '85%', fontStyle: 'italic', opacity: 0.9, fontWeight: 500 }}>
          "{highlight.description}"
        </Typography>

        {variant === 0 && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.2em' }}>
              Padel, Prestige & Ära
            </Typography>
          </Box>
        )}
      </Stack>
    </Box>
  );
};

const RecapMatchTemplate = ({ data, variant = 0 }: { data: any; variant?: number }) => {
  const themes = [
    { bg: 'linear-gradient(135deg, #4b6cb7 0%, #182848 100%)', color: 'white', accent: '#00d2ff' },
    { bg: '#fdfdfd', color: '#1a1a1a', accent: '#d32f2f' },
    { bg: 'linear-gradient(135deg, #00b09b 0%, #96c93d 100%)', color: 'white', accent: '#fff' },
    { bg: '#1a237e', color: 'white', accent: '#ffca28' },
    { bg: 'linear-gradient(135deg, #f80759 0%, #bc4e9c 100%)', color: 'white', accent: '#fff' },
  ];

  const theme = themes[variant % themes.length];

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        background: theme.bg,
        color: theme.color,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 6,
        textAlign: 'center',
        position: 'relative',
      }}
    >
      <Stack spacing={variant === 1 ? 4 : 6} alignItems="center" sx={{ width: '100%' }}>
        {variant === 0 && <GSLogo />}
        <Box>
          <Typography variant="h2" sx={{ fontWeight: 900, textTransform: 'uppercase', mb: 1, color: theme.accent }}>
            Match-recap
          </Typography>
          <Typography variant="h1" sx={{ fontWeight: 900, mb: 1, fontSize: 120 }}>
            {data.scoreline}
          </Typography>
        </Box>

        <Grid container spacing={4} sx={{ width: '100%' }}>
          <Grid size={{ xs: 6 }}>
            <Typography variant="h4" sx={{ fontWeight: 800, opacity: 0.7, mb: 2, textTransform: 'uppercase' }}>Lag A</Typography>
            {data.teamA.players.map((p: any) => (
              <Box key={p.id} sx={{ mb: 2 }}>
                <Typography variant="h3" sx={{ fontWeight: 700 }}>{p.name}</Typography>
                <Typography variant="h5" sx={{ opacity: 0.8 }}>{p.elo} ELO ({p.delta >= 0 ? '+' : ''}{p.delta})</Typography>
              </Box>
            ))}
          </Grid>
          <Grid size={{ xs: 6 }}>
            <Typography variant="h4" sx={{ fontWeight: 800, opacity: 0.7, mb: 2, textTransform: 'uppercase' }}>Lag B</Typography>
            {data.teamB.players.map((p: any) => (
              <Box key={p.id} sx={{ mb: 2 }}>
                <Typography variant="h3" sx={{ fontWeight: 700 }}>{p.name}</Typography>
                <Typography variant="h5" sx={{ opacity: 0.8 }}>{p.elo} ELO ({p.delta >= 0 ? '+' : ''}{p.delta})</Typography>
              </Box>
            ))}
          </Grid>
        </Grid>

        <Box sx={{
          bgcolor: variant === 1 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)',
          p: 3,
          borderRadius: 4,
          width: '100%',
          border: variant === 1 ? '2px solid #ddd' : 'none'
        }}>
           <Typography variant="h4" sx={{ fontWeight: 700 }}>
             Fairness: {data.fairness}% • Vinstchans A: {Math.round(data.winProbability * 100)}%
           </Typography>
        </Box>
      </Stack>
    </Box>
  );
};

const RecapEveningTemplate = ({ data, variant = 0 }: { data: any; variant?: number }) => {
  const themes = [
    { bg: 'linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)', color: 'white', accent: '#00d2ff' },
    { bg: '#1a1a1a', color: 'white', accent: '#4caf50' },
    { bg: 'white', color: '#1a237e', accent: '#d32f2f' },
    { bg: 'linear-gradient(135deg, #373b44 0%, #4286f4 100%)', color: 'white', accent: '#fff' },
    { bg: '#d32f2f', color: 'white', accent: '#ffca28' },
  ];

  const theme = themes[variant % themes.length];

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        background: theme.bg,
        color: theme.color,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 6,
        textAlign: 'center',
        position: 'relative',
      }}
    >
      <Stack spacing={6} alignItems="center" sx={{ width: '100%', zIndex: 1 }}>
        {variant !== 2 && <GSLogo />}
        <Box>
          <Typography variant="h2" sx={{ fontWeight: 900, textTransform: 'uppercase', mb: 1, color: theme.accent }}>
            Kvällsrecap
          </Typography>
          <Typography variant="h4" sx={{ opacity: 0.9, fontWeight: 700 }}>{data.dateLabel}</Typography>
        </Box>

        <Stack direction="row" spacing={8}>
          <Box>
            <Typography variant="h1" sx={{ fontWeight: 900 }}>{data.matches}</Typography>
            <Typography variant="h5" sx={{ opacity: 0.7, fontWeight: 800 }}>MATCHER</Typography>
          </Box>
          <Box>
            <Typography variant="h1" sx={{ fontWeight: 900 }}>{data.totalSets}</Typography>
            <Typography variant="h5" sx={{ opacity: 0.7, fontWeight: 800 }}>SETS</Typography>
          </Box>
        </Stack>

        <Box sx={{
          bgcolor: variant === 2 ? 'transparent' : 'white',
          color: variant === 2 ? theme.color : '#1a237e',
          p: 6,
          borderRadius: 4,
          width: '85%',
          boxShadow: variant === 2 ? 'none' : '0 20px 40px rgba(0,0,0,0.2)',
          border: variant === 2 ? `8px solid ${theme.accent}` : 'none'
        }}>
          <Typography variant="h4" sx={{ fontWeight: 800, opacity: 0.6, mb: 1, textTransform: 'uppercase' }}>Kvällens MVP</Typography>
          <Typography variant="h1" sx={{ fontWeight: 900 }}>
            {data.mvp?.name || '—'}
          </Typography>
        </Box>

        <Box sx={{ width: '100%' }}>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 3, opacity: 0.6, textTransform: 'uppercase' }}>Topplista vinster</Typography>
          <Stack direction="row" spacing={4} justifyContent="center">
             {data.leaders.slice(0, 3).map((p: any, i: number) => (
               <Box key={p.id || i} sx={{ minWidth: 150 }}>
                 <Typography variant="h3" sx={{ fontWeight: 900, color: theme.accent }}>{p.wins} V</Typography>
                 <Typography variant="h5" sx={{ fontWeight: 700 }}>{p.name}</Typography>
               </Box>
             ))}
          </Stack>
        </Box>
      </Stack>
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
      const dataUrl = await toPng(templateRef.current, {
        quality: 1.0,
        pixelRatio: 2, // Higher resolution for sharing
      });
      const link = document.createElement('a');
      link.download = `padel-${type}-${new Date().getTime()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export image', err);
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
        <IconButton onClick={onClose} size="small">
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
          <IconButton onClick={() => setVariant(prev => Math.max(0, prev - 1))} disabled={variant === 0}>
            <ChevronLeft />
          </IconButton>
          <Typography variant="body2" sx={{ alignSelf: 'center', fontWeight: 700 }}>
            Mall {variant + 1} / 5
          </Typography>
          <IconButton onClick={() => setVariant(prev => Math.min(4, prev + 1))} disabled={variant === 4}>
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
