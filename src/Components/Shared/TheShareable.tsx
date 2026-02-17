import React, { useRef, useState } from 'react';
import {
  Button,
  Box,
  Typography,
  IconButton,
  Stack,
  CircularProgress,
} from '@mui/material';
import { Download, ChevronLeft, ChevronRight } from '@mui/icons-material';
import { toBlob, toPng } from 'html-to-image';
import { Match, Tournament, TournamentResult } from '../../types';
import { MatchHighlight } from '../../utils/highlights';
import { toast } from 'sonner';
import AppBottomSheet from './AppBottomSheet';
import { MatchTemplate } from './ShareableTemplates/MatchTemplate';
import { TournamentTemplate } from './ShareableTemplates/TournamentTemplate';
import { RecapMatchTemplate } from './ShareableTemplates/RecapMatchTemplate';
import { RecapEveningTemplate } from './ShareableTemplates/RecapEveningTemplate';

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

  const createShareImage = async () => {
    if (!templateRef.current) {
      throw new Error('Shareable template missing');
    }
    // Note for non-coders: waiting a moment ensures fonts are loaded before we capture the image.
    await document.fonts?.ready;
    await new Promise(requestAnimationFrame);
    // Note for non-coders: newer phones have denser screens, so we export more pixels for sharper sharing.
    const devicePixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    // Note for non-coders: we treat smaller screens as "mobile" and boost quality to avoid blurry exports.
    const isMobileScreen = typeof window !== 'undefined' ? window.innerWidth <= 600 : false;
    const exportPixelRatio = Math.min(3, Math.max(isMobileScreen ? 3 : 2, devicePixelRatio));
    const exportOptions = {
      quality: 1.0,
      pixelRatio: exportPixelRatio, // Higher resolution for sharing, especially on mobile
      cacheBust: true,
    };
    const timestamp = new Date().getTime();
    const fileName = `padel-${type}-${timestamp}.png`;
    // Note for non-coders: blobs keep the file as an actual image so phones can "View" or "Save" it properly.
    let blob = await toBlob(templateRef.current, exportOptions);
    if (!blob) {
      const dataUrl = await toPng(templateRef.current, exportOptions);
      const response = await fetch(dataUrl);
      blob = await response.blob();
    }
    return {
      blob,
      url: URL.createObjectURL(blob),
      fileName,
    };
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const { url, fileName } = await createShareImage();
      // Note for non-coders: we create a temporary download link so the browser saves the image to your device.
      const link = document.createElement('a');
      link.download = fileName;
      link.href = url;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error('Failed to export image', err);
      toast.error('Kunde inte skapa bilden. Försök igen.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <AppBottomSheet open={open} onClose={onClose} title="Delningsbild">
      <Box sx={{ p: { xs: 1, sm: 3 }, bgcolor: 'grey.100', overflow: 'hidden', borderRadius: 2, mb: 3 }}>
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
          {/* Note for non-coders: we only scale the preview wrapper so the exported element stays full-size and crisp. */}
          <Box
            sx={{
              width: 1080,
              height: 1080,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'stretch',
              justifyContent: 'center',
              transform: {
                xs: 'scale(0.24)',
                sm: 'scale(0.32)',
                md: 'scale(0.42)'
              },
              transformOrigin: 'center center',
            }}
          >
            <Box
              ref={templateRef}
              sx={{
                width: '100%',
                height: '100%',
                bgcolor: 'background.paper',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                boxSizing: 'border-box',
                // Note for non-coders: forcing border-box keeps borders inside the 1080×1080 export so layouts don't shift.
                '& *, & *::before, & *::after': {
                  boxSizing: 'border-box',
                },
                // Note for non-coders: exporting SVG icons is more stable when they render as block elements.
                '& svg': {
                  display: 'block',
                },
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
        </Box>
      </Box>

      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
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
      </Box>
    </AppBottomSheet>
  );
}
