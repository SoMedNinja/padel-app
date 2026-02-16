import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { AddBox as EmptyIcon } from '@mui/icons-material';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

/**
 * A reusable empty state component for lists and dashboards.
 */
export default function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon
}: EmptyStateProps) {
  return (
    <Box
      sx={{
        p: { xs: 4, sm: 8 },
        textAlign: 'center',
        bgcolor: 'background.paper',
        borderRadius: 4,
        border: '2px dashed',
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 300
      }}
    >
      <Box sx={{ mb: 2, color: 'text.disabled', opacity: 0.5 }}>
        {icon || <EmptyIcon sx={{ fontSize: 64 }} />}
      </Box>
      <Typography variant="h6" fontWeight={800} gutterBottom>
        {title}
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mb: 4, maxWidth: 300, mx: 'auto', lineHeight: 1.6 }}
      >
        {description}
      </Typography>
      {actionLabel && onAction && (
        <Button
          variant="contained"
          onClick={onAction}
          sx={{
            px: 4,
            py: 1.5,
            borderRadius: 3,
            fontWeight: 700,
            boxShadow: '0 4px 14px rgba(211, 47, 47, 0.25)'
          }}
        >
          {actionLabel}
        </Button>
      )}
    </Box>
  );
}
