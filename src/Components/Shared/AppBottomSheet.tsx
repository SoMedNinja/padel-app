import React from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Divider,
  useTheme,
  useMediaQuery,
  Dialog,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

interface AppBottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
}

/**
 * A responsive component that shows a Bottom Sheet on mobile and a Dialog on desktop.
 * Mimics native iOS drawer behavior with a handle and blurred background.
 */
export default function AppBottomSheet({
  open,
  onClose,
  title,
  children,
  showCloseButton = true
}: AppBottomSheetProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (!isMobile) {
    return (
      <Dialog
        open={open}
        onClose={onClose}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: { borderRadius: 4, p: 1 }
        }}
      >
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {title && (
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {title}
            </Typography>
          )}
          {showCloseButton && (
            <IconButton
              onClick={onClose}
              size="small"
              edge="end"
              aria-label="Stäng"
            >
              <CloseIcon />
            </IconButton>
          )}
        </Box>
        <Box sx={{ p: 2, pt: 0 }}>
          {children}
        </Box>
      </Dialog>
    );
  }

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          maxHeight: '90vh',
          bgcolor: 'background.paper',
          backgroundImage: 'none',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.1)',
        }
      }}
    >
      {/* iOS Handle */}
      <Box
        sx={{
          width: 36,
          height: 5,
          bgcolor: 'divider',
          borderRadius: 2.5,
          mx: 'auto',
          mt: 1.5,
          mb: 1,
        }}
      />

      {(title || showCloseButton) && (
        <Box sx={{ px: 3, pb: 1, pt: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {title && (
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {title}
            </Typography>
          )}
          {showCloseButton && (
            <IconButton
              onClick={onClose}
              size="small"
              edge="end"
              aria-label="Stäng"
            >
              <CloseIcon />
            </IconButton>
          )}
        </Box>
      )}

      {title && <Divider sx={{ opacity: 0.6 }} />}

      <Box sx={{ p: 3, overflowY: 'auto' }}>
        {children}
      </Box>
    </Drawer>
  );
}
