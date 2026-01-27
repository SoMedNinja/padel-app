import React from "react";
import AdminPanel from "../Components/AdminPanel";
import { useStore } from "../store/useStore";
import { useProfiles } from "../hooks/useProfiles";
import { useQueryClient } from "@tanstack/react-query";
import { Profile } from "../types";
import { queryKeys } from "../utils/queryKeys";
import { Alert, Box, Button, Container, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

export default function AdminPage() {
  const { user } = useStore();
  const { data: profiles = [] as Profile[] } = useProfiles();
  const queryClient = useQueryClient();

  const handleProfileUpdate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.profiles() });
  };

  const handleProfileDelete = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.profiles() });
  };

  if (!user?.is_admin) {
    // Note for non-coders: this message guides non-admins to request access instead of a hard error.
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Alert severity="warning">
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
            Administratörsåtkomst krävs
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            För att få åtkomst, be en administratör att aktivera adminrollen för ditt konto.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              component={RouterLink}
              to="/grabbarnas-serie"
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
        </Alert>
      </Container>
    );
  }

  return (
    <section id="admin" className="page-section">
      <AdminPanel
        user={user}
        profiles={profiles}
        onProfileUpdate={handleProfileUpdate}
        onProfileDelete={handleProfileDelete}
      />
    </section>
  );
}
