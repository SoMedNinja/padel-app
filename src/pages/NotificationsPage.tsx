import React from "react";
import { Box, Typography, Button, Container } from "@mui/material";
import WebPermissionsPanel from "../Components/Permissions/WebPermissionsPanel";
import { requestOpenPermissionGuide } from "../services/permissionGuidanceService";

export default function NotificationsPage() {
  const NOTIFICATION_SETTINGS_LABEL = "Notifieringsinställningar";

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box id="notifications" component="section" sx={{ p: 2, bgcolor: "background.paper", borderRadius: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>{NOTIFICATION_SETTINGS_LABEL}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {/* Note for non-coders: this is where users decide which alerts they want to receive on web and in the service worker push channel. */}
          Slå av/på notiser per händelsetyp. Tysta timmar pausar leverans mellan vald start- och sluttid.
        </Typography>

        <Button size="small" sx={{ mb: 2 }} onClick={() => requestOpenPermissionGuide("settings")}>
          Steg-för-steg: behörighetshjälp
        </Button>

        <WebPermissionsPanel onNotificationPermissionChanged={async () => {
          // No-op: panel handles sync internally
        }} />
      </Box>
    </Container>
  );
}
