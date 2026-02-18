import React, { useEffect, useState } from 'react';
import { Box, Typography, Stack } from '@mui/material';
import { getCurrentWebAppVersion } from '../../services/appVersionService';

export default function AppInfo() {
  const [version, setVersion] = useState<string>('');

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
    </Stack>
  );
}
