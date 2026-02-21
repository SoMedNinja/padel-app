import React from "react";
import AdminPanel from "../Components/AdminPanel";
import { useStore } from "../store/useStore";
import { useProfiles } from "../hooks/useProfiles";
import { useQueryClient } from "@tanstack/react-query";
import { Profile } from "../types";
import { Box, Button, Typography } from "@mui/material";
import { Link as RouterLink, useLocation } from "react-router-dom";
import AppAlert from "../Components/Shared/AppAlert";
import { invalidateProfileData } from "../data/queryInvalidation";
import PageShell from "../Components/Shared/PageShell";

export default function AdminPage() {
  const { user } = useStore();
  const { data: profiles = [] as Profile[] } = useProfiles();
  const queryClient = useQueryClient();
  const location = useLocation();
  // Note for non-coders: "/admin/email" should open the Email tools directly.
  const initialTab = location.pathname.endsWith("/email") ? 2 : 0;

  const handleProfileUpdate = () => {
    invalidateProfileData(queryClient);
  };

  const handleProfileDelete = () => {
    invalidateProfileData(queryClient);
  };

  if (!user?.is_admin) {
    // Note for non-coders: this message guides non-admins to request access instead of a hard error.
    return (
      <PageShell maxWidth="sm" sectionId="admin-access-required">
        <AppAlert severity="warning" title="Administratörsåtkomst krävs">
          <Typography variant="body2" sx={{ mb: 2 }}>
            För att få åtkomst, be en administratör att aktivera adminrollen för ditt konto.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              component={RouterLink}
              to="/dashboard"
              variant="contained"
              size="small"
            >
              Tillbaka till dashboard
            </Button>
            <Button
              component="a"
              href="mailto:admin@padel.app"
              variant="outlined"
              size="small"
            >
              Kontakta admin
            </Button>
          </Box>
        </AppAlert>
      </PageShell>
    );
  }

  return (
    <PageShell sectionId="admin">
        <AdminPanel
          user={user}
          profiles={profiles}
          initialTab={initialTab}
          onProfileUpdate={handleProfileUpdate}
          onProfileDelete={handleProfileDelete}
        />
    </PageShell>
  );
}
