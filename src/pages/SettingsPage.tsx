import React, { useMemo } from 'react';
import { Container, Typography, Button, Box, Stack } from '@mui/material';
import { Logout as LogoutIcon, Login as LoginIcon } from '@mui/icons-material';
import { useStore } from '../store/useStore';
import { supabase } from '../supabaseClient';
import { useQueryClient } from '@tanstack/react-query';
import { useProfiles } from '../hooks/useProfiles';
import { queryKeys } from '../utils/queryKeys';
import { requestOpenPermissionGuide } from '../services/permissionGuidanceService';
import SettingsSection from '../Components/Settings/SettingsSection';
import ProfileSettings from '../Components/Settings/ProfileSettings';
import AppInfo from '../Components/Settings/AppInfo';
import WebPermissionsPanel from '../Components/Permissions/WebPermissionsPanel';

export default function SettingsPage() {
  const { user, setUser, isGuest, setIsGuest } = useStore();
  const queryClient = useQueryClient();

  // Get current profile
  const { data: profiles = [] } = useProfiles();
  const profile = useMemo(
    () => profiles.find(p => p.id === user?.id),
    [profiles, user]
  );

  const handleSignOut = async () => {
    if (window.confirm("Vill du logga ut?")) {
      await supabase.auth.signOut();
      setIsGuest(false);
      setUser(null);
    }
  };

  const handleGuestLogin = () => {
    setIsGuest(false);
  };

  const handleProfileUpdate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.profiles() });
  };

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 800 }}>
        Inställningar
      </Typography>

      {isGuest ? (
        <SettingsSection title="Gästläge">
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Du är i gästläge. Logga in för att spara matcher och hantera din profil.
          </Typography>
          <Button
            variant="contained"
            startIcon={<LoginIcon />}
            onClick={handleGuestLogin}
            fullWidth
          >
            Gå till inloggning
          </Button>
        </SettingsSection>
      ) : (
        <>
          {/* Profil */}
          <SettingsSection title="Profil">
            <ProfileSettings
              user={user}
              profile={profile}
              onProfileUpdate={handleProfileUpdate}
            />
          </SettingsSection>

          {/* Konto */}
          <SettingsSection title="Konto">
            <Stack spacing={2}>
               {user?.email && (
                 <Typography variant="body2" color="text.secondary">
                   Inloggad som: {user.email}
                 </Typography>
               )}
               <Button
                 size="small"
                 variant="outlined"
                 onClick={() => requestOpenPermissionGuide("settings")}
                 sx={{ alignSelf: 'flex-start' }}
               >
                 Steg-för-steg: behörighetshjälp
               </Button>
               {/* Embed WebPermissionsPanel for Notifications/Permissions */}
               <WebPermissionsPanel onNotificationPermissionChanged={async () => {}} />
            </Stack>
          </SettingsSection>

          {/* Hantering */}
          <SettingsSection title="Hantering">
            <Button
              variant="outlined"
              color="error"
              startIcon={<LogoutIcon />}
              onClick={handleSignOut}
              fullWidth
            >
              Logga ut
            </Button>
          </SettingsSection>
        </>
      )}

      {/* App Info */}
      <SettingsSection title="App Information">
        <AppInfo />
      </SettingsSection>
    </Container>
  );
}
