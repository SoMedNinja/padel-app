import React, { useEffect, useState } from 'react';
import { Box, Typography, Stack, Button } from '@mui/material';
import { getCurrentWebAppVersion } from '../../services/appVersionService';
import WhatsNewDialog from '../WhatsNewDialog';

export default function AppInfo() {
  const [version, setVersion] = useState<string>('');
  const [showWhatsNew, setShowWhatsNew] = useState(false);

  useEffect(() => {
    setVersion(getCurrentWebAppVersion());
  }, []);

  return (
    <Stack spacing={2}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="body1">Version</Typography>
        <Typography variant="body1" color="text.secondary">
          {version}
        </Typography>
      </Box>
      <Button
        variant="outlined"
        size="small"
        onClick={() => setShowWhatsNew(true)}
        sx={{ alignSelf: 'flex-start' }}
      >
        Läs om nyheter
      </Button>

      {showWhatsNew && (
        <WhatsNewDialog
          forceOpen={true}
          onClose={() => setShowWhatsNew(false)}
        />
      )}
    </Stack>
  );
}
