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
import { Close, Download, Share, EmojiEvents, SportsTennis } from '@mui/icons-material';
import { toPng } from 'html-to-image';
import { Match, Tournament, TournamentResult } from '../../types';
import { MatchHighlight } from '../../utils/highlights';

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

const TournamentTemplate = ({ tournament, results, profileMap }: { tournament: Tournament; results: TournamentResult[]; profileMap: Record<string, string> }) => {
  const top3 = results.slice(0, 3);
  const winner = top3[0];

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        background: 'linear-gradient(180deg, #ff8f00 0%, #ff6f00 100%)',
        color: 'white',
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
      {/* Background Decor */}
      <Box sx={{ position: 'absolute', top: -100, left: -100, width: 500, height: 500, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
      <Box sx={{ position: 'absolute', bottom: -100, right: -100, width: 400, height: 400, borderRadius: '50%', background: 'rgba(0,0,0,0.05)' }} />

      <Stack spacing={4} alignItems="center" sx={{ width: '100%', zIndex: 1 }}>
        <EmojiEvents sx={{ fontSize: 120, color: '#ffca28', filter: 'drop-shadow(0 0 20px rgba(0,0,0,0.2))' }} />

        <Box>
          <Typography variant="h2" sx={{ fontWeight: 900, textTransform: 'uppercase', mb: 1, textShadow: '0 4px 8px rgba(0,0,0,0.2)' }}>
            Mästare
          </Typography>
          <Typography variant="h4" sx={{ opacity: 0.9, fontWeight: 700 }}>
            {tournament.name}
          </Typography>
        </Box>

        <Box sx={{ bgcolor: 'white', color: '#ff6f00', p: 4, borderRadius: 4, width: '80%', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
          <Typography variant="h2" sx={{ fontWeight: 900, mb: 1 }}>
            {profileMap[winner.profile_id || ''] || 'Okänd spelare'}
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 700, opacity: 0.7, textTransform: 'uppercase' }}>
            {winner.points_for} Poäng • {winner.wins} Vinster
          </Typography>
        </Box>

        {top3.length > 1 && (
           <Stack direction="row" spacing={6} sx={{ mt: 2 }}>
             {top3.slice(1).map((res, i) => (
               <Box key={res.profile_id}>
                 <Typography variant="h5" sx={{ fontWeight: 800 }}>{i + 2}:a</Typography>
                 <Typography variant="h6" sx={{ opacity: 0.9 }}>{profileMap[res.profile_id || '']}</Typography>
               </Box>
             ))}
           </Stack>
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

const MatchTemplate = ({ match, highlight }: { match: Match; highlight: MatchHighlight }) => {
  const team1Names = Array.isArray(match.team1) ? match.team1 : [match.team1];
  const team2Names = Array.isArray(match.team2) ? match.team2 : [match.team2];

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        background: 'linear-gradient(180deg, #1a237e 0%, #0d47a1 100%)',
        color: 'white',
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
      {/* Background Decor */}
      <Box sx={{ position: 'absolute', top: -100, right: -100, width: 400, height: 400, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
      <Box sx={{ position: 'absolute', bottom: -50, left: -50, width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />

      <Stack spacing={4} alignItems="center" sx={{ width: '100%', zIndex: 1 }}>
        <GSLogo />

        <Box>
          <Typography variant="h3" sx={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', mb: 1, color: '#ffca28' }}>
            {highlight.title}
          </Typography>
          <Typography variant="h5" sx={{ opacity: 0.8, fontWeight: 500 }}>
            {new Date(match.created_at).toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Typography>
        </Box>

        <Stack direction="row" spacing={4} alignItems="center" justifyContent="center" sx={{ width: '100%' }}>
          <Box sx={{ flex: 1, textAlign: 'right' }}>
            {team1Names.map((name, i) => (
              <Typography key={i} variant="h4" sx={{ fontWeight: 800 }}>{name}</Typography>
            ))}
          </Box>

          <Box sx={{ bgcolor: 'white', color: '#0d47a1', p: 2, borderRadius: 2, minWidth: 140 }}>
            <Typography variant="h2" sx={{ fontWeight: 900, lineHeight: 1 }}>
              {match.team1_sets} – {match.team2_sets}
            </Typography>
          </Box>

          <Box sx={{ flex: 1, textAlign: 'left' }}>
            {team2Names.map((name, i) => (
              <Typography key={i} variant="h4" sx={{ fontWeight: 800 }}>{name}</Typography>
            ))}
          </Box>
        </Stack>

        <Typography variant="h5" sx={{ maxWidth: '80%', fontStyle: 'italic', opacity: 0.9 }}>
          "{highlight.description}"
        </Typography>

        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.2em' }}>
            Padel, Prestige & Ära
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
};

interface TheShareableProps {
  open: boolean;
  onClose: () => void;
  type: 'match' | 'tournament';
  data: {
    match?: Match;
    highlight?: MatchHighlight;
    tournament?: Tournament;
    results?: TournamentResult[];
    profileMap?: Record<string, string>;
  };
}

export default function TheShareable({ open, onClose, type, data }: TheShareableProps) {
  const templateRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

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
                xs: 'scale(0.25)',
                sm: 'scale(0.35)',
                md: 'scale(0.45)'
              },
              transformOrigin: 'center center',
              flexShrink: 0,
            }}
          >
             {type === 'match' && data.match && data.highlight && (
               <MatchTemplate match={data.match} highlight={data.highlight} />
             )}
             {type === 'tournament' && data.tournament && data.results && data.profileMap && (
                <TournamentTemplate
                  tournament={data.tournament}
                  results={data.results}
                  profileMap={data.profileMap}
                />
             )}
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button
          fullWidth
          variant="contained"
          startIcon={isExporting ? <CircularProgress size={20} /> : <Download />}
          onClick={handleExport}
          disabled={isExporting}
        >
          Ladda ner bild
        </Button>
      </DialogActions>
    </Dialog>
  );
}
